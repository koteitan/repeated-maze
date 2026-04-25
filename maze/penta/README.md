# penta — Gödel-encoded Pentation Maze

Generator for a **uniform-block** (normal + nx + ny) pattern-repeating maze
implementing penta.md's pentation computation, via Gödel encoding into
a 2-register Minsky machine.

## Overview

[pentation maze](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9A%E3%83%B3%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E8%BF%B7%E8%B7%AF) uses 23 block types and position-dependent rules for density.
This generator takes the same 2-register Gödel-encoded Minsky machine from
§「コインシステムの５次元迷路レジスタマシンのゲーデル数システムを２次元迷路レジスタマシンに…」
and lowers it fully into normal/nx/ny primitives, producing a **uniform**
maze where all normal blocks have identical ports.

## Files

- `make_penta.py`: Python generator. Produces `penta.hs` on stdout.
- `penta.hs`: Generated Haskell state machine (~6000 lines, ~5350 pc values
  at default initial_a=1).

## Usage

```bash
python3 make_penta.py [initial_a] > penta.hs
python3 ../../tools/hs2maze/hs2maze.py penta.hs > penta.maze
# Then manually append nx / ny / bridge ports (listed as comments in penta.hs).
```

`initial_a` controls the input x = 2^initial_a:
- 0: result 1 (trivial HALT)
- 1: result 3^2 = 9
- 2: result 3^(2^16) = 3^65536 (already huge)
- 3+: result 3^(tower of 2s of height initial_a)

## Algorithm

14 Fractran-style rules from penta.md, applied in first-match order:

| Rule | Condition (p∤x) | Action |
|---|---|---|
| 1 | 2, 5 | HALT |
| 2 | 3, 5, 13 | ×9/2 |
| 3 | 5, 7, 13 | ×25/3 |
| 4 | 3, 13 | ×13/2 |
| 5 | 7, 11, 13 | ×49/5 |
| 6 | 5, 13 | ×17/3 |
| 7 | 7, 13 | ×19/5 |
| 8 | 13 | ×121/7 |
| 9 | 5, 17 | ×1/13 |
| 10 | 17 | ×3/5 |
| 11 | 7, 19 | ×1/17 |
| 12 | 19 | ×5/7 |
| 13 | 11 | ×1/19 |
| 14 | (default) | ×7/11 |

Each rule is lowered into:
- **test_ndiv(p)** (non-destructive divisibility test, O(p²) pc)
- **div_p** / **mul_p** (single-constant divide/multiply, O(p) pc each)

## Scale (initial_a=1)

- 5350 unique pc values
- ~1500 nx ports required (for each DEC x used in tests/div)
- ~2700 ny ports required (for each DEC y used in restores)
- Uniform: all normal blocks have the same port layout; all nx blocks
  the same; all ny blocks the same (3 block types total).

## Note

Generating the maze file is mechanical; **solving** it via BFS is
computationally infeasible because the intermediate Gödel numbers blow
up pentation-fast. The point of this build is the **structural existence
proof**: a uniform 3-block-type 2D repeated maze that embeds a
pentation-computing Minsky machine.
