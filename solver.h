#ifndef SOLVER_H
#define SOLVER_H

#include "maze.h"

/* Canonical direction constants (only E and N survive canonicalization) */
#define CDIR_E 0
#define CDIR_N 1

/* Canonical state: (x, y, dir, idx) where dir in {E=0, N=1} */
typedef struct {
    int x, y;
    int dir;   /* 0=E, 1=N */
    int idx;   /* 0..nterm-1 */
} State;

/*
 * BFS solver.
 * Returns path length (number of port traversals), or -1 if no path within bounds.
 * If path_out != NULL, allocates path array (caller frees).
 * path_len_out receives the number of states in the path (= return value + 1).
 */
int solve(const Maze *m, int max_coord, State **path_out, int *path_len_out);

void state_print(State s);
void path_print(const State *path, int path_len);
void path_print_grid(const State *path, int path_len);
void path_print_verbose(const Maze *m, const State *path, int path_len);

#endif
