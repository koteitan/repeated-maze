/*
 * quizmaster.c -- Exhaustive search for the maze with the longest
 *                 minimal path (a "busy beaver" search over maze space).
 *
 * Enumerates all mazes with at most max_aport active ports by generating
 * all C(total_nports, k) combinations for k = 0, 1, ..., max_aport.
 *
 * For each maze, early pruning skips mazes where the start state has no
 * outgoing port or the goal state has no incoming port.
 *
 * Progress and new-best discoveries are logged to stderr so that stdout
 * remains clean for the final result output.
 */
#include "quizmaster.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

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
 * has_start_exit -- check if the start state (0,1,E,0) has any outgoing port.
 *
 * The start state is at the nx block (0,1). Terminal E[0] can connect to E[di]
 * for di != 0. Also, block (1,1) has terminal W[0], so check all normal ports
 * from W[0].
 */
static int has_start_exit(const Maze *m) {
    int n = m->nterm;
    int n4 = 4 * n;

    /* nx block: E[0] -> E[di] for di != 0 */
    for (int di = 1; di < n; di++) {
        int adj = di < 0 ? di : di - 1;  /* di > 0 always here, so adj = di - 1 */
        if (m->nx_ports[0 * (n - 1) + adj])
            return 1;
    }

    /* normal block (1,1): W[0] -> any terminal */
    int src = TDIR_W * n + 0;
    for (int dst = 0; dst < n4; dst++) {
        if (m->normal_ports[src * n4 + dst])
            return 1;
    }

    return 0;
}

/*
 * has_goal_entry -- check if the goal state (0,1,E,1) has any incoming port.
 *
 * The goal state is at the nx block (0,1). Terminal E[1] can be reached from
 * E[si] for si != 1. Also, block (1,1) has terminal W[1], so check all normal
 * ports going to W[1].
 */
static int has_goal_entry(const Maze *m) {
    int n = m->nterm;
    int n4 = 4 * n;

    /* nx block: E[si] -> E[1] for si != 1 */
    for (int si = 0; si < n; si++) {
        if (si == 1) continue;
        int adj = 1 < si ? 1 : 1 - 1;  /* adjust for edge_idx */
        /* Recalculate properly: edge_idx(n, si, 1) */
        int di = 1;
        adj = di < si ? di : di - 1;
        if (m->nx_ports[si * (n - 1) + adj])
            return 1;
    }

    /* normal block (1,1): any terminal -> W[1] */
    int dst = TDIR_W * n + 1;
    for (int src = 0; src < n4; src++) {
        if (m->normal_ports[src * n4 + dst])
            return 1;
    }

    return 0;
}

/*
 * quizmaster_search -- exhaustive combination enumeration.
 *
 * For each k from 0 to max_aport, enumerate all C(total_nports, k)
 * combinations of port indices. For each combination, set exactly those
 * ports active, apply early pruning, solve, and track the global best.
 */
QMResult quizmaster_search(int nterm, int max_aport) {
    QMResult result = {NULL, 0, NULL, 0};
    if (nterm < 2) return result;

    Maze *m = maze_create(nterm);
    int total = m->total_nports;

    /* Cap max_aport to total ports */
    if (max_aport > total) max_aport = total;

    Maze *best = NULL;
    int best_len = 0;
    uint64_t total_evaluated = 0;

    /* combo[] holds the indices of active ports (in increasing order) */
    int *combo = malloc(total * sizeof(int));

    for (int k = 0; k <= max_aport; k++) {
        uint64_t ncombs = binomial(total, k);
        fprintf(stderr, "k=%d: C(%d,%d) = %llu mazes\n",
                k, total, k, (unsigned long long)ncombs);

        if (k == 0) {
            /* Only one maze: all ports off */
            maze_clear(m);
            /* No ports -> no exit from start, path_length = 0 */
            /* But we still count it */
            total_evaluated++;
            if (0 > best_len) {
                /* Can't happen, but for completeness */
                best_len = 0;
            }
            continue;
        }

        /* Initialize combo to {0, 1, ..., k-1} */
        for (int i = 0; i < k; i++)
            combo[i] = i;

        uint64_t combo_count = 0;
        for (;;) {
            /* Set up the maze for this combination */
            maze_clear(m);
            for (int i = 0; i < k; i++)
                maze_set_port(m, combo[i], 1);

            /* Early pruning */
            int skip = 0;
            if (k >= 2) {
                /* Need at least 2 ports for a path (exit from start + entry to goal) */
                if (!has_start_exit(m) || !has_goal_entry(m))
                    skip = 1;
            } else {
                /* k == 1: impossible to have both start exit and goal entry */
                skip = 1;
            }

            if (!skip) {
                int len = solve(m, NULL, NULL);
                if (len < 0) len = 0;

                if (len > best_len) {
                    best_len = len;
                    if (best) maze_destroy(best);
                    best = maze_clone(m);
                    fprintf(stderr, "[k=%d, combo %llu] new best: length %d\n",
                            k, (unsigned long long)combo_count,
                            best_len);
                    fprintf(stderr, "  ");
                    maze_fprint(stderr, best);
                }
            }

            total_evaluated++;
            combo_count++;

            /* Progress reporting every 10000 mazes */
            if (combo_count % 10000 == 0) {
                fprintf(stderr, "[k=%d] progress: %llu/%llu (%.1f%%) best=%d\n",
                        k,
                        (unsigned long long)combo_count,
                        (unsigned long long)ncombs,
                        (double)combo_count / (double)ncombs * 100.0,
                        best_len);
            }

            /* Generate next combination in lexicographic order */
            int i = k - 1;
            while (i >= 0 && combo[i] == total - k + i)
                i--;
            if (i < 0) break;  /* All combinations exhausted */
            combo[i]++;
            for (int j = i + 1; j < k; j++)
                combo[j] = combo[j - 1] + 1;
        }
    }

    free(combo);

    fprintf(stderr, "Search complete: %llu mazes evaluated, best length = %d\n",
            (unsigned long long)total_evaluated, best_len);

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
