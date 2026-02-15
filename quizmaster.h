#ifndef QUIZMASTER_H
#define QUIZMASTER_H

#include "maze.h"
#include "solver.h"

typedef struct {
    Maze  *best_maze;
    int    best_length;
    State *best_path;
    int    best_path_len;
} QMResult;

/*
 * Hill-climbing search with random restarts.
 * Finds the maze with the longest minimal path for the given nterm.
 */
QMResult quizmaster_search(int nterm, int max_coord, int max_iterations,
                           uint64_t seed);

void qmresult_free(QMResult *r);

#endif
