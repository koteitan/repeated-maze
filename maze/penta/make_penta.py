#!/usr/bin/env python3
"""make_penta.py — Generate penta.hs for hs2maze.

Implements penta.md's 2-register Gödel-encoded pentation Minsky machine:
  x = 2^a * 3^b * 5^c * 7^d * 11^e * f  (f in {1, 13, 17, 19})

14 rules (Fractran-style) applied in first-match order. Each rule:
  - Tests non-divisibility conditions for listed primes (non-destructive)
  - Divides by denominator, multiplies by numerator
  - Loops back to main dispatcher

Usage: python3 make_penta.py [initial_a] > penta.hs
  initial_a: exponent of 2 in input Gödel number.
             penta(2^initial_a) = 3^(2↑↑↑initial_a).
             Default 1. For 0, result=1 (immediate HALT).
             For 2, result = 3^(2^16) (huge).

Output: Haskell state machine consumable by hs2maze.py, plus
        stderr comment block listing required nx/ny/bridge ports.
"""

import sys

# ---------------------------------------------------------------------------
# Rule table (penta.md, Fractran form)
# Each rule: (non-divisibility-test-primes, action-ops, is_halt_rule)
# Actions decomposed: (a/b) * x  =  div_b then mul_(prime factors of a)
# ---------------------------------------------------------------------------

RULES = [
    (['2', '5'],        [],                                          True),   # Rule 1: HALT
    (['3', '5', '13'],  [('div', 2), ('mul', 3), ('mul', 3)],        False),  # 9/2
    (['5', '7', '13'],  [('div', 3), ('mul', 5), ('mul', 5)],        False),  # 25/3
    (['3', '13'],       [('div', 2), ('mul', 13)],                   False),  # 13/2
    (['7', '11', '13'], [('div', 5), ('mul', 7), ('mul', 7)],        False),  # 49/5
    (['5', '13'],       [('div', 3), ('mul', 17)],                   False),  # 17/3
    (['7', '13'],       [('div', 5), ('mul', 19)],                   False),  # 19/5
    (['13'],            [('div', 7), ('mul', 11), ('mul', 11)],      False),  # 121/7
    (['5', '17'],       [('div', 13)],                               False),  # 1/13
    (['17'],            [('div', 5), ('mul', 3)],                    False),  # 3/5
    (['7', '19'],       [('div', 17)],                               False),  # 1/17
    (['19'],            [('div', 7), ('mul', 5)],                    False),  # 5/7
    (['11'],            [('div', 19)],                               False),  # 1/19
    ([],                [('div', 11), ('mul', 7)],                   False),  # 7/11 (default)
]


# ---------------------------------------------------------------------------
# Code generator
# ---------------------------------------------------------------------------

class Gen:
    def __init__(self):
        self.pc_next = 2  # pc 0 reserved for start, pc 1 for HALT (hs2maze convention)
        self.lines = []   # Haskell body lines (sorted later by pc)
        self.emitted = {} # pc -> line, for sorted output
        self.nx_ports = []  # list of (src_pc, dst_pc)
        self.ny_ports = []  # list of (src_pc, dst_pc)

    def new_pc(self):
        p = self.pc_next
        self.pc_next += 1
        return p

    def emit(self, pc, dx, dy, dst):
        def fmt(v, var):
            if v > 0:
                return f"{var}+{v}"
            if v < 0:
                return f"{var}{v}"
            return var
        dxs = fmt(dx, 'x')
        dys = fmt(dy, 'y')
        self.emitted[pc] = f"penta (x, y, {pc:5d}) = penta ({dxs:>4s}, {dys:>4s}, {dst:5d})"

    def emit_noop(self, pc, dst):
        self.emit(pc, 0, 0, dst)

    # ------------------------------------------------------------------
    # mul_p: x := p * x using y as temp. Assumes y = 0. Exits to exit_pc.
    # PCs used: entry + p (incy chain) + stage2_decy + stage2_incx = p + 3
    # ------------------------------------------------------------------
    def mul_p(self, p, exit_pc):
        entry = self.new_pc()
        incy = [self.new_pc() for _ in range(p)]
        s2_decy = self.new_pc()
        s2_incx = self.new_pc()

        # Stage 1: DEC x; if x=0 go to stage 2; else INC y p times and loop.
        self.emit(entry, -1, 0, incy[0])
        self.nx_ports.append((entry, s2_decy))

        for i in range(p):
            nxt = incy[i + 1] if i + 1 < p else entry
            self.emit(incy[i], 0, 1, nxt)

        # Stage 2: DEC y, INC x, loop; exit via ny.
        self.emit(s2_decy, 0, -1, s2_incx)
        self.ny_ports.append((s2_decy, exit_pc))
        self.emit(s2_incx, 1, 0, s2_decy)

        return entry

    # ------------------------------------------------------------------
    # div_p: x := x / p (assumes p | x). Assumes y = 0. Exits to exit_pc.
    # On unexpected (p ∤ x) it traps to trap_pc (which self-loops).
    # PCs used: p (dec chain) + 1 (incy) + 2 (stage2) = p + 3
    # ------------------------------------------------------------------
    def div_p(self, p, exit_pc, trap_pc):
        entry = self.new_pc()
        decs = [entry] + [self.new_pc() for _ in range(p - 1)]
        incy = self.new_pc()
        s2_decy = self.new_pc()
        s2_incx = self.new_pc()

        for i in range(p):
            nxt = decs[i + 1] if i + 1 < p else incy
            self.emit(decs[i], -1, 0, nxt)
            # nx: x=0 at first DEC means done; at mid-chain means unexpected.
            self.nx_ports.append((decs[i], s2_decy if i == 0 else trap_pc))

        self.emit(incy, 0, 1, decs[0])
        self.emit(s2_decy, 0, -1, s2_incx)
        self.ny_ports.append((s2_decy, exit_pc))
        self.emit(s2_incx, 1, 0, s2_decy)
        return entry

    # ------------------------------------------------------------------
    # test_ndiv(p, pass_pc, fail_pc): NON-DESTRUCTIVE test of p ∤ x.
    # If p ∤ x: restore x and goto pass_pc.
    # If p | x: restore x and goto fail_pc.
    # PCs used: O(p^2) due to restore subroutines per k ∈ [0, p-1].
    # ------------------------------------------------------------------
    def test_ndiv(self, p, pass_pc, fail_pc):
        entry = self.new_pc()
        decs = [entry] + [self.new_pc() for _ in range(p - 1)]
        incy = self.new_pc()

        # Generate p restore subroutines. Each reconstructs x = y*p + k.
        restores = []
        for k in range(p):
            exit_tgt = fail_pc if k == 0 else pass_pc
            decy = self.new_pc()
            incxs = [self.new_pc() for _ in range(p)]
            extras = [self.new_pc() for _ in range(k)]  # INC x k more times after y=0

            self.emit(decy, 0, -1, incxs[0])
            ny_dst = exit_tgt if k == 0 else extras[0]
            self.ny_ports.append((decy, ny_dst))

            for i in range(p):
                nxt = incxs[i + 1] if i + 1 < p else decy
                self.emit(incxs[i], 1, 0, nxt)

            for i in range(k):
                nxt = extras[i + 1] if i + 1 < k else exit_tgt
                self.emit(extras[i], 1, 0, nxt)

            restores.append(decy)

        # Main DEC chain
        for i in range(p):
            nxt = decs[i + 1] if i + 1 < p else incy
            self.emit(decs[i], -1, 0, nxt)
            self.nx_ports.append((decs[i], restores[i]))

        self.emit(incy, 0, 1, decs[0])
        return entry

    # ------------------------------------------------------------------
    # drain_x(exit_pc): DEC x until x=0, then goto exit_pc.
    # ------------------------------------------------------------------
    def drain_x(self, exit_pc):
        entry = self.new_pc()
        self.emit(entry, -1, 0, entry)
        self.nx_ports.append((entry, exit_pc))
        return entry

    # ------------------------------------------------------------------
    # gen_action(ops, main_pc, trap_pc): emit a sequential chain of
    # mul/div subroutines. Last op exits to main_pc.
    # Returns entry pc of the first op (or main_pc if ops is empty).
    # ------------------------------------------------------------------
    def gen_action(self, ops, main_pc, trap_pc):
        if not ops:
            return main_pc
        # Reserve an exit pc for each op (so we can thread forward refs).
        op_entries = []
        exits = []
        for _ in ops:
            exits.append(self.new_pc())
        # Each op's "exit" pc is a noop that forwards to next op (or main).
        for i in range(len(ops)):
            nxt = exits[i + 1] if i + 1 < len(ops) else main_pc
            self.emit_noop(exits[i], nxt)
        # Now generate each op pointing to its exit.
        for i, (op, p) in enumerate(ops):
            exit_pc = exits[i]
            if op == 'mul':
                entry = self.mul_p(p, exit_pc)
            else:  # div
                entry = self.div_p(p, exit_pc, trap_pc)
            op_entries.append(entry)
        # Chain: first op's entry is the start. Intermediate ops chain via exits.
        # But exits[i] forwards to next op's entry, not its exit. Fix:
        for i in range(len(ops) - 1):
            self.emit_noop(exits[i], op_entries[i + 1])
        self.emit_noop(exits[-1], main_pc)
        return op_entries[0]


# ---------------------------------------------------------------------------
# Build the whole machine
# ---------------------------------------------------------------------------

def build(initial_a):
    g = Gen()

    # Allocate the anchor pcs first so later code can reference them.
    # pc=0 (start) and pc=1 (HALT) are hardcoded.
    main_pc = g.new_pc()
    trap_pc = g.new_pc()
    g.emit_noop(trap_pc, trap_pc)  # infinite self-loop for unexpected cases

    # Rule entry pcs (forward references).
    rule_entries = [g.new_pc() for _ in RULES]

    # pc=0: DEC y (Minsky y=1 → 0), then goto setup.
    setup_entry = g.new_pc()
    g.emit(0, 0, -1, setup_entry)
    g.ny_ports.append((0, trap_pc))  # y=0 at pc=0 shouldn't happen

    # Setup: INC x initial_a times, then jump to main_pc.
    if initial_a == 0:
        g.emit_noop(setup_entry, main_pc)
    else:
        cur = setup_entry
        for i in range(initial_a):
            nxt = g.new_pc() if i + 1 < initial_a else main_pc
            g.emit(cur, 1, 0, nxt)
            cur = nxt

    # main_pc -> rule_entries[0]
    g.emit_noop(main_pc, rule_entries[0])

    # Process each rule.
    for idx, (ndiv_primes, action, is_halt) in enumerate(RULES):
        entry = rule_entries[idx]
        next_rule = rule_entries[idx + 1] if idx + 1 < len(RULES) else trap_pc

        if is_halt:
            # HALT rule: test conditions; if all pass, drain x, INC y, goto pc=1.
            halt_drain_pc = g.new_pc()
            halt_sety_pc = g.new_pc()

            # Drain x: self-loop DEC x; when x=0, goto halt_sety_pc.
            g.emit(halt_drain_pc, -1, 0, halt_drain_pc)
            g.nx_ports.append((halt_drain_pc, halt_sety_pc))

            # Set y := 1 (from 0) and goto pc=1.
            g.emit(halt_sety_pc, 0, 1, 1)

            # Chain of ndiv tests. Last test's pass goes to halt_drain_pc.
            if not ndiv_primes:
                g.emit_noop(entry, halt_drain_pc)
            else:
                cur_entry = entry
                for j, pstr in enumerate(ndiv_primes):
                    p_int = int(pstr)
                    if j + 1 < len(ndiv_primes):
                        nxt_entry = g.new_pc()
                        test_entry = g.test_ndiv(p_int, pass_pc=nxt_entry,
                                                 fail_pc=next_rule)
                        g.emit_noop(cur_entry, test_entry)
                        cur_entry = nxt_entry
                    else:
                        test_entry = g.test_ndiv(p_int, pass_pc=halt_drain_pc,
                                                 fail_pc=next_rule)
                        g.emit_noop(cur_entry, test_entry)
        else:
            # Non-HALT rule: emit action first (it needs exit = main_pc).
            action_entry = g.gen_action(action, main_pc, trap_pc)

            # Chain of ndiv tests. Last test's pass goes to action_entry.
            if not ndiv_primes:
                g.emit_noop(entry, action_entry)
            else:
                cur_entry = entry
                for j, pstr in enumerate(ndiv_primes):
                    p_int = int(pstr)
                    if j + 1 < len(ndiv_primes):
                        nxt_entry = g.new_pc()
                        test_entry = g.test_ndiv(p_int, pass_pc=nxt_entry,
                                                 fail_pc=next_rule)
                        g.emit_noop(cur_entry, test_entry)
                        cur_entry = nxt_entry
                    else:
                        test_entry = g.test_ndiv(p_int, pass_pc=action_entry,
                                                 fail_pc=next_rule)
                        g.emit_noop(cur_entry, test_entry)

    return g


def format_output(g, initial_a):
    header = [
        f"-- penta.hs: Gödel-encoded 2-register Minsky machine computing pentation.",
        f"-- Generated by make_penta.py (initial_a={initial_a}).",
        f"-- Input: x = 2^{initial_a} at (0, 1, E, 0).",
        f"-- Output: halts with x Gödel-encoding penta result, then drained to x=0.",
        f"--",
        f"-- 14 Fractran-style rules from penta.md:",
    ]
    for idx, (nd, act, halt) in enumerate(RULES):
        if halt:
            desc = "HALT"
        else:
            parts = []
            for op, p in act:
                parts.append(f"/{p}" if op == 'div' else f"*{p}")
            desc = " then ".join(parts)
        cond = " ∧ ".join(f"{p}∤x" for p in nd) if nd else "(default)"
        header.append(f"--   Rule {idx + 1:2d}: {cond:30s} → {desc}")
    header.append(f"--")
    header.append(f"-- Total pc count: {g.pc_next - 2} (pc 0, 1 reserved; allocated 2..{g.pc_next - 1})")
    header.append(f"--")
    header.append(f"-- Required nx ports (manual, since hs2maze does not generate):")
    for src, dst in g.nx_ports:
        header.append(f"--   nx: E{src}-E{dst}")
    header.append(f"--")
    header.append(f"-- Required ny ports + bridges (manual):")
    for src, dst in g.ny_ports:
        header.append(f"--   ny: N_{{chain intermediate of pc={src}}}-N_{{fresh}}; bridge S_{{fresh}}-W{dst}")
    header.append(f"--")
    header.append(f"-- Usage: python3 hs2maze.py penta.hs  (then add nx/ny/bridge manually)")
    header.append("")
    header.append(f"penta :: (Int, Int, Int) -> (Int, Int, Int)")
    header.append("")

    body = [g.emitted[pc] for pc in sorted(g.emitted)]
    return "\n".join(header + body) + "\n"


def main():
    initial_a = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    if initial_a < 0:
        print("initial_a must be >= 0", file=sys.stderr)
        sys.exit(1)
    g = build(initial_a)
    print(format_output(g, initial_a), end='')
    print(f"[make_penta] Generated {g.pc_next - 2} pc values, "
          f"{len(g.nx_ports)} nx ports, {len(g.ny_ports)} ny ports.",
          file=sys.stderr)


if __name__ == '__main__':
    main()
