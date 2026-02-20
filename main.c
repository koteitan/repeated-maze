/*
 * main.c -- CLI entry point for the repeated-maze program.
 *
 * Provides two subcommands:
 *
 *   solve  -- Parse a maze from its string representation and find the
 *             shortest path from start to goal using IDDFS. Displays the
 *             maze, path, port table, grid visualization, and verbose
 *             transition log.
 *
 *   search -- Run the quizmaster exhaustive search to find the maze
 *             configuration (port assignment) that maximizes the shortest
 *             path length. Displays the best result found, including all
 *             visualizations.
 *
 * Usage:
 *   repeated-maze solve <nterm> <maze_string>
 *   repeated-maze search <nterm> --max-aport <N>
 *   repeated-maze norm <nterm> <maze_string>
 *   repeated-maze --version | -v
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "maze.h"
#include "solver.h"
#include "quizmaster.h"

#define VERSION "0.1.7"

/*
 * usage -- print usage information to stderr and exit with code 1.
 */
static void usage(void) {
    fprintf(stderr,
        "Usage:\n"
        "  repeated-maze solve <nterm> <maze_string>\n"
        "  repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>]\n"
        "  repeated-maze norm <nterm> <maze_string>\n");
    exit(1);
}

/*
 * cmd_solve -- handle the "solve" subcommand.
 *
 * Parses a maze from the command-line string argument, runs the IDDFS solver,
 * and prints the result with multiple visualization formats.
 */
static int cmd_solve(int argc, char **argv) {
    if (argc < 4) usage();
    int nterm = atoi(argv[2]);
    if (nterm < 2) {
        fprintf(stderr, "nterm must be >= 2\n");
        return 1;
    }
    const char *maze_str = argv[3];

    Maze *m = maze_parse(nterm, maze_str);
    if (!m) {
        fprintf(stderr, "Failed to parse maze string\n");
        return 1;
    }

    printf("Maze: ");
    maze_print(m);

    State *path = NULL;
    int path_len = 0;
    int result = solve(m, &path, &path_len);

    if (result < 0) {
        printf("No path found\n");
    } else {
        printf("Path length: %d\n", result);
        printf("Path: ");
        path_print(path, path_len);
        printf("\n");
        maze_print_table(m);
        printf("\n");
        path_print_grid(path, path_len);
        printf("\n");
        path_print_verbose(m, path, path_len);
    }

    free(path);
    maze_destroy(m);
    return 0;
}

/*
 * cmd_search -- handle the "search" subcommand.
 *
 * Runs the quizmaster exhaustive search to find the maze with the
 * longest minimal path for the given nterm and max_aport.
 */
static int cmd_search(int argc, char **argv) {
    if (argc < 3) usage();
    int nterm = atoi(argv[2]);
    if (nterm < 2) {
        fprintf(stderr, "nterm must be >= 2\n");
        return 1;
    }

    int min_aport = 0;
    int max_aport = -1;
    int max_len = 0;
    int random_seed = -1;

    for (int i = 3; i < argc; i++) {
        if (strcmp(argv[i], "--max-aport") == 0 && i + 1 < argc)
            max_aport = atoi(argv[++i]);
        else if (strcmp(argv[i], "--min-aport") == 0 && i + 1 < argc)
            min_aport = atoi(argv[++i]);
        else if (strcmp(argv[i], "--max-len") == 0 && i + 1 < argc)
            max_len = atoi(argv[++i]);
        else if (strcmp(argv[i], "--random") == 0 && i + 1 < argc)
            random_seed = atoi(argv[++i]);
    }

    if (max_aport < 0) {
        fprintf(stderr, "Error: --max-aport <N> is required\n");
        usage();
    }

    QMResult r;
    if (random_seed >= 0) {
        printf("Random search: nterm=%d min_aport=%d max_aport=%d max_len=%d seed=%d\n",
               nterm, min_aport, max_aport, max_len, random_seed);
        r = quizmaster_random_search(nterm, min_aport, max_aport, max_len,
                                     (unsigned int)random_seed);
    } else {
        printf("Search: nterm=%d min_aport=%d max_aport=%d max_len=%d\n",
               nterm, min_aport, max_aport, max_len);
        r = quizmaster_search(nterm, min_aport, max_aport, max_len);
    }

    if (r.best_maze) {
        printf("\n=== Best result ===\n");
        printf("Path length: %d\n", r.best_length);
        printf("Maze: ");
        maze_print(r.best_maze);
        printf("\n");
        maze_print_table(r.best_maze);
        if (r.best_path) {
            printf("\nPath: ");
            path_print(r.best_path, r.best_path_len);
            printf("\n");
            path_print_grid(r.best_path, r.best_path_len);
            printf("\n");
            path_print_verbose(r.best_maze, r.best_path, r.best_path_len);
        }
        qmresult_free(&r);
    } else {
        printf("No maze with a valid path found.\n");
    }

    return 0;
}

/*
 * cmd_norm -- handle the "norm" subcommand.
 *
 * Parses a maze from the command-line string, normalizes terminal indices,
 * and prints the normalized maze.
 */
static int cmd_norm(int argc, char **argv) {
    if (argc < 4) usage();
    int nterm = atoi(argv[2]);
    if (nterm < 2) {
        fprintf(stderr, "nterm must be >= 2\n");
        return 1;
    }
    const char *maze_str = argv[3];

    Maze *m = maze_parse(nterm, maze_str);
    if (!m) {
        fprintf(stderr, "Failed to parse maze string\n");
        return 1;
    }

    printf("Original: ");
    maze_print(m);

    maze_normalize(m);

    printf("Normalized: ");
    maze_print(m);

    maze_destroy(m);
    return 0;
}

/*
 * main -- program entry point. Dispatches to subcommands.
 */
int main(int argc, char **argv) {
    if (argc < 2) usage();

    if (strcmp(argv[1], "--version") == 0 || strcmp(argv[1], "-v") == 0) {
        printf("repeated-maze v%s\n", VERSION);
        return 0;
    }
    if (strcmp(argv[1], "solve") == 0)
        return cmd_solve(argc, argv);
    if (strcmp(argv[1], "search") == 0)
        return cmd_search(argc, argv);
    if (strcmp(argv[1], "norm") == 0)
        return cmd_norm(argc, argv);

    usage();
    return 1;
}
