#!/usr/bin/env python3
"""hs2maze.py -- Convert Haskell-style state machine to undirected repeated-maze.

Input format (stdin or file):
    myfunc :: (Int, Int, Int) -> (Int, Int, Int)
    myfunc (x, y, 0) = myfunc (x+1, y,   1)
    myfunc (x, y, 1) = myfunc (x, y+3,   2)
    myfunc (x, y, 2) = myfunc (x-1,  y,   0)

Each line: (x_expr, y_expr, pc_literal) = func (x_expr, y_expr, pc_literal)
  - x_expr: x, x+k, x-k, or _ (unchanged), or literal 0 (zero-branch LHS)
  - y_expr: y, y+k, y-k, or _ (unchanged), or literal 0 (zero-branch LHS)
  - pc_literal: integer
  - Only ONE of dx, dy may be nonzero per line (for non-zero-branch rules).

Zero-branch rules (literal 0 on LHS):
    myfunc (0, y, p) = myfunc (0, y, q)    -- nx port: E_p-E_q (fires at x=0)
    myfunc (x, 0, p) = myfunc (x, 0, q)    -- ny port + bridge (fires at y=0)

  The ny form requires pc p to also have a non-zero-branch y± rule so
  that hs2maze can locate the N/S chain intermediate to redirect.

Mapping to undirected maze:
  All user pc values map to E/W terminal indices.
  Canonical state: (x, y, E, pc) -- always E-type.

  Movement costs in maze steps:
    x+k:  k   steps  (chain of W-E ports)
    x-k:  k   steps  (chain of E-W ports)
    y+k:  k+1 steps  (W-N, (k-1) S-N, S-W)
    y-k:  k+1 steps  (W-S, (k-1) N-S, N-W)
    noop: 2   steps  (W-E, E-W)

  Start: W0@(1,1) = E0@(0,1) -> user pc=0
  Goal:  W1@(1,1) = E1@(0,1) -> user pc=1

Usage: python3 hs2maze.py [input.hs]
  Reads from stdin if no file given.
  Outputs undirected maze string to stdout, diagnostics to stderr.
"""

import re
import sys


VERSION = "0.2"

HELP_TEXT = """hs2maze v{version} — Haskell state machine → repeated-maze converter.

Usage:
  python3 hs2maze.py [FILE]          read Haskell from FILE (or stdin)
  python3 hs2maze.py --help | -h     show this help
  python3 hs2maze.py --version | -V  show the version and exit

Input: a Haskell-style state machine over (x, y, pc) registers.  Each
equation `FN (pat_x, pat_y, pat_pc) = FN (rhs_x, rhs_y, rhs_pc)` becomes
a maze port chain.  A literal `0` on the LHS in the x or y slot flags
the equation as a zero-branch rule (nx / ny + bridge).  See README.md
for the full grammar.

Output (stdout): a single maze string of the form
    normal: <ports>; nx: <ports>; ny: <ports>
Diagnostics (stderr): parsed transitions and generated port counts.
""".format(version=VERSION)


def parse_expr(s):
    """Parse 'x+3', 'y-1', 'x', '_', '0' etc."""
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
    """Parse Haskell-style function definitions.
    Returns list of (pc_src, dx, dy, pc_dst, zero_branch),
    where zero_branch is None, 'x', or 'y'.

    Raises ValueError on an immediate-assignment RHS (literal in a slot
    that captures any value), since hs2maze cannot emit `r := k` directly.
    The only allowed (literal-LHS, literal-RHS) pair is (0, 0), the
    zero-branch passthrough used to mark nx / ny rules.
    """
    transitions = []
    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.split('--')[0].strip()
        if not line or '::' in line:
            continue
        if '=' not in line:
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
        # Reject immediate assignment: a literal in the RHS slot when the
        # corresponding LHS does not also pin that slot to the same literal 0.
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
        # Detect literal-0 LHS as zero-branch marker.
        zero_branch = None
        if lx[0] is None and lx[1] == 0:
            zero_branch = 'x'
        elif ly[0] is None and ly[1] == 0:
            zero_branch = 'y'
        dx = rx[1] if rx[0] in ('x', '_') else 0
        dy = ry[1] if ry[0] in ('y', '_') else 0
        transitions.append((pc_src, dx, dy, pc_dst, zero_branch))
    return transitions


class PortGenerator:
    """Generate maze ports from state machine transitions.

    Produces three port buckets:
      - normal: in-block ports for normal blocks (x>=1, y>=1).
      - nx:     in-block ports for nx boundary blocks (x=0).
      - ny:     in-block ports for ny boundary blocks (y=0).
    Bridges (normal ports feeding a ny redirect back into the normal region)
    are merged into `normal`.
    """

    def __init__(self, transitions):
        self.transitions = transitions
        max_pc = max(max(t[0], t[3]) for t in transitions)
        self.next_ew = max_pc + 1   # E/W terminal allocator
        self.next_ns = 0            # N/S terminal allocator
        self.normal = []
        self.nx = []
        self.ny = []
        # For y-zero branches we need the N/S chain intermediate that the
        # non-zero-branch y± chain allocated.  Populated during pass 1.
        self.y_chain_head = {}      # pc_src → first allocated N/S index

    def alloc_ew(self):
        idx = self.next_ew
        self.next_ew += 1
        return idx

    def alloc_ns(self):
        idx = self.next_ns
        self.next_ns += 1
        return idx

    def generate(self):
        # Pass 1: non-zero-branch transitions.
        for pc_src, dx, dy, pc_dst, zb in self.transitions:
            if zb is not None:
                continue
            if dx != 0 and dy != 0:
                raise ValueError(
                    f"pc={pc_src}: both dx={dx} and dy={dy} nonzero. "
                    "Split into separate x and y steps.")
            if dx > 0:
                self._x_plus(pc_src, dx, pc_dst)
            elif dx < 0:
                self._x_minus(pc_src, -dx, pc_dst)
            elif dy > 0:
                self._y_plus(pc_src, dy, pc_dst)
            elif dy < 0:
                self._y_minus(pc_src, -dy, pc_dst)
            else:
                self._noop(pc_src, pc_dst)
        # Pass 2: zero-branch transitions.
        for pc_src, dx, dy, pc_dst, zb in self.transitions:
            if zb is None:
                continue
            if zb == 'x':
                # At x=0 nx block: redirect E_pc_src → E_pc_dst.
                self.nx.append(('E', pc_src, 'E', pc_dst))
            else:  # zb == 'y'
                t = self.y_chain_head.get(pc_src)
                if t is None:
                    raise ValueError(
                        f"pc={pc_src}: y-zero branch has no paired y± chain "
                        f"(add a non-literal-0 rule for the same pc)")
                fresh = self.alloc_ns()
                # ny-block port: redirect N_t → N_fresh.
                self.ny.append(('N', t, 'N', fresh))
                # Bridge in normal block: S_fresh → W_pc_dst.
                self.normal.append(('S', fresh, 'W', pc_dst))
        return self.normal, self.nx, self.ny

    def _x_plus(self, src, k, dst):
        cur = src
        for i in range(k):
            nxt = dst if i == k - 1 else self.alloc_ew()
            self.normal.append(('W', cur, 'E', nxt))
            cur = nxt

    def _x_minus(self, src, k, dst):
        cur = src
        for i in range(k):
            nxt = dst if i == k - 1 else self.alloc_ew()
            self.normal.append(('E', cur, 'W', nxt))
            cur = nxt

    def _y_plus(self, src, k, dst):
        t = self.alloc_ns()
        self.y_chain_head[src] = t
        self.normal.append(('W', src, 'N', t))
        for _ in range(k - 1):
            t_new = self.alloc_ns()
            self.normal.append(('S', t, 'N', t_new))
            t = t_new
        self.normal.append(('S', t, 'W', dst))

    def _y_minus(self, src, k, dst):
        t = self.alloc_ns()
        self.y_chain_head[src] = t
        self.normal.append(('W', src, 'S', t))
        for _ in range(k - 1):
            t_new = self.alloc_ns()
            self.normal.append(('N', t, 'S', t_new))
            t = t_new
        self.normal.append(('N', t, 'W', dst))

    def _noop(self, src, dst):
        tmp = self.alloc_ew()
        self.normal.append(('W', src, 'E', tmp))
        self.normal.append(('E', tmp, 'W', dst))


def ports_to_maze_string(normal, nx, ny):
    """Render the three port buckets as a maze-string."""
    def render(ports):
        seen = set()
        out = []
        for sd, si, dd, di in ports:
            key = (sd, si, dd, di)
            if key in seen:
                continue
            seen.add(key)
            out.append(f"{sd}{si}-{dd}{di}")
        return ', '.join(out) if out else '(none)'
    return (
        f"normal: {render(normal)}; "
        f"nx: {render(nx)}; "
        f"ny: {render(ny)}"
    )


def main():
    args = sys.argv[1:]
    if any(a in ("--help", "-h") for a in args):
        print(HELP_TEXT)
        return
    if any(a in ("--version", "-V") for a in args):
        print(f"hs2maze {VERSION}")
        return
    if args:
        with open(args[0]) as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    try:
        transitions = parse_file(text)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)
    if not transitions:
        print("Error: no transitions found", file=sys.stderr)
        sys.exit(1)

    print(f"Parsed {len(transitions)} transitions:", file=sys.stderr)
    for pc_src, dx, dy, pc_dst, zb in transitions:
        s = f"  pc={pc_src} -> pc={pc_dst}"
        if dx: s += f"  dx={dx:+d}"
        if dy: s += f"  dy={dy:+d}"
        if not dx and not dy and zb is None: s += "  (noop)"
        if zb: s += f"  [zero-branch {zb}=0]"
        print(s, file=sys.stderr)

    gen = PortGenerator(transitions)
    normal, nx, ny = gen.generate()
    nterm = max(gen.next_ew, gen.next_ns)
    total = len(normal) + len(nx) + len(ny)

    print(
        f"Generated {total} ports "
        f"(normal: {len(normal)}, nx: {len(nx)}, ny: {len(ny)}), nterm={nterm}",
        file=sys.stderr,
    )
    maze_str = ports_to_maze_string(normal, nx, ny)
    print(maze_str)


if __name__ == '__main__':
    main()
