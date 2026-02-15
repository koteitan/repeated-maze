#ifndef MAZE_H
#define MAZE_H

#include <stdint.h>
#include <stdio.h>

/* Terminal directions within a normal block */
#define TDIR_E 0
#define TDIR_W 1
#define TDIR_N 2
#define TDIR_S 3

typedef struct {
    int nterm;
    int normal_nports;   /* (4*nterm)^2 */
    int nx_nports;       /* nterm*(nterm-1) */
    int ny_nports;       /* nterm*(nterm-1) */
    int total_nports;
    uint8_t *normal_ports;  /* byte per port, 0 or 1 */
    uint8_t *nx_ports;
    uint8_t *ny_ports;
} Maze;

/* Simple xorshift64 PRNG */
static inline uint64_t rng_next(uint64_t *state) {
    uint64_t x = *state;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    *state = x;
    return x;
}

Maze *maze_create(int nterm);
void  maze_destroy(Maze *m);
Maze *maze_clone(const Maze *m);

/* Typed port accessors */
int  maze_normal_port(const Maze *m, int sd, int si, int dd, int di);
void maze_set_normal_port(Maze *m, int sd, int si, int dd, int di, int val);
int  maze_nx_port(const Maze *m, int si, int di);
void maze_set_nx_port(Maze *m, int si, int di, int val);
int  maze_ny_port(const Maze *m, int si, int di);
void maze_set_ny_port(Maze *m, int si, int di, int val);

/* Flat-index port accessors (0..total_nports-1) */
int  maze_get_port(const Maze *m, int idx);
void maze_set_port(Maze *m, int idx, int val);
void maze_flip_port(Maze *m, int idx);

/* Bulk operations */
void maze_set_from_array(Maze *m, const uint8_t *data);
void maze_randomize(Maze *m, uint64_t *rng);

/* I/O */
void  maze_fprint(FILE *fp, const Maze *m);
void  maze_print(const Maze *m);
void  maze_print_table(const Maze *m);
Maze *maze_parse(int nterm, const char *str);

#endif
