#include "solver.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* --- State helpers --- */

static int state_eq(State a, State b) {
    return a.x == b.x && a.y == b.y && a.dir == b.dir && a.idx == b.idx;
}

static uint64_t state_hash(State s) {
    uint64_t h = 14695981039346656037ULL;
    h ^= (uint64_t)(uint32_t)s.x;  h *= 1099511628211ULL;
    h ^= (uint64_t)(uint32_t)s.y;  h *= 1099511628211ULL;
    h ^= (uint64_t)(uint32_t)s.dir; h *= 1099511628211ULL;
    h ^= (uint64_t)(uint32_t)s.idx; h *= 1099511628211ULL;
    return h;
}

/* --- Visited entry --- */

typedef struct {
    State state;
    int parent;   /* index in vis array, -1 for start */
} VisEntry;

/* --- BFS context --- */

typedef struct {
    VisEntry *vis;
    int vis_count;
    int vis_cap;
    int *ht;       /* hash table: index into vis[], or -1 */
    int ht_size;   /* power of 2 */
} BFS;

static void bfs_init(BFS *b) {
    b->vis_cap = 4096;
    b->vis_count = 0;
    b->vis = malloc(b->vis_cap * sizeof(VisEntry));
    b->ht_size = 8192;
    b->ht = malloc(b->ht_size * sizeof(int));
    memset(b->ht, 0xFF, b->ht_size * sizeof(int));
}

static void bfs_free(BFS *b) {
    free(b->vis);
    free(b->ht);
}

static int bfs_find(const BFS *b, State s) {
    uint64_t h = state_hash(s) & (uint64_t)(b->ht_size - 1);
    while (b->ht[h] != -1) {
        if (state_eq(b->vis[b->ht[h]].state, s))
            return b->ht[h];
        h = (h + 1) & (uint64_t)(b->ht_size - 1);
    }
    return -1;
}

static void bfs_rebuild_ht(BFS *b) {
    int new_size = b->ht_size * 2;
    int *new_ht = malloc(new_size * sizeof(int));
    memset(new_ht, 0xFF, new_size * sizeof(int));
    for (int i = 0; i < b->vis_count; i++) {
        uint64_t h = state_hash(b->vis[i].state) & (uint64_t)(new_size - 1);
        while (new_ht[h] != -1)
            h = (h + 1) & (uint64_t)(new_size - 1);
        new_ht[h] = i;
    }
    free(b->ht);
    b->ht = new_ht;
    b->ht_size = new_size;
}

static int bfs_insert(BFS *b, State s, int parent) {
    if (b->vis_count >= b->vis_cap) {
        b->vis_cap *= 2;
        b->vis = realloc(b->vis, b->vis_cap * sizeof(VisEntry));
    }
    int idx = b->vis_count++;
    b->vis[idx] = (VisEntry){s, parent};

    if (b->vis_count * 2 > b->ht_size)
        bfs_rebuild_ht(b);

    uint64_t h = state_hash(s) & (uint64_t)(b->ht_size - 1);
    while (b->ht[h] != -1)
        h = (h + 1) & (uint64_t)(b->ht_size - 1);
    b->ht[h] = idx;
    return idx;
}

/* --- Canonical conversion --- */

static State to_canonical(int bx, int by, int tdir, int tidx) {
    State s;
    switch (tdir) {
    case TDIR_E: s.x = bx;   s.y = by;   s.dir = CDIR_E; break;
    case TDIR_W: s.x = bx-1; s.y = by;   s.dir = CDIR_E; break;
    case TDIR_N: s.x = bx;   s.y = by;   s.dir = CDIR_N; break;
    case TDIR_S: s.x = bx;   s.y = by-1; s.dir = CDIR_N; break;
    default:     s.x = -1;   s.y = -1;   s.dir = 0;      break;
    }
    s.idx = tidx;
    return s;
}

/* --- Neighbor enumeration --- */

static int get_neighbors(const Maze *m, State s, int max_coord,
                         State *nbrs) {
    int n = m->nterm;
    int n4 = 4 * n;
    int cnt = 0;

    if (s.dir == CDIR_E) {
        /*
         * Physical point: E-side of block (sx,sy) / W-side of block (sx+1,sy)
         */

        /* Block (sx, sy) — terminal E[si] */
        {
            int bx = s.x, by = s.y;
            if (by > 0) {
                if (bx > 0) {
                    /* normal block */
                    int src = TDIR_E * n + s.idx;
                    for (int dst = 0; dst < n4; dst++) {
                        if (!m->normal_ports[src * n4 + dst]) continue;
                        State ns = to_canonical(bx, by, dst / n, dst % n);
                        if (ns.x >= 0 && ns.y >= 0 &&
                            ns.x <= max_coord && ns.y <= max_coord)
                            nbrs[cnt++] = ns;
                    }
                } else {
                    /* nx block (bx==0): only E terminals */
                    for (int dj = 0; dj < n; dj++) {
                        if (dj == s.idx) continue;
                        int adj = dj < s.idx ? dj : dj - 1;
                        if (m->nx_ports[s.idx * (n - 1) + adj])
                            nbrs[cnt++] = (State){0, by, CDIR_E, dj};
                    }
                }
            }
        }

        /* Block (sx+1, sy) — terminal W[si] */
        {
            int bx = s.x + 1, by = s.y;
            if (bx > 0 && by > 0) {
                /* normal block */
                int src = TDIR_W * n + s.idx;
                for (int dst = 0; dst < n4; dst++) {
                    if (!m->normal_ports[src * n4 + dst]) continue;
                    State ns = to_canonical(bx, by, dst / n, dst % n);
                    if (ns.x >= 0 && ns.y >= 0 &&
                        ns.x <= max_coord && ns.y <= max_coord)
                        nbrs[cnt++] = ns;
                }
            }
        }

    } else {
        /*
         * CDIR_N: N-side of block (sx,sy) / S-side of block (sx,sy+1)
         */

        /* Block (sx, sy) — terminal N[si] */
        {
            int bx = s.x, by = s.y;
            if (bx > 0) {
                if (by > 0) {
                    /* normal block */
                    int src = TDIR_N * n + s.idx;
                    for (int dst = 0; dst < n4; dst++) {
                        if (!m->normal_ports[src * n4 + dst]) continue;
                        State ns = to_canonical(bx, by, dst / n, dst % n);
                        if (ns.x >= 0 && ns.y >= 0 &&
                            ns.x <= max_coord && ns.y <= max_coord)
                            nbrs[cnt++] = ns;
                    }
                } else {
                    /* ny block (by==0): only N terminals */
                    for (int dj = 0; dj < n; dj++) {
                        if (dj == s.idx) continue;
                        int adj = dj < s.idx ? dj : dj - 1;
                        if (m->ny_ports[s.idx * (n - 1) + adj])
                            nbrs[cnt++] = (State){bx, 0, CDIR_N, dj};
                    }
                }
            }
        }

        /* Block (sx, sy+1) — terminal S[si] */
        {
            int bx = s.x, by = s.y + 1;
            if (bx > 0 && by > 0) {
                /* normal block */
                int src = TDIR_S * n + s.idx;
                for (int dst = 0; dst < n4; dst++) {
                    if (!m->normal_ports[src * n4 + dst]) continue;
                    State ns = to_canonical(bx, by, dst / n, dst % n);
                    if (ns.x >= 0 && ns.y >= 0 &&
                        ns.x <= max_coord && ns.y <= max_coord)
                        nbrs[cnt++] = ns;
                }
            }
        }
    }

    return cnt;
}

/* --- Public API --- */

int solve(const Maze *m, int max_coord, State **path_out, int *path_len_out) {
    if (path_out)     *path_out = NULL;
    if (path_len_out) *path_len_out = 0;
    if (m->nterm < 2) return -1;

    State start = {0, 1, CDIR_E, 0};
    State goal  = {0, 1, CDIR_E, 1};

    BFS b;
    bfs_init(&b);

    /* Queue (index-based, not circular) */
    int q_cap = 4096;
    int q_head = 0, q_tail = 0;
    int *queue = malloc(q_cap * sizeof(int));

    /* Insert start */
    int si = bfs_insert(&b, start, -1);
    queue[q_tail++] = si;

    int goal_idx = -1;
    int max_nbrs = 8 * m->nterm;
    State *nbrs = malloc(max_nbrs * sizeof(State));

    while (q_head < q_tail) {
        int ci = queue[q_head++];
        State cur = b.vis[ci].state;

        int nn = get_neighbors(m, cur, max_coord, nbrs);
        for (int i = 0; i < nn; i++) {
            if (bfs_find(&b, nbrs[i]) >= 0)
                continue;

            int ni = bfs_insert(&b, nbrs[i], ci);

            if (q_tail >= q_cap) {
                q_cap *= 2;
                queue = realloc(queue, q_cap * sizeof(int));
            }
            queue[q_tail++] = ni;

            if (state_eq(nbrs[i], goal)) {
                goal_idx = ni;
                goto done;
            }
        }
    }

done:
    free(nbrs);
    free(queue);

    if (goal_idx < 0) {
        bfs_free(&b);
        return -1;
    }

    /* Reconstruct path */
    int path_len = 0;
    for (int i = goal_idx; i >= 0; i = b.vis[i].parent)
        path_len++;

    if (path_out) {
        State *path = malloc(path_len * sizeof(State));
        int j = path_len - 1;
        for (int i = goal_idx; i >= 0; i = b.vis[i].parent)
            path[j--] = b.vis[i].state;
        *path_out = path;
    }
    if (path_len_out) *path_len_out = path_len;

    bfs_free(&b);
    return path_len - 1;  /* number of edges */
}

void state_print(State s) {
    printf("(%d,%d,%s%d)", s.x, s.y,
           s.dir == CDIR_E ? "E" : "N", s.idx);
}

void path_print(const State *path, int path_len) {
    for (int i = 0; i < path_len; i++) {
        if (i > 0) printf(" -> ");
        state_print(path[i]);
    }
    printf("\n");
}

void path_print_grid(const State *path, int path_len) {
    if (path_len == 0) return;

    int min_x = path[0].x, max_x = path[0].x;
    int min_y = path[0].y, max_y = path[0].y;
    for (int i = 1; i < path_len; i++) {
        if (path[i].x < min_x) min_x = path[i].x;
        if (path[i].x > max_x) max_x = path[i].x;
        if (path[i].y < min_y) min_y = path[i].y;
        if (path[i].y > max_y) max_y = path[i].y;
    }

    /* Determine column widths */
    int cols = max_x - min_x + 1;
    int *col_w = calloc(cols, sizeof(int));
    for (int c = 0; c < cols; c++) col_w[c] = 4; /* minimum */

    /* Pre-build cell strings */
    int rows = max_y - min_y + 1;
    char **cells = calloc(rows * cols, sizeof(char *));
    for (int y = min_y; y <= max_y; y++) {
        for (int x = min_x; x <= max_x; x++) {
            char buf[128] = "";
            int pos = 0;
            for (int i = 0; i < path_len && pos < 100; i++) {
                if (path[i].x == x && path[i].y == y) {
                    if (pos > 0) pos += snprintf(buf + pos, sizeof(buf) - pos, ",");
                    pos += snprintf(buf + pos, sizeof(buf) - pos, "%d", i);
                }
            }
            if (pos == 0) { buf[0] = '.'; buf[1] = '\0'; }
            int r = y - min_y;
            int c = x - min_x;
            cells[r * cols + c] = strdup(buf);
            int len = (int)strlen(buf);
            if (len + 2 > col_w[c]) col_w[c] = len + 2;
        }
    }

    printf("Grid (step numbers at each position):\n");

    /* Header */
    printf("y\\x  ");
    for (int x = min_x; x <= max_x; x++)
        printf("%-*d", col_w[x - min_x], x);
    printf("\n");

    /* Rows top-to-bottom (high y first) */
    for (int y = max_y; y >= min_y; y--) {
        printf("%-4d ", y);
        int r = y - min_y;
        for (int c = 0; c < cols; c++)
            printf("%-*s", col_w[c], cells[r * cols + c]);
        printf("\n");
    }

    for (int i = 0; i < rows * cols; i++) free(cells[i]);
    free(cells);
    free(col_w);
}

/* --- Verbose path with transition annotations --- */

static const char *tdir_str[] = {"E", "W", "N", "S"};

typedef struct { int bx, by, td, ti; } BlockTerm;

void path_print_verbose(const Maze *m, const State *path, int path_len) {
    if (path_len == 0) return;

    printf("Path details (%d steps):\n", path_len - 1);

    for (int step = 0; step < path_len - 1; step++) {
        State s1 = path[step];
        State s2 = path[step + 1];

        /* Build block-terminal pairs for s1 and s2 */
        BlockTerm p1[2], p2[2];
        int n1 = 0, n2 = 0;

        if (s1.dir == CDIR_E) {
            p1[n1++] = (BlockTerm){s1.x,   s1.y, TDIR_E, s1.idx};
            p1[n1++] = (BlockTerm){s1.x+1, s1.y, TDIR_W, s1.idx};
        } else {
            p1[n1++] = (BlockTerm){s1.x, s1.y,   TDIR_N, s1.idx};
            p1[n1++] = (BlockTerm){s1.x, s1.y+1, TDIR_S, s1.idx};
        }
        if (s2.dir == CDIR_E) {
            p2[n2++] = (BlockTerm){s2.x,   s2.y, TDIR_E, s2.idx};
            p2[n2++] = (BlockTerm){s2.x+1, s2.y, TDIR_W, s2.idx};
        } else {
            p2[n2++] = (BlockTerm){s2.x, s2.y,   TDIR_N, s2.idx};
            p2[n2++] = (BlockTerm){s2.x, s2.y+1, TDIR_S, s2.idx};
        }

        /* Find common block with a valid port */
        int found = 0;
        for (int i = 0; i < n1 && !found; i++) {
            for (int j = 0; j < n2 && !found; j++) {
                if (p1[i].bx != p2[j].bx || p1[i].by != p2[j].by)
                    continue;
                int bx = p1[i].bx, by = p1[i].by;
                int sd = p1[i].td, si = p1[i].ti;
                int dd = p2[j].td, di = p2[j].ti;
                const char *btype = NULL;
                int has_port = 0;

                if (bx > 0 && by > 0) {
                    btype = "normal";
                    has_port = maze_normal_port(m, sd, si, dd, di);
                } else if (bx == 0 && by > 0) {
                    btype = "nx";
                    if (sd == TDIR_E && dd == TDIR_E && si != di)
                        has_port = maze_nx_port(m, si, di);
                } else if (bx > 0 && by == 0) {
                    btype = "ny";
                    if (sd == TDIR_N && dd == TDIR_N && si != di)
                        has_port = maze_ny_port(m, si, di);
                }
                if (has_port && btype) {
                    printf("  #%-3d (%d,%d,%s%d) --[%s%d->%s%d @ %s(%d,%d)]--> (%d,%d,%s%d)\n",
                           step,
                           s1.x, s1.y, s1.dir == CDIR_E ? "E" : "N", s1.idx,
                           tdir_str[sd], si, tdir_str[dd], di, btype, bx, by,
                           s2.x, s2.y, s2.dir == CDIR_E ? "E" : "N", s2.idx);
                    found = 1;
                }
            }
        }
        if (!found) {
            printf("  #%-3d (%d,%d,%s%d) --> (%d,%d,%s%d)  [transition unknown]\n",
                   step,
                   s1.x, s1.y, s1.dir == CDIR_E ? "E" : "N", s1.idx,
                   s2.x, s2.y, s2.dir == CDIR_E ? "E" : "N", s2.idx);
        }
    }
}
