#!/usr/bin/env python3
"""count-steps.py — Exactly run a 2-register Gödel Haskell file (the output
of nd-to-2d.py) from (x, y, pc) = (0, 1, 0) to pc 1, and count its steps.

A pc whose generic rule (x > 0, y > 0) leads back to itself through a cycle
is repeated k times at once, where k is the largest count for which every
step of the cycle still takes its generic rule.  So a loop over a huge
Gödel number costs one big-integer update instead of one step per unit.

Prints the number of moves S (steps with dx or dy != 0) and of all steps.
The shortest path of the maze from hs2maze.py has length about 2S.

Usage: python3 count-steps.py FILE-2d.hs
"""
import re
import sys

sys.set_int_max_str_digits(0)
rules = {}
for line in open(sys.argv[1]):
    m = re.match(r'\s*godel\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\d+)\s*\)\s*=\s*(godel)?\s*\(\s*([^,]+),([^,]+),([^)]+)\)', line)
    if not m: continue
    def d(e, v):
        e = e.strip().replace(' ', '')
        if e in (v, '0'): return 0
        return int(e[len(v):])
    rules.setdefault(int(m.group(3)), []).append(
        (m.group(1) == '0', m.group(2) == '0', d(m.group(5), 'x'), d(m.group(6), 'y'), int(m.group(7))))
def pick(pc, x, y):
    for zx, zy, dx, dy, dst in rules[pc]:
        if (zx and x != 0) or (zy and y != 0): continue
        return dx, dy, dst
    raise SystemExit(f"no rule pc={pc}")
# generic successor (x > 0, y > 0) and whether a pc tests x / y
gen, tx, ty = {}, {}, {}
for pc, rs in rules.items():
    tx[pc] = any(r[0] for r in rs); ty[pc] = any(r[1] for r in rs)
    for zx, zy, dx, dy, dst in rs:
        if not zx and not zy: gen[pc] = (dx, dy, dst); break
cyc = {}
for p0 in rules:
    if p0 not in gen: continue
    seq, ox, oy, pc = [], 0, 0, p0
    for _ in range(400):
        if pc not in gen: break
        dx, dy, dst = gen[pc]
        seq.append((pc, ox, oy, dx, dy)); ox += dx; oy += dy; pc = dst
        if pc == p0: break
    if pc == p0 and seq:
        mv = sum(1 for s in seq if s[3] or s[4])
        cyc[p0] = (seq, ox, oy, len(seq), mv)
x, y, pc = 0, 1, 0
steps = moves = 0
while pc != 1:
    if pc in cyc:
        seq, DX, DY, ln, mv = cyc[pc]
        k = None
        for (q, ox, oy, dx, dy) in seq:
            for need, v, o, D in ((tx[q] or dx < 0, x, ox, DX), (ty[q] or dy < 0, y, oy, DY)):
                if not need: continue
                base = v + o
                if base < 1: k = 0; break
                if D < 0:
                    kk = (base - 1) // (-D) + 1
                    k = kk if k is None else min(k, kk)
            if k == 0: break
        if k is None: raise SystemExit(f"infinite loop at pc={pc}")
        if k >= 2:
            x += k * DX; y += k * DY; steps += k * ln; moves += k * mv
            continue
    dx, dy, pc = pick(pc, x, y)
    x += dx; y += dy; steps += 1; moves += dx != 0 or dy != 0
    if x < 0 or y < 0: raise SystemExit("negative")
def show(name, v):
    t = str(v)
    if len(t) <= 40:
        print(f"{name}: {t}")
    else:
        print(f"{name}: {t[:20]}...{t[-10:]} ({len(t)} digits)")


show("moves S", moves)
show("steps  ", steps)
