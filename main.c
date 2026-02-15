#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "maze.h"
#include "solver.h"
#include "quizmaster.h"

#define VERSION "0.1.0"

static void usage(void) {
    fprintf(stderr,
        "Usage:\n"
        "  repeated-maze solve <nterm> <maze_string>\n"
        "  repeated-maze search <nterm> [options]\n"
        "Options:\n"
        "  --max-coord <N>   Max coordinate bound (default: 1000)\n"
        "  --max-iter <N>    Max search iterations (default: 1000000)\n"
        "  --seed <N>        Random seed\n");
    exit(1);
}

static int cmd_solve(int argc, char **argv) {
    if (argc < 4) usage();
    int nterm = atoi(argv[2]);
    if (nterm < 2) {
        fprintf(stderr, "nterm must be >= 2\n");
        return 1;
    }
    const char *maze_str = argv[3];

    int max_coord = 1000;
    for (int i = 4; i < argc; i++) {
        if (strcmp(argv[i], "--max-coord") == 0 && i + 1 < argc)
            max_coord = atoi(argv[++i]);
    }

    Maze *m = maze_parse(nterm, maze_str);
    if (!m) {
        fprintf(stderr, "Failed to parse maze string\n");
        return 1;
    }

    printf("Maze: ");
    maze_print(m);

    State *path = NULL;
    int path_len = 0;
    int result = solve(m, max_coord, &path, &path_len);

    if (result < 0) {
        printf("No path found (max_coord=%d)\n", max_coord);
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

static int cmd_search(int argc, char **argv) {
    if (argc < 3) usage();
    int nterm = atoi(argv[2]);
    if (nterm < 2) {
        fprintf(stderr, "nterm must be >= 2\n");
        return 1;
    }

    int max_coord  = 1000;
    int max_iter   = 1000000;
    uint64_t seed  = 0;

    for (int i = 3; i < argc; i++) {
        if (strcmp(argv[i], "--max-coord") == 0 && i + 1 < argc)
            max_coord = atoi(argv[++i]);
        else if (strcmp(argv[i], "--max-iter") == 0 && i + 1 < argc)
            max_iter = atoi(argv[++i]);
        else if (strcmp(argv[i], "--seed") == 0 && i + 1 < argc)
            seed = strtoull(argv[++i], NULL, 10);
    }

    printf("Search: nterm=%d max_coord=%d max_iter=%d seed=%llu\n",
           nterm, max_coord, max_iter, (unsigned long long)seed);

    QMResult r = quizmaster_search(nterm, max_coord, max_iter, seed);

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

    usage();
    return 1;
}
