/*
 * quizmaster.h -- Search for the maze with the longest minimal path.
 *
 * The quizmaster performs an exhaustive search over all mazes with at most
 * max_aport active ports, enumerating all C(total_nports, k) combinations
 * for k = 0, 1, ..., max_aport.
 */
#ifndef QUIZMASTER_H
#define QUIZMASTER_H

#include "maze.h"
#include "solver.h"

/*
 * QMResult -- result of a quizmaster search.
 *
 * Fields:
 *   best_maze     -- the maze with the longest minimal path found (caller frees)
 *   best_length   -- the shortest path length in that maze
 *   best_path     -- the actual shortest path (caller frees)
 *   best_path_len -- number of states in best_path (= best_length + 1)
 */
typedef struct {
    Maze  *best_maze;
    int    best_length;
    State *best_path;
    int    best_path_len;
} QMResult;

/*
 * quizmaster_search -- search for the maze with the longest minimal path.
 *
 * Parameters:
 *   nterm      -- number of terminal indices per direction (must be >= 2)
 *   max_aport  -- maximum number of active ports per maze
 *
 * Algorithm:
 *   For k = 0 to max_aport:
 *     For each combination of k ports from total_nports:
 *       Clear maze, set the k chosen ports.
 *       (Optimization: skip if no exit from start or no entry to goal.)
 *       Solve the maze with IDDFS.
 *       Track global best.
 *
 * Returns a QMResult with the best maze found. Use qmresult_free() to release.
 */
QMResult quizmaster_search(int nterm, int max_aport);

/* qmresult_free -- free the maze and path stored in a QMResult. */
void qmresult_free(QMResult *r);

#endif
