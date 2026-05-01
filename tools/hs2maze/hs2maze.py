#!/usr/bin/env python3
"""hs2maze.py -- Haskell -> repeated-maze via atomic-port (*1) decomposition.

Pipeline:
  1. Parse Haskell rules into atomic ports `Ca -> Cb (dx, dy)`.
  2. Decompose each atomic port via the (*1) mapping into a source-side
     port (in the source block) plus a destination-side port (in the
     destination block).  The dest's incoming edge is the direction
     opposite to the displacement, since the shared edge between blocks
     (X, Y) and (X-1, Y) is the source's W and the destination's E.

         Ca-Cb( 0,  0) -> Ca-Cb              (intra-block, no split)
         Ca-Cb(-1,  0) -> Ca-Wb  +  Eb-Cb
         Ca-Cb( 1,  0) -> Ca-Eb  +  Wb-Cb
         Ca-Cb( 0, -1) -> Ca-Sb  +  Nb-Cb
         Ca-Cb( 0,  1) -> Ca-Nb  +  Sb-Cb

  3. Default (non-directional): apply the daisy-chain pass per block-
     type port set.  For each connected component of the port graph,
     gather the W/E/N/S edge terminals, sort them counter-clockwise as
         S0..Sn, En..E0, Nn..N0, W0..Wn
     and emit ports between consecutive entries.  C terminals are
     dropped from the output.  Equivalent to the spec's per-Ca BFS
     because every Ca in one component yields the same Ra.

  4. With --directional: skip the daisy-chain.  Emit `->` arrows that
     keep C terminals (suitable for visualizers that draw Ck on a
     circle inside each block).

Block-type assignment:
  catch-all rule (no zero-branch): src + dst ports go to normal, nx, ny.
  zb='x' rule  (literal 0 in x slot): ports go to nx only.
  zb='y' rule  (literal 0 in y slot): ports go to ny only.
The (0, 0) corner is treated as ny (per the atomic convention) so a
ny drain HALT at (1, 1, *) lands inside ny's port set after the +1
register-to-block shift.

Maze coordinates: Haskell (x_reg, y_reg) -> block (x_reg + 1, y_reg + 1).
Start: Haskell (0, 1, 0)        -> block (1, 2, W0)   -- by convention
Goal:  Haskell (?, ?, 1) HALT   -> block (?, ?, W1).

Usage:
    python3 hs2maze.py FILE.hs                  (default: non-directional)
    python3 hs2maze.py FILE.hs --directional    (keep C terminals + arrows)
    python3 hs2maze.py FILE.hs -v               (also pretty-print to stderr)
"""

import re
import sys


VERSION = "2.0"

HELP_TEXT = """hs2maze v{version} -- Haskell state machine -> repeated-maze.

Usage:
  python3 hs2maze.py [FILE]                  default: directed `->`, C terminals kept
  python3 hs2maze.py [FILE] --undirected     undirected `-`, C terminals kept
  python3 hs2maze.py [FILE] --daisy          undirected `-`, C terminals dropped
                                             via the daisy-chain pass
  python3 hs2maze.py [FILE] -v               pretty-print rules to stderr
  python3 hs2maze.py --help | -h             show this help
  python3 hs2maze.py --version | -V          show version and exit

Output (stdout): a single maze line `normal: <ports>; nx: <ports>; ny: <ports>`.

Default mode emits directed `->` ports keeping C terminals — each
Haskell rule becomes a (*1)-decomposed C->edge / edge->C / cross
chain.  Solvers must follow the Haskell flow direction, so path length
matches the Haskell step count up to a constant factor (O(k^2) for
cp2-k, O(2^k) for md-k).  The two bridges `W0->C0` (entry) and
`C1->W1` (exit) anchor the maze start (0,0,W0) / goal (0,0,W1) to the
Haskell-level (0,0,C0) / (0,0,C1).

--undirected drops the direction but keeps C terminals.  BFS short-
circuits via reversed ports, so path length flattens to O(k).

--daisy applies the daisy-chain pass after (*1) decomposition: drops C
terminals, chains W/E/N/S terms in CCW order, also flattens to O(k).
Useful when downstream tooling can't parse C terminals.
""".format(version=VERSION)


def parse_expr(s):
    """Parse 'x+3', 'y-1', 'x', '_', '0' etc. -> (var_or_None, offset)."""
    s = s.strip()
    if s == '_':
        return ('_', 0)
    m = re.match(r'^([xy])([+-]\d+)?$', s)
    if m:
        var = m.group(1)
        off = int(m.group(2)) if m.group(2) else 0
        return (var, off)
    return (None, int(s))


def parse_file(text):
    """Parse Haskell rules into list of (pc_src, dx, dy, pc_dst, zb).
    zb is None / 'x' / 'y'."""
    rules = []
    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.split('--')[0].strip()
        if not line or '::' in line or '=' not in line:
            continue
        lhs, rhs = line.split('=', 1)
        lhs_m = re.search(r'\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)', lhs)
        rhs_m = re.search(r'\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)', rhs)
        if not lhs_m or not rhs_m:
            continue
        lx = parse_expr(lhs_m.group(1))
        ly = parse_expr(lhs_m.group(2))
        lpc = parse_expr(lhs_m.group(3))
        rx = parse_expr(rhs_m.group(1))
        ry = parse_expr(rhs_m.group(2))
        rpc = parse_expr(rhs_m.group(3))
        # Reject `r := k` (literal RHS that captures any value).
        for slot, lp, rp in (("x", lx, rx), ("y", ly, ry)):
            rhs_is_lit = rp[0] is None
            zero_passthrough = (
                rhs_is_lit and lp[0] is None and lp[1] == 0 and rp[1] == 0
            )
            if rhs_is_lit and not zero_passthrough:
                raise ValueError(
                    f"line {line_no}: immediate assignment "
                    f"{slot}:={rp[1]} is not supported by hs2maze "
                    f"(rewrite via INC/DEC chains, or compile through "
                    f"nd-to-2d.py first)"
                )
        pc_src = lpc[1]
        pc_dst = rpc[1]
        zb = None
        if lx[0] is None and lx[1] == 0:
            zb = 'x'
        elif ly[0] is None and ly[1] == 0:
            zb = 'y'
        dx = rx[1] if rx[0] in ('x', '_') else 0
        dy = ry[1] if ry[0] in ('y', '_') else 0
        rules.append((pc_src, dx, dy, pc_dst, zb))
    return rules


def decompose_atomic(pc_src, dx, dy, pc_dst):
    """Return (src_port, dst_port_or_None) per the (*1) mapping.
    Each port is a tuple (s_dir, s_idx, d_dir, d_idx).
    For (0, 0) the single intra-block port `Ca-Cb` is returned with
    dst_port = None."""
    if dx == 0 and dy == 0:
        return (('C', pc_src, 'C', pc_dst), None)
    if (dx, dy) == (-1, 0):
        return (('C', pc_src, 'W', pc_dst), ('E', pc_dst, 'C', pc_dst))
    if (dx, dy) == (1, 0):
        return (('C', pc_src, 'E', pc_dst), ('W', pc_dst, 'C', pc_dst))
    if (dx, dy) == (0, -1):
        return (('C', pc_src, 'S', pc_dst), ('N', pc_dst, 'C', pc_dst))
    if (dx, dy) == (0, 1):
        return (('C', pc_src, 'N', pc_dst), ('S', pc_dst, 'C', pc_dst))
    raise ValueError(
        f"unsupported displacement (dx={dx}, dy={dy}); "
        "only single-axis unit steps are supported"
    )


def build_block_sets(rules):
    """Distribute (*1)-decomposed ports across four block-type sets:
        normal -- (X >= 1, Y >= 1)
        nx     -- (X = 0,  Y >= 1)
        ny     -- (X >= 1, Y = 0)
        zero   -- (X = 0,  Y = 0)
    Catch-all rules (zb=None) fire regardless of X / Y, so they go
    to all four sets.  zb='x' (X=0 literal) fires at X=0 -> nx + zero.
    zb='y' (Y=0 literal) fires at Y=0 -> ny + zero."""
    sets = {'normal': [], 'nx': [], 'ny': [], 'zero': []}
    for pc_src, dx, dy, pc_dst, zb in rules:
        src_port, dst_port = decompose_atomic(pc_src, dx, dy, pc_dst)
        if zb is None:
            targets = ('normal', 'nx', 'ny', 'zero')
        elif zb == 'x':
            targets = ('nx', 'zero')
        else:
            targets = ('ny', 'zero')
        for bt in targets:
            sets[bt].append(src_port)
            if dst_port is not None:
                sets[bt].append(dst_port)
    return sets


_CCW_GROUP = {'S': 0, 'E': 1, 'N': 2, 'W': 3}


def ccw_key(term):
    """Sort key implementing the spec's CCW order
    S0..Sn, En..E0, Nn..N0, W0..Wn."""
    d, idx = term
    g = _CCW_GROUP[d]
    if g in (0, 3):
        return (g, idx)
    return (g, -idx)


def daisy_chain(ports):
    """Apply the daisy-chain pass to one block-type's port set.
    Returns a new port list with C terminals eliminated.  The start
    anchor `W0-C0` and goal anchor `W1-C1` are added to the normal set
    by the caller before this runs, so W0 and W1 land in C0's / C1's
    components and the daisy chain connects them to the rest."""
    adj = {}
    nodes = set()
    for sd, si, dd, di in ports:
        u = (sd, si)
        v = (dd, di)
        if u == v:
            continue
        nodes.add(u)
        nodes.add(v)
        adj.setdefault(u, set()).add(v)
        adj.setdefault(v, set()).add(u)

    visited = set()
    new_ports = []
    seen_chain = set()
    for start in nodes:
        if start in visited:
            continue
        comp = []
        stack = [start]
        while stack:
            u = stack.pop()
            if u in visited:
                continue
            visited.add(u)
            comp.append(u)
            for v in adj.get(u, ()):
                if v not in visited:
                    stack.append(v)
        edge_terms = sorted(
            (t for t in comp if t[0] != 'C'),
            key=ccw_key,
        )
        for i in range(len(edge_terms) - 1):
            u = edge_terms[i]
            v = edge_terms[i + 1]
            key = (u, v) if u < v else (v, u)
            if key in seen_chain:
                continue
            seen_chain.add(key)
            new_ports.append((u[0], u[1], v[0], v[1]))
    return new_ports


def render_undirected(ports):
    seen = set()
    out = []
    for sd, si, dd, di in ports:
        a = (sd, si)
        b = (dd, di)
        key = frozenset({a, b})
        if key in seen:
            continue
        seen.add(key)
        out.append(f"{sd}{si}-{dd}{di}")
    return ', '.join(out) if out else '(none)'


def render_directed(ports):
    seen = set()
    out = []
    for sd, si, dd, di in ports:
        key = (sd, si, dd, di)
        if key in seen:
            continue
        seen.add(key)
        out.append(f"{sd}{si}->{dd}{di}")
    return ', '.join(out) if out else '(none)'


def main():
    args = sys.argv[1:]
    daisy = False
    undirected = False
    verbose = False
    file_arg = None
    for a in args:
        if a in ('--help', '-h'):
            print(HELP_TEXT)
            return
        if a in ('--version', '-V'):
            print(f"hs2maze {VERSION}")
            return
        if a == '--daisy':
            daisy = True
        elif a == '--undirected':
            undirected = True
        elif a in ('-v', '--verbose'):
            verbose = True
        else:
            file_arg = a

    text = open(file_arg).read() if file_arg else sys.stdin.read()
    try:
        rules = parse_file(text)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
    if not rules:
        print("Error: no rules found", file=sys.stderr)
        sys.exit(1)

    if verbose:
        print(f"Parsed {len(rules)} atomic rules:", file=sys.stderr)
        for pc_src, dx, dy, pc_dst, zb in rules:
            extra = f"  [zb={zb}]" if zb else ""
            print(
                f"  C{pc_src} -> C{pc_dst} ({dx:+d},{dy:+d}){extra}",
                file=sys.stderr,
            )

    sets = build_block_sets(rules)
    # Bridges anchoring maze start (0,0,W0) and goal (0,0,W1) to the
    # Haskell-level (0,0,C0) / (0,0,C1).  Entry uses W0->C0 and exit
    # uses C1->W1.  Block (0,0) is `zero`, so the bridges go there;
    # added to all four sets for symmetry / robustness.
    for bt in ('normal', 'nx', 'ny', 'zero'):
        sets[bt].append(('W', 0, 'C', 0))   # entry: W0 -> C0
        sets[bt].append(('C', 1, 'W', 1))   # exit:  C1 -> W1

    if daisy:
        # Daisy-chain pass drops C terminals AND collapses multi-rule
        # chains into one short CCW chain, so the feature/atomic-style
        # O(k^2) path-length growth flattens to O(k).  Default off.
        sets = {bt: daisy_chain(ports) for bt, ports in sets.items()}
        renderer = render_undirected
    elif undirected:
        # Keep C terminals but render `-` (both directions usable).
        # BFS finds shortest path regardless of Haskell flow, so path
        # length is also linear in k — useful for visual debugging.
        renderer = render_undirected
    else:
        # Default: directed `->` so each (*1) edge is one-way and the
        # walker has to follow the Haskell rule chain.  Path length
        # matches the Haskell step count up to a constant factor and
        # preserves O(k^2) for cp2-k / O(2^k) for md-k.
        renderer = render_directed

    if verbose:
        for bt in ('normal', 'nx', 'ny', 'zero'):
            print(
                f"{bt}: {len(sets[bt])} ports",
                file=sys.stderr,
            )

    parts = [
        f"normal: {renderer(sets['normal'])}",
        f"nx: {renderer(sets['nx'])}",
        f"ny: {renderer(sets['ny'])}",
        f"zero: {renderer(sets['zero'])}",
    ]
    print('; '.join(parts))


if __name__ == '__main__':
    main()
