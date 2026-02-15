/*
 * quizmaster.c -- Exhaustive search for the maze with the longest
 *                 minimal path (a "busy beaver" search over maze space).
 *
 * Enumerates all mazes with at most max_aport active ports by generating
 * all C(ncand, k) combinations for k = 0, 1, ..., max_aport, where ncand
 * is the number of candidate ports (excluding useless self-loop ports).
 *
 * Pruning:
 *   1. Self-loop elimination: ports Ti->Ti (same terminal) are excluded
 *      from the candidate set since they map a state to itself.
 *   2. Abstract terminal reachability: a tiny directed graph (2*nterm nodes)
 *      checks whether the goal is reachable from the start at the terminal
 *      type level. This subsumes start-exit and goal-entry checks.
 *
 * Progress and new-best discoveries are logged to stderr so that stdout
 * remains clean for the final result output.
 */
#include "quizmaster.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <signal.h>

/* SIGINT handling for graceful Ctrl+C exit in random search */
static volatile sig_atomic_t interrupted = 0;
static void sigint_handler(int sig) { (void)sig; interrupted = 1; }

/*
 * qmresult_free -- release all heap memory stored in a QMResult.
 */
void qmresult_free(QMResult *r) {
    if (!r) return;
    maze_destroy(r->best_maze);
    r->best_maze = NULL;
    free(r->best_path);
    r->best_path = NULL;
}

/*
 * binomial -- compute C(n, k) as uint64_t.
 * Returns 0 if k > n. Uses the multiplicative formula to avoid overflow
 * as much as possible.
 */
static uint64_t binomial(int n, int k) {
    if (k < 0 || k > n) return 0;
    if (k == 0 || k == n) return 1;
    if (k > n - k) k = n - k;
    uint64_t result = 1;
    for (int i = 0; i < k; i++) {
        result = result * (uint64_t)(n - i) / (uint64_t)(i + 1);
    }
    return result;
}

/*
 * is_self_loop_port -- check if a flat port index is a terminal self-loop.
 *
 * A normal-block port at flat index idx has:
 *   src_terminal = idx / (4*nterm)
 *   dst_terminal = idx % (4*nterm)
 * It is a self-loop when src_terminal == dst_terminal (Ti->Ti),
 * which maps a state to itself and can never contribute to a path.
 *
 * nx/ny ports exclude self-loops by construction (si != di), so they
 * are never self-loops.
 */
static int is_self_loop_port(const Maze *m, int idx) {
    if (idx >= m->normal_nports) return 0;
    int n4 = 4 * m->nterm;
    return (idx / n4) == (idx % n4);
}

/*
 * has_abstract_path -- check reachability in the abstract terminal graph.
 *
 * The abstract graph has 2*nterm nodes representing canonical state types:
 *   (E, i) for i=0..nterm-1: indices 0..nterm-1
 *   (N, i) for i=0..nterm-1: indices nterm..2*nterm-1
 *
 * Being at canonical (x,y,E,i) means we can use ports from both E[i]
 * and W[i] terminals (they share the same canonical state type).
 * Similarly (x,y,N,i) can use ports from N[i] and S[i].
 *
 * For each active port src->dst:
 *   abstract_src: E/W terminal with index j -> node j; N/S -> node nterm+j
 *   abstract_dst: same mapping
 *   Add directed edge abstract_src -> abstract_dst
 *
 * Start: node 0 = (E, 0).  Goal: node 1 = (E, 1).
 *
 * BFS from start node using uint64_t bitmasks (no heap allocation).
 * Returns 1 if goal is reachable, 0 otherwise.
 */
static int has_abstract_path(const Maze *m) {
    int n = m->nterm;
    int n4 = 4 * n;
    uint64_t adj[64];
    memset(adj, 0, sizeof(adj));

    /* Normal block ports */
    for (int st = 0; st < n4; st++) {
        int asrc = (st / n < 2) ? (st % n) : n + (st % n);
        for (int dt = 0; dt < n4; dt++) {
            if (st == dt) continue;
            if (!m->normal_ports[st * n4 + dt]) continue;
            int adst = (dt / n < 2) ? (dt % n) : n + (dt % n);
            adj[asrc] |= 1ULL << adst;
        }
    }

    /* nx ports: E[si] -> E[di], abstract node si -> di */
    for (int si = 0; si < n; si++)
        for (int di = 0; di < n; di++)
            if (si != di && maze_nx_port(m, si, di))
                adj[si] |= 1ULL << di;

    /* ny ports: N[si] -> N[di], abstract node (n+si) -> (n+di) */
    for (int si = 0; si < n; si++)
        for (int di = 0; di < n; di++)
            if (si != di && maze_ny_port(m, si, di))
                adj[n + si] |= 1ULL << (n + di);

    /* BFS from node 0 (E, 0) */
    uint64_t reachable = 1ULL << 0;
    uint64_t frontier = reachable;
    while (frontier) {
        uint64_t next = 0;
        uint64_t f = frontier;
        while (f) {
            int bit = __builtin_ctzll(f);
            f &= f - 1;
            next |= adj[bit] & ~reachable;
        }
        reachable |= next;
        frontier = next;
    }

    /* Check if node 1 (E, 1) is reachable */
    return (reachable >> 1) & 1;
}

/*
 * quizmaster_search -- exhaustive combination enumeration with pruning.
 *
 * 1. Build candidate port list (excluding self-loop ports).
 * 2. For each k from 0 to max_aport, enumerate all C(ncand, k)
 *    combinations of candidate port indices.
 * 3. For each combination, set ports, check abstract reachability,
 *    solve if reachable, and track the global best.
 * 4. Stop early if max_len > 0 and best_len >= max_len.
 */
QMResult quizmaster_search(int nterm, int min_aport, int max_aport, int max_len) {
    QMResult result = {NULL, 0, NULL, 0};
    if (nterm < 2) return result;

    Maze *m = maze_create(nterm);
    int total = m->total_nports;

    /* Build candidate list (exclude self-loop ports) */
    int *candidates = malloc(total * sizeof(int));
    int ncand = 0;
    for (int i = 0; i < total; i++) {
        if (!is_self_loop_port(m, i))
            candidates[ncand++] = i;
    }

    fprintf(stderr, "Ports: %d total, %d candidates (excluding %d self-loops)\n",
            total, ncand, total - ncand);

    /* Clamp range to candidate count */
    if (min_aport < 0) min_aport = 0;
    if (max_aport > ncand) max_aport = ncand;

    Maze *best = NULL;
    int best_len = 0;
    uint64_t total_evaluated = 0;
    uint64_t total_solved = 0;
    uint64_t total_pruned = 0;

    int *combo = malloc(ncand * sizeof(int));

    for (int k = min_aport; k <= max_aport; k++) {
        uint64_t ncombs = binomial(ncand, k);
        fprintf(stderr, "k=%d: C(%d,%d) = %llu mazes\n",
                k, ncand, k, (unsigned long long)ncombs);

        /* Initialize combo to {0, 1, ..., k-1} */
        for (int i = 0; i < k; i++)
            combo[i] = i;

        uint64_t combo_count = 0;
        for (;;) {
            /* Set up the maze for this combination */
            maze_clear(m);
            for (int i = 0; i < k; i++)
                maze_set_port(m, candidates[combo[i]], 1);

            /* Pruning: abstract terminal reachability */
            if (has_abstract_path(m)) {
                int len = solve(m, NULL, NULL);
                if (len < 0) len = 0;
                total_solved++;

                if (len > best_len) {
                    best_len = len;
                    if (best) maze_destroy(best);
                    best = maze_clone(m);
                    fprintf(stderr, "[k=%d, combo %llu] new best: length %d\n",
                            k, (unsigned long long)combo_count, best_len);
                    fprintf(stderr, "  ");
                    maze_fprint(stderr, best);
                    if (max_len > 0 && best_len >= max_len) {
                        total_evaluated++;
                        combo_count++;
                        goto search_done;
                    }
                }
            } else {
                total_pruned++;
            }

            total_evaluated++;
            combo_count++;

            /* Progress reporting every 10000 mazes */
            if (combo_count % 10000 == 0) {
                fprintf(stderr, "[k=%d] progress: %llu/%llu (%.1f%%) best=%d solved=%llu pruned=%llu\n",
                        k,
                        (unsigned long long)combo_count,
                        (unsigned long long)ncombs,
                        (double)combo_count / (double)ncombs * 100.0,
                        best_len,
                        (unsigned long long)total_solved,
                        (unsigned long long)total_pruned);
            }

            /* Generate next combination in lexicographic order */
            int i = k - 1;
            while (i >= 0 && combo[i] == ncand - k + i)
                i--;
            if (i < 0) break;
            combo[i]++;
            for (int j = i + 1; j < k; j++)
                combo[j] = combo[j - 1] + 1;
        }
    }

search_done:
    free(combo);
    free(candidates);

    fprintf(stderr, "Search complete: %llu evaluated, %llu solved, %llu pruned, best length = %d\n",
            (unsigned long long)total_evaluated,
            (unsigned long long)total_solved,
            (unsigned long long)total_pruned,
            best_len);

    /* Re-solve the best maze to obtain the full path */
    if (best) {
        State *path = NULL;
        int path_len = 0;
        solve(best, &path, &path_len);
        result.best_maze     = best;
        result.best_length   = best_len;
        result.best_path     = path;
        result.best_path_len = path_len;
    }

    maze_destroy(m);
    return result;
}

/*
 * quizmaster_random_search -- random sampling search with SIGINT handling.
 *
 * Each iteration randomly picks k in [min_aport, max_aport] and selects
 * k random ports from the candidate set. Runs until SIGINT or max_len
 * is reached.
 */
QMResult quizmaster_random_search(int nterm, int min_aport, int max_aport,
                                  int max_len, unsigned int seed) {
    QMResult result = {NULL, 0, NULL, 0};
    if (nterm < 2) return result;

    srand(seed);
    interrupted = 0;

    /* Install SIGINT handler */
    struct sigaction sa, old_sa;
    sa.sa_handler = sigint_handler;
    sa.sa_flags = 0;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGINT, &sa, &old_sa);

    Maze *m = maze_create(nterm);
    int total = m->total_nports;

    /* Build candidate list (exclude self-loop ports) */
    int *candidates = malloc(total * sizeof(int));
    int ncand = 0;
    for (int i = 0; i < total; i++) {
        if (!is_self_loop_port(m, i))
            candidates[ncand++] = i;
    }

    fprintf(stderr, "Random search (seed=%u): %d candidates (excluding %d self-loops)\n",
            seed, ncand, total - ncand);

    /* Clamp range to candidate count */
    if (min_aport < 0) min_aport = 0;
    if (max_aport > ncand) max_aport = ncand;

    int k_range = max_aport - min_aport + 1;

    Maze *best = NULL;
    int best_len = 0;
    uint64_t total_evaluated = 0;
    uint64_t total_solved = 0;
    uint64_t total_pruned = 0;

    /* Index array for Fisher-Yates shuffle */
    int *indices = malloc(ncand * sizeof(int));

    while (!interrupted) {
        /* Pick random k */
        int k = min_aport + rand() % k_range;

        /* Select k random candidates via partial Fisher-Yates */
        for (int i = 0; i < ncand; i++)
            indices[i] = i;
        for (int i = 0; i < k; i++) {
            int j = i + rand() % (ncand - i);
            int tmp = indices[i];
            indices[i] = indices[j];
            indices[j] = tmp;
        }

        /* Set up the maze */
        maze_clear(m);
        for (int i = 0; i < k; i++)
            maze_set_port(m, candidates[indices[i]], 1);

        /* Pruning: abstract terminal reachability */
        if (has_abstract_path(m)) {
            int len = solve(m, NULL, NULL);
            if (len < 0) len = 0;
            total_solved++;

            if (len > best_len) {
                best_len = len;
                if (best) maze_destroy(best);
                best = maze_clone(m);
                fprintf(stderr, "[iter %llu, k=%d] new best: length %d\n",
                        (unsigned long long)total_evaluated, k, best_len);
                fprintf(stderr, "  ");
                maze_fprint(stderr, best);
                if (max_len > 0 && best_len >= max_len)
                    break;
            }
        } else {
            total_pruned++;
        }

        total_evaluated++;

        /* Progress reporting every 10000 iterations */
        if (total_evaluated % 10000 == 0) {
            fprintf(stderr, "[random] iter=%llu best=%d solved=%llu pruned=%llu\n",
                    (unsigned long long)total_evaluated,
                    best_len,
                    (unsigned long long)total_solved,
                    (unsigned long long)total_pruned);
        }
    }

    free(indices);
    free(candidates);

    if (interrupted)
        fprintf(stderr, "\nInterrupted by SIGINT.\n");

    fprintf(stderr, "Random search complete: %llu evaluated, %llu solved, %llu pruned, best length = %d\n",
            (unsigned long long)total_evaluated,
            (unsigned long long)total_solved,
            (unsigned long long)total_pruned,
            best_len);

    /* Re-solve the best maze to obtain the full path */
    if (best) {
        State *path = NULL;
        int path_len = 0;
        solve(best, &path, &path_len);
        result.best_maze     = best;
        result.best_length   = best_len;
        result.best_path     = path;
        result.best_path_len = path_len;
    }

    maze_destroy(m);

    /* Restore previous SIGINT handler */
    sigaction(SIGINT, &old_sa, NULL);

    return result;
}
