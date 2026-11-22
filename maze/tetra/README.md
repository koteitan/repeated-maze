[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# tetra — a maze that computes tetration (a power tower of 2s)

A maze with about as many ports as cp3-2 (about 400) whose shortest path has a huge length.

## Idea

- When `nd-to-2d.py` Gödel-encodes an n-register machine, the maze x coordinate is the Gödel number x = 2^a · 3^b · 5^c · 7^d.
- The 2-register machine changes x by one per step, so its number of steps is about as large as x.
- So the source machine only has to have few rules and reach large register values.
- The tetra source machine has 4 registers and 11 rules. It turns b into a power tower of 2s.

## Source machine (`make-tetra.py`)

The registers (a, b, c, d) get the primes 2, 3, 5, 7. By the nd-to-2d convention the machine starts at (a, b, c, d) = (0, 1, 0, 0).

| pc | rule | meaning |
|---|---|---|
| 0 | a := A, d := M−1 | setup |
| 2 | a = 0 → pc 5, else a−1 → pc 3 | outer loop of one pass |
| 3 | b = 0 → pc 4, else b−1, c+2 | move b to c, doubled |
| 4 | c = 0 → pc 2, else c−1, b+1 | move c back to b |
| 5 | d = 0 → HALT, else d−1 → pc 6 | pass counter |
| 6 | b = 0 → b := 1, pc 2, else b−1, a+1 | move b to a, then the next pass |

One pass computes b := 2^a (and a := 0). After M passes

- b = 2^2^…^2^A (M twos).

The files fix A = 2, and then b = 2↑↑(M+1). For M = 1, 2, 3, 4, b is 4, 16, 65536, 2^65536.

## Files

- `make-tetra.py` — writes the source machine (4-register Haskell). `python3 make-tetra.py M [A] > tetra-M-4d.hs` (A defaults to 2)
- `Makefile` — `make` builds tetra-2 to tetra-4. Other M can be built like `make tetra-1.maze`. It calls nd-to-2d with `--fuse`.
- `tetra-M-4d.hs` — source machine (M = 2, 3, 4)
- `tetra-M-2d.hs` — Gödel-encoded 2-register machine
- `tetra-M.maze` — maze. tetra-2 to tetra-4 can also be opened from the presets of the [visualiser](https://koteitan.github.io/repeated-maze/).
- `count-steps.py` — runs the 2-register machine exactly and counts its steps. Loops are taken in one jump, so it works for huge Gödel numbers.

## Size and number of steps

S is the number of moves (steps that change x or y) of the 2-register machine, and L is the length of the shortest path of the maze.

| maze | final b | ports | S | L |
|---|---|---|---|---|
| tetra-1 (`make tetra-1.maze`) | 4 | 332 | 10,927 | 21,863 (solver) |
| tetra-2 | 16 | 356 | 2,487,644,246,145 | about 2S ≈ 5.0 × 10^12 |
| tetra-3 | 65536 | 380 | 8.137… × 10^45808 (45,809 digits) | about 2S ≈ 1.6 × 10^45809 |
| tetra-4 | 2^65536 | 404 | more than 3^(2^65536) | about 2S > 10^(10^19727) |
| (reference) cp3-2 | | 382 | 16,379 | 32,783 |

- L of tetra-1 is the value found by the solver.
- S of tetra-2 and tetra-3 is the exact value counted by `count-steps.py`. L is estimated as twice that.
- S of tetra-4 cannot be counted, but it has a lower bound. At HALT the state is (a, b, c, d) = (0, 2^65536, 0, 0), so the Gödel number is x = 3^(2^65536). Before the goal nd-to-2d decreases x one by one to 0, which alone takes 3^(2^65536) steps. 3^(2^65536) ≈ 10^(10^19727.98).

### L and S

For the mazes the solver can solve, L was only slightly larger than 2S.

| maze | S | L | L − 2S |
|---|---|---|---|
| tetra-1 | 10,927 | 21,863 | 9 |
| cp3-2 | 16,379 | 32,783 | 25 |
| cp3-3 | 615,179 | 1,230,549 | 191 |

L of the larger mazes is estimated as "about 2S" from this. L itself is not checked.

## `--fuse` in nd-to-2d

Two flags were added to `nd-to-2d.py` to reduce the number of ports. Without them the output is unchanged.

- `--fast-test`: a zero test (p does not divide x) takes 3p+1 pcs instead of O(p²).
- `--fuse`: implies `--fast-test`. The two rules "r_j = 0 → A, else r_j − 1 → B" are compiled as one trial division (3p+3 pcs).

tetra-3 has 714 ports without flags, 528 with `--fast-test` and 380 with `--fuse`. With `--fuse`, cp3-2 goes from 382 to 282 ports.

## Checks

- Running the source machine directly, tetra-3 halts after 196,754 steps with b = 65536.
- `count-steps.py` agrees with a step-by-step run (tetra-1, cp3-3 and others). It counts tetra-3 in under a minute.
- The solver solves tetra-1 and reaches the goal.
