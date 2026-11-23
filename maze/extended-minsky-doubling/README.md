[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# extended minsky doubling — a maze that multiplies a value by m, k times

An extension of the [Minsky doubling machine (md)](../minsky-doubling/README.md): a 2-register maze without Gödel encoding that makes a longer shortest path than md with fewer ports.

## Source machine (`make-exmd.py`)

`exmd<m>-<k>.hs` moves the value back and forth between y and x, multiplying it by m on each move.

- pc 0: y := 1
- cycle c (c = 0, 1, …, k−1):
  - c even: decrement y and increment x m times; go to the next cycle when y = 0
  - c odd: decrement x and increment y m times; go to the next cycle when x = 0
- finally the value m^k is decreased to 0 and the machine halts at (0, 0, 1).

md doubles the value in one cycle (7 rules) and moves it back from x to y. exmd does not move it back, so one cycle takes m + 2 rules and multiplies the value by m.

## Size and number of steps

The number of ports P and the shortest path length L are

- P = 2k(m + 2) + 10
- k even: L = 4(m^(k+1) − 1)/(m − 1) + 1
- k odd: L = 4(m^(k+1) − 1)/(m − 1) + m^k

The formula for P agrees with the counted value for all 74 mazes here. The formula for L agrees with the 16 mazes solved by the solver (✓ in the table below).

For odd k the value ends in x, and L is m^k − 1 longer than the even-k formula. This is presumably because decreasing x to 0 takes 3 steps per unit, unlike decreasing y (2 steps per unit); it has not been checked inside the maze.

| maze | P | L | solver |
|---|---|---|---|
| exmd2-2 | 26 | 29 | ✓ |
| exmd2-6 | 58 | 509 | ✓ |
| exmd2-10 | 90 | 8,189 | ✓ |
| exmd3-5 | 60 | 1,699 | ✓ |
| exmd3-8 | 90 | 39,365 | ✓ |
| exmd4-6 | 82 | 21,845 | ✓ |
| exmd4-8 | 106 | 349,525 | |
| exmd5-6 | 94 | 78,125 | |
| (reference) md5 | 80 | 501 | ✓ |

The 16 mazes solved by the solver are exmd2-{2,4,6,8,10,12}, exmd3-{5,7,8}, exmd4-{5,6}, exmd5-{4,5}, exmd6-4, exmd7-4 and exmd9-3.

The growth per rule, m^(1/(m+2)), is largest at m = 4, so for a given number of ports m around 4 gives the longest path.

## Files

- `make-exmd.py` — writes the source machine. `python3 make-exmd.py M K > exmdM-K.hs`
- `Makefile` — `make` builds `exmd<m>-<k>.hs` and `exmd<m>-<k>.maze` for 74 pairs (m, k).
- `exmd<m>-<k>.hs` — source machine (2-register Haskell)
- `exmd<m>-<k>.maze` — maze. It can be opened in the [visualiser](https://koteitan.github.io/repeated-maze/) as "extended minsky doubling md<m>-<k>" in the Preset Group "extended minsky doubling".
