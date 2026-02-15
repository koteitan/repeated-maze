#include "maze.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

Maze *maze_create(int nterm) {
    Maze *m = calloc(1, sizeof(Maze));
    m->nterm = nterm;
    int n4 = 4 * nterm;
    m->normal_nports = n4 * n4;
    m->nx_nports = nterm * (nterm - 1);
    m->ny_nports = nterm * (nterm - 1);
    m->total_nports = m->normal_nports + m->nx_nports + m->ny_nports;
    m->normal_ports = calloc(m->normal_nports > 0 ? m->normal_nports : 1, 1);
    m->nx_ports     = calloc(m->nx_nports > 0 ? m->nx_nports : 1, 1);
    m->ny_ports     = calloc(m->ny_nports > 0 ? m->ny_nports : 1, 1);
    return m;
}

void maze_destroy(Maze *m) {
    if (!m) return;
    free(m->normal_ports);
    free(m->nx_ports);
    free(m->ny_ports);
    free(m);
}

Maze *maze_clone(const Maze *m) {
    Maze *c = maze_create(m->nterm);
    memcpy(c->normal_ports, m->normal_ports, m->normal_nports);
    memcpy(c->nx_ports,     m->nx_ports,     m->nx_nports);
    memcpy(c->ny_ports,     m->ny_ports,     m->ny_nports);
    return c;
}

/* --- Port index helpers --- */

static int normal_idx(int nterm, int sd, int si, int dd, int di) {
    int n4 = 4 * nterm;
    int src = sd * nterm + si;
    int dst = dd * nterm + di;
    return src * n4 + dst;
}

static int edge_idx(int nterm, int si, int di) {
    int adj = di < si ? di : di - 1;
    return si * (nterm - 1) + adj;
}

/* --- Typed port accessors --- */

int maze_normal_port(const Maze *m, int sd, int si, int dd, int di) {
    return m->normal_ports[normal_idx(m->nterm, sd, si, dd, di)];
}

void maze_set_normal_port(Maze *m, int sd, int si, int dd, int di, int val) {
    m->normal_ports[normal_idx(m->nterm, sd, si, dd, di)] = val ? 1 : 0;
}

int maze_nx_port(const Maze *m, int si, int di) {
    return m->nx_ports[edge_idx(m->nterm, si, di)];
}

void maze_set_nx_port(Maze *m, int si, int di, int val) {
    m->nx_ports[edge_idx(m->nterm, si, di)] = val ? 1 : 0;
}

int maze_ny_port(const Maze *m, int si, int di) {
    return m->ny_ports[edge_idx(m->nterm, si, di)];
}

void maze_set_ny_port(Maze *m, int si, int di, int val) {
    m->ny_ports[edge_idx(m->nterm, si, di)] = val ? 1 : 0;
}

/* --- Flat-index accessors --- */

int maze_get_port(const Maze *m, int idx) {
    if (idx < m->normal_nports)
        return m->normal_ports[idx];
    idx -= m->normal_nports;
    if (idx < m->nx_nports)
        return m->nx_ports[idx];
    idx -= m->nx_nports;
    return m->ny_ports[idx];
}

void maze_set_port(Maze *m, int idx, int val) {
    val = val ? 1 : 0;
    if (idx < m->normal_nports) {
        m->normal_ports[idx] = val;
        return;
    }
    idx -= m->normal_nports;
    if (idx < m->nx_nports) {
        m->nx_ports[idx] = val;
        return;
    }
    idx -= m->nx_nports;
    m->ny_ports[idx] = val;
}

void maze_flip_port(Maze *m, int idx) {
    maze_set_port(m, idx, !maze_get_port(m, idx));
}

/* --- Bulk operations --- */

void maze_set_from_array(Maze *m, const uint8_t *data) {
    memcpy(m->normal_ports, data, m->normal_nports);
    memcpy(m->nx_ports, data + m->normal_nports, m->nx_nports);
    memcpy(m->ny_ports, data + m->normal_nports + m->nx_nports, m->ny_nports);
}

void maze_randomize(Maze *m, uint64_t *rng) {
    for (int i = 0; i < m->total_nports; i++)
        maze_set_port(m, i, rng_next(rng) & 1);
}

/* --- Print --- */

static const char *tdir_name[] = {"E", "W", "N", "S"};

void maze_fprint(FILE *fp, const Maze *m) {
    int n = m->nterm;
    int first;

    fprintf(fp, "normal:");
    first = 1;
    for (int sd = 0; sd < 4; sd++)
        for (int si = 0; si < n; si++)
            for (int dd = 0; dd < 4; dd++)
                for (int di = 0; di < n; di++)
                    if (maze_normal_port(m, sd, si, dd, di)) {
                        fprintf(fp, "%s %s%d->%s%d",
                                first ? "" : ",",
                                tdir_name[sd], si,
                                tdir_name[dd], di);
                        first = 0;
                    }
    if (first) fprintf(fp, " (none)");

    fprintf(fp, "; nx:");
    first = 1;
    for (int si = 0; si < n; si++)
        for (int di = 0; di < n; di++)
            if (di != si && maze_nx_port(m, si, di)) {
                fprintf(fp, "%s E%d->E%d", first ? "" : ",", si, di);
                first = 0;
            }
    if (first) fprintf(fp, " (none)");

    fprintf(fp, "; ny:");
    first = 1;
    for (int si = 0; si < n; si++)
        for (int di = 0; di < n; di++)
            if (di != si && maze_ny_port(m, si, di)) {
                fprintf(fp, "%s N%d->N%d", first ? "" : ",", si, di);
                first = 0;
            }
    if (first) fprintf(fp, " (none)");

    fprintf(fp, "\n");
}

void maze_print(const Maze *m) {
    maze_fprint(stdout, m);
}

void maze_print_table(const Maze *m) {
    int n = m->nterm;

    printf("Normal block port table (%d terminals):\n", 4 * n);
    printf("      ");
    for (int dd = 0; dd < 4; dd++)
        for (int di = 0; di < n; di++)
            printf(" %s%-2d", tdir_name[dd], di);
    printf("\n");
    for (int sd = 0; sd < 4; sd++)
        for (int si = 0; si < n; si++) {
            printf("  %s%-2d ", tdir_name[sd], si);
            for (int dd = 0; dd < 4; dd++)
                for (int di = 0; di < n; di++)
                    printf("  %c ", maze_normal_port(m, sd, si, dd, di) ? '*' : '.');
            printf("\n");
        }

    printf("nx block ports: ");
    if (m->nx_nports == 0) {
        printf("(none)\n");
    } else {
        int first = 1;
        for (int si = 0; si < n; si++)
            for (int di = 0; di < n; di++)
                if (di != si && maze_nx_port(m, si, di)) {
                    printf("%sE%d->E%d", first ? "" : ", ", si, di);
                    first = 0;
                }
        if (first) printf("(none)");
        printf("\n");
    }

    printf("ny block ports: ");
    if (m->ny_nports == 0) {
        printf("(none)\n");
    } else {
        int first = 1;
        for (int si = 0; si < n; si++)
            for (int di = 0; di < n; di++)
                if (di != si && maze_ny_port(m, si, di)) {
                    printf("%sN%d->N%d", first ? "" : ", ", si, di);
                    first = 0;
                }
        if (first) printf("(none)");
        printf("\n");
    }
}

/* --- Parse --- */

static int parse_dir(char c) {
    switch (c) {
    case 'E': case 'e': return TDIR_E;
    case 'W': case 'w': return TDIR_W;
    case 'N': case 'n': return TDIR_N;
    case 'S': case 's': return TDIR_S;
    default: return -1;
    }
}

static int parse_terminal(const char **p, int *dir, int *idx) {
    while (isspace((unsigned char)**p)) (*p)++;
    int d = parse_dir(**p);
    if (d < 0) return -1;
    (*p)++;
    if (!isdigit((unsigned char)**p)) return -1;
    *dir = d;
    *idx = 0;
    while (isdigit((unsigned char)**p)) {
        *idx = *idx * 10 + (**p - '0');
        (*p)++;
    }
    return 0;
}

static void skip_ws(const char **p) {
    while (isspace((unsigned char)**p)) (*p)++;
}

static int skip_str(const char **p, const char *s) {
    skip_ws(p);
    size_t len = strlen(s);
    if (strncmp(*p, s, len) == 0) { *p += len; return 1; }
    return 0;
}

Maze *maze_parse(int nterm, const char *str) {
    Maze *m = maze_create(nterm);
    const char *p = str;

    /* Parse "normal:" section */
    if (!skip_str(&p, "normal:")) goto fail;
    skip_ws(&p);
    if (strncmp(p, "(none)", 6) == 0) {
        p += 6;
    } else {
        while (*p && *p != ';') {
            int sd, si, dd, di;
            if (parse_terminal(&p, &sd, &si) < 0) break;
            skip_ws(&p);
            if (*p == '-') p++;
            if (*p == '>') p++;
            if (parse_terminal(&p, &dd, &di) < 0) break;
            if (sd >= 0 && sd < 4 && si >= 0 && si < nterm &&
                dd >= 0 && dd < 4 && di >= 0 && di < nterm)
                maze_set_normal_port(m, sd, si, dd, di, 1);
            skip_ws(&p);
            if (*p == ',') p++;
        }
    }

    /* Parse "nx:" section */
    if (*p == ';') p++;
    if (!skip_str(&p, "nx:")) goto done;
    skip_ws(&p);
    if (strncmp(p, "(none)", 6) == 0) {
        p += 6;
    } else {
        while (*p && *p != ';') {
            int sd, si, dd, di;
            if (parse_terminal(&p, &sd, &si) < 0) break;
            skip_ws(&p);
            if (*p == '-') p++;
            if (*p == '>') p++;
            if (parse_terminal(&p, &dd, &di) < 0) break;
            if (si >= 0 && si < nterm && di >= 0 && di < nterm && si != di)
                maze_set_nx_port(m, si, di, 1);
            skip_ws(&p);
            if (*p == ',') p++;
        }
    }

    /* Parse "ny:" section */
    if (*p == ';') p++;
    if (!skip_str(&p, "ny:")) goto done;
    skip_ws(&p);
    if (strncmp(p, "(none)", 6) == 0) {
        p += 6;
    } else {
        while (*p && *p != ';' && *p != '\0') {
            int sd, si, dd, di;
            if (parse_terminal(&p, &sd, &si) < 0) break;
            skip_ws(&p);
            if (*p == '-') p++;
            if (*p == '>') p++;
            if (parse_terminal(&p, &dd, &di) < 0) break;
            if (si >= 0 && si < nterm && di >= 0 && di < nterm && si != di)
                maze_set_ny_port(m, si, di, 1);
            skip_ws(&p);
            if (*p == ',') p++;
        }
    }

done:
    return m;

fail:
    maze_destroy(m);
    return NULL;
}
