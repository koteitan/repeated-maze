#include "quizmaster.h"
#include <stdlib.h>
#include <stdio.h>

void qmresult_free(QMResult *r) {
    if (!r) return;
    maze_destroy(r->best_maze);
    r->best_maze = NULL;
    free(r->best_path);
    r->best_path = NULL;
}

QMResult quizmaster_search(int nterm, int max_coord, int max_iterations,
                           uint64_t seed) {
    QMResult result = {NULL, 0, NULL, 0};
    if (nterm < 2) return result;

    uint64_t rng = seed ? seed : 42;
    /* Ensure non-zero initial state for xorshift */
    if (rng == 0) rng = 1;

    Maze *m = maze_create(nterm);
    Maze *best = NULL;
    int best_len = 0;

    int stagnation = 0;
    int restart_threshold = 1000;
    int report_interval = 10000;

    /* Initial random maze */
    maze_randomize(m, &rng);
    int cur_len = solve(m, max_coord, NULL, NULL);
    if (cur_len < 0) cur_len = 0;

    for (int iter = 0; iter < max_iterations; iter++) {
        /* Flip a random port bit */
        int bit = (int)(rng_next(&rng) % (uint64_t)m->total_nports);
        maze_flip_port(m, bit);

        int new_len = solve(m, max_coord, NULL, NULL);
        if (new_len < 0) new_len = 0;

        if (new_len > cur_len) {
            cur_len = new_len;
            stagnation = 0;
        } else {
            /* Revert */
            maze_flip_port(m, bit);
            stagnation++;
        }

        /* Update global best */
        if (cur_len > best_len) {
            best_len = cur_len;
            if (best) maze_destroy(best);
            best = maze_clone(m);
            fprintf(stderr, "[iter %d] new best: length %d\n",
                    iter, best_len);
            fprintf(stderr, "  ");
            maze_fprint(stderr, best);
        }

        /* Progress report */
        if ((iter + 1) % report_interval == 0) {
            fprintf(stderr, "[iter %d] best=%d cur=%d stagnation=%d\n",
                    iter + 1, best_len, cur_len, stagnation);
        }

        /* Random restart if stagnant */
        if (stagnation >= restart_threshold) {
            maze_randomize(m, &rng);
            cur_len = solve(m, max_coord, NULL, NULL);
            if (cur_len < 0) cur_len = 0;
            stagnation = 0;
        }
    }

    /* Get full path for the best maze */
    if (best) {
        State *path = NULL;
        int path_len = 0;
        solve(best, max_coord, &path, &path_len);
        result.best_maze     = best;
        result.best_length   = best_len;
        result.best_path     = path;
        result.best_path_len = path_len;
    }

    maze_destroy(m);
    return result;
}
