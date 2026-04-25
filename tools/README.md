[← Back](../README.md) | [English](README.md) | [Japanese](README-ja.md)

# tools — Maze Compilation Toolchain

Python utilities for compiling Haskell-style state machines into
repeated-maze port strings and for executing them.

## Subtools

- [hs2maze](hs2maze/README.md) — Convert a 2-register Haskell state
  machine into a maze string (`normal: ...; nx: ...; ny: ...`).
- [nd-to-2d](nd-to-2d/README.md) — Compile an *n*-register Haskell
  state machine into a 2-register Gödel-numbered Haskell, ready to be
  fed through `hs2maze`.
- [runhs](runhs/README.md) — Run a Haskell state machine (any arity)
  by wrapping it with a `main` driver and invoking `runghc`.

## Typical pipeline

```
(n-register Haskell)
   │  nd-to-2d/nd-to-2d.py
   ▼
(2-register Gödel Haskell)
   │  hs2maze/hs2maze.py
   ▼
(maze string: normal / nx / ny)
```

`runhs/runhs.py` is an orthogonal helper for quickly executing either
the *n*-register or 2-register Haskell and watching it halt.
