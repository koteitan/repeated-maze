# Epic 4 v2: 9-Area Block Structure Test Design

## Overview

Tests for the 9-area block structure defined in `epic/4/spec-v2.md`.
The spec replaces the current flat grid layout (diagonal2) with a structured block
composed of 9 areas: 4 corner blanks (1,3,7,9), 4 sub-terminal areas (2,4,6,8),
and a central routing area (5) with sub-areas 5a, 5b, 5c.

Target function: new `routeBlockPorts()` implementing spec-v2 (to be implemented).
Test script: `epic/4/test/test-v2.js` (to be implemented after this design).

---

## Test Categories

### Category A: Reachability Tests

For each port, verify that the generated route connects the source terminal edge
to the destination terminal edge, traversing through the correct sub-terminal areas
and the routing area (5).

### Category B: Overlap Tests

For each sub-block cell in the entire block, verify that no two sub-ports from
different routes occupy the same cell in the same direction. H+V crossing is the
only permitted overlap.

---

## Test Case Definitions

### TC-R1: Reachability - Basic Path Connectivity

| Item | Description |
|------|-------------|
| Purpose | Verify that each route forms a connected path from src terminal edge to dst terminal edge |
| Input | Port list, nterm, cellSize |
| Output | routes array from routeBlockPorts |

#### Verification Procedure

For each port i with route R_i:
1. R_i has at least 2 points
2. Consecutive points in R_i are orthogonal (dx=0 or dy=0, never both nonzero)
3. First point of R_i lies on the source terminal's block edge:
   - W: x = 0
   - E: x = cellSize
   - N: y = 0
   - S: y = cellSize
4. Last point of R_i lies on the destination terminal's block edge:
   - Same edge conditions as above
5. The route passes through the correct sub-terminal area for source and destination

#### Pass Criteria

- All routes are connected paths (no gaps between consecutive points)
- All routes start on the correct src edge and end on the correct dst edge
- All route segments are orthogonal (H or V only)

---

### TC-R2: Reachability - Sub-Terminal Branching Integrity

| Item | Description |
|------|-------------|
| Purpose | Verify that sub-terminal areas (2,4,6,8) correctly branch from a single terminal to multiple channels |
| Input | Port configurations where multiple ports share the same terminal |
| Output | spines, junctions from routeBlockPorts |

#### Verification Procedure

For each terminal T with k ports (k >= 2):
1. A spine segment exists connecting T's block edge to the first channel position (edge spine)
2. A branch spine covers all k channel positions
3. Exactly k-1 junction points exist along the branch spine
4. Each junction connects exactly one route to the spine
5. The branching follows the spec pattern:
   - Top: L-shaped (connects last channel)
   - Middle: T-shaped (connects to both directions + route)
   - Bottom: T-shaped (connects to edge + direction + route)

#### Pass Criteria

- Edge spine connects block boundary to first channel
- Branch spine spans from first to last channel
- Junction count = (number of channels) - 1
- All channel positions are reachable from the terminal edge via spine

---

### TC-R3: Reachability - Area 5 Routing Correctness

| Item | Description |
|------|-------------|
| Purpose | Verify routing through area 5 sub-areas (5a, 5b, 5c) follows spec algorithms |
| Input | Various port configurations |
| Output | routes from routeBlockPorts |

#### Verification Procedure

For each port, check routing path matches expected area:
1. **W->N ports (area 5a)**: Route exits W sub-terminal rightward, turns up at dst N sub-terminal's x position
2. **W->S ports (area 5a + 5c)**: Route exits W sub-terminal rightward, turns down at dst S sub-terminal's x position, continues through area 5c
3. **W->E ports (area 5b)**: Route exits W sub-terminal rightward, uses S-bend algorithm in area 5b, connects to E sub-terminal
4. **E->S ports (area 5c)**: Route exits E sub-terminal leftward into area 5c, uses column-shift algorithm, connects to S sub-terminal
5. **N->E, N->S, etc.**: Analogous checks for other direction combinations

#### Pass Criteria

- W->N routes have exactly one L-bend (H then V)
- W->E routes use the area 5b S-bend algorithm when needed
- E->S routes use the area 5c column-shift algorithm when needed
- No route passes through a corner area (1,3,7,9) except as blank space

---

### TC-O1: Overlap - Same-Direction Cell Exclusion

| Item | Description |
|------|-------------|
| Purpose | Verify no two sub-ports from different routes share the same sub-block cell in the same direction |
| Input | Port list, nterm, cellSize |
| Output | Full sub-block grid with direction flags |

#### Verification Procedure

1. For each sub-block cell (r, c), track which routes place H segments and which place V segments
2. For each cell:
   - If 2+ different routes have H segments: **FAIL** (H+H overlap)
   - If 2+ different routes have V segments: **FAIL** (V+V overlap)
   - If one route has H and another has V: **OK** (crossing, H+V allowed)
3. Sub-terminal endpoint cells are excluded from this check (shared by design)

#### Pass Criteria

- Zero H+H overlaps across all sub-block cells
- Zero V+V overlaps across all sub-block cells
- overlaps array returned by routeBlockPorts is empty

---

### TC-O2: Overlap - Pixel-Level Segment Collision

| Item | Description |
|------|-------------|
| Purpose | Verify no same-direction segment overlap at pixel level (routes + spines) |
| Input | routes and spines from routeBlockPorts |
| Output | Overlap counts (RR, SS, RS) |

#### Verification Procedure

Collect all segments (route segments + spine segments):
1. For each pair of segments (A, B):
   - If both H and on the same y: check x-range overlap
   - If both V and on the same x: check y-range overlap
   - If H+V: crossing, not an overlap
2. Range overlap = max(0, min(a2,b2) - max(a1,b1)) where range > epsilon (0.01)

#### Pass Criteria

- Route-Route (RR) overlap count = 0
- Spine-Spine (SS) overlap count = 0
- Route-Spine (RS) overlap count = 0

---

### TC-O3: Overlap - Area 5b S-Bend Non-Collision

| Item | Description |
|------|-------------|
| Purpose | Verify the area 5b S-bend avoidance algorithm works correctly when multiple W->E ports compete for the same row |
| Input | Port configurations with multiple W->E ports targeting different E sub-terminals |

#### Verification Procedure

For W->E ports routed through area 5b:
1. When destination E sub-terminal row = source row: route is straight horizontal (no S-bend)
2. When destination row is occupied by another port: S-bend uses x, x+1 columns to shift
3. When destination row is empty: single-column shift to reach target row
4. Verify no two S-bends share the same intermediate columns in conflicting directions

#### Pass Criteria

- All W->E routes reach their target E sub-terminal
- No H+H or V+V overlap in area 5b
- S-bend column counter increments correctly

---

### TC-O4: Overlap - Area 5c Column-Shift Non-Collision

| Item | Description |
|------|-------------|
| Purpose | Verify the area 5c column-shift algorithm works for W->S continuation and E->S routes |
| Input | Port configurations with multiple ports targeting S sub-terminals |

#### Verification Procedure

For ports routed through area 5c:
1. When destination S sub-terminal column = source column: route is straight vertical
2. When destination column is occupied: S-bend uses y, y+1 rows to shift
3. When destination column is empty: single-row shift to reach target column
4. Verify no two column-shifts share the same intermediate rows in conflicting directions

#### Pass Criteria

- All routes through area 5c reach their target S sub-terminal
- No H+H or V+V overlap in area 5c
- Row counter increments correctly

---

### TC-A1: E/S Sub-Terminal Alignment

| Item | Description |
|------|-------------|
| Purpose | Verify E sub-terminal channels align with W sub-terminal channels (same y), and S with N (same x) |
| Input | termPos from routeBlockPorts |

#### Verification Procedure

For each terminal index i (0..nterm-1):
1. termPos['E'+i].y === termPos['W'+i].y
2. termPos['S'+i].x === termPos['N'+i].x
3. termPos['E'+i].x === cellSize
4. termPos['S'+i].y === cellSize

Additionally verify spine-termPos connectivity (no gap):
5. For each E terminal with ports: spine border point y === termPos['E'+i].y
6. For each S terminal with ports: spine border point x === termPos['S'+i].x

#### Pass Criteria

- All E/W y-coordinate pairs match
- All S/N x-coordinate pairs match
- No termPos-spine disconnect (the gap issue found in v1.5 subterminal-report.md)

---

## Test Data

### Group 1: W-N Fixed Cases (3 cases)

| Case ID | Ports | nterm | Focus |
|---------|-------|-------|-------|
| FIX-WN-1 | W0-N0, W1-N0, W2-N0 | 4 | 3 W ports to same N terminal, area 5a L-bend, N sub-terminal branching |
| FIX-WN-2 | W0-N0, W1-N1, W2-N2 | 4 | 3 W ports to different N terminals, area 5a parallel L-bends |
| FIX-WN-3 | W0-N0, W1-N0, W2-N1 | 4 | Mixed: 2 ports to N0, 1 port to N1 |

### Group 2: W-S Fixed Cases (3 cases)

| Case ID | Ports | nterm | Focus |
|---------|-------|-------|-------|
| FIX-WS-1 | W0-S0, W1-S0, W2-S0 | 4 | 3 W ports to same S terminal, area 5a+5c, S sub-terminal branching |
| FIX-WS-2 | W0-S0, W1-S1, W2-S2 | 4 | 3 W ports to different S terminals, parallel vertical routes |
| FIX-WS-3 | W0-S0, W1-S0, W2-S1 | 4 | Mixed: 2 ports to S0, 1 port to S1 |

### Group 3: W-E Fixed Cases (3 cases)

| Case ID | Ports | nterm | Focus |
|---------|-------|-------|-------|
| FIX-WE-1 | W0-E0, W1-E0, W2-E0 | 4 | 3 W ports to same E terminal, area 5b S-bend, E sub-terminal branching |
| FIX-WE-2 | W0-E0, W1-E1, W2-E2 | 4 | 3 W ports to different E terminals, area 5b row assignment |
| FIX-WE-3 | W0-E0, W1-E0, W2-E1 | 4 | Mixed: 2 ports to E0, 1 port to E1, S-bend avoidance |

### Group 4: Mixed Direction Cases (5 cases)

| Case ID | Ports | nterm | Focus |
|---------|-------|-------|-------|
| MIX-1 | W0-N0, W1-S0, W2-E0 | 4 | One port per direction from W, all 3 areas of 5 |
| MIX-2 | W0-N0, E0-S0, W1-E1 | 4 | W->N (5a), E->S (5c), W->E (5b) simultaneously |
| MIX-3 | W0-N0, S0-W2, W2-S1, N1-W1 | 3 | Bidirectional: ports in both directions between sides |
| MIX-4 | W0-E2, W2-E3, W3-S0, N0-W0 | 4 | Complex mix with all 4 sides |
| MIX-5 | N0-S0, N1-S1, W0-E0, W1-E1 | 4 | Opposite-side pairs: N->S and W->E crossing in area 5 |

### Group 5: md3 Maze (1 case)

| Case ID | Ports | nterm | Focus |
|---------|-------|-------|-------|
| MD3 | 27 ports from md3 maze | 6 | Real-world stress test, all direction combinations, heavy branching |

Port data: extracted from `maze/minsky-doubling/md3.hs` block definition.

### Group 6: Random Cases (1000 cases)

| Case ID | Ports | nterm | Focus |
|---------|-------|-------|-------|
| RND-0001..RND-1000 | Random (seeded PRNG) | 2-8 | Statistical coverage of edge cases |

#### Random Generation Parameters

| Parameter | Value |
|-----------|-------|
| Count | 1000 |
| Base seed | 42 |
| nterm range | 2-8 |
| Max ports per case | min(20, C(nterm*4, 2)) |
| PRNG | xoshiro128** (same as epic/2 tests) |
| cellSize | 240 |

#### Random Generation Rules

Same as epic/2/test/test-spec.md:
1. nterm: uniform random in [2, 8]
2. Port count k: uniform random in [1, maxPorts]
3. Each port: random src/dst from (W/E/N/S) x (0..nterm-1), no self-loop, no duplicates
4. Seeded for reproducibility

---

## Test Matrix: Which TC applies to which group

| TC | FIX-WN | FIX-WS | FIX-WE | MIX | MD3 | RND |
|----|--------|--------|--------|-----|-----|-----|
| TC-R1 (path connectivity) | x | x | x | x | x | x |
| TC-R2 (sub-terminal branching) | x | x | x | x | x | x |
| TC-R3 (area 5 routing) | x | x | x | x | x | - |
| TC-O1 (cell overlap) | x | x | x | x | x | x |
| TC-O2 (pixel overlap) | x | x | x | x | x | x |
| TC-O3 (5b S-bend) | - | - | x | x | x | - |
| TC-O4 (5c column-shift) | - | x | - | x | x | - |
| TC-A1 (E/S alignment) | x | x | x | x | x | x |

Notes:
- TC-R3 (area 5 routing correctness) is only checked on fixed/named cases because it requires knowledge of expected routing behavior per area. Random tests cannot predict which sub-area a route should traverse.
- TC-O3 and TC-O4 are targeted at specific sub-areas and only apply to cases that exercise those areas.

---

## Implementation Notes (for test script author)

### Extracting routeBlockPorts

Same approach as existing tests: extract from `index.html` `<script>` block, eval up to `function draw()`.

### Sub-Block Cell Coordinate System

The spec defines a sub-block grid. The test needs to map pixel routes back to sub-block cells:
- Area 4 (W sub-terminal): leftmost column(s)
- Area 2 (N sub-terminal): topmost row(s)
- Area 6 (E sub-terminal): rightmost column(s)
- Area 8 (S sub-terminal): bottommost row(s)
- Area 5 (routing): central region
- Areas 1,3,7,9: corners (should be empty)

### Area Identification

To verify TC-R3 (area routing), the test must classify each route segment into the area it occupies:
- Determine block dimensions and area boundaries from nterm and port counts
- For each waypoint in a route, determine which area it belongs to
- Verify the area sequence matches the expected path (e.g., W->N should be: area 4 -> area 5a -> area 2)

### Overlap Detection

Two levels:
1. **Grid-level** (TC-O1): Use hOwner/vOwner tracking (same as current routeBlockPorts internal logic, but verified independently)
2. **Pixel-level** (TC-O2): Pairwise segment comparison (same algorithm as epic/4/test/subterminal-test.js)

### Timeout

Each test case: 5000ms timeout (same as epic/2). If routeBlockPorts takes longer, report as TIMEOUT.

---

## Expected Output Format

```
9-Area Block Structure Test Results (spec-v2)
==============================================
Total cases: 1015 (9 fixed + 5 mixed + 1 md3 + 1000 random)
Seed range: 42..1041

TC-R1 (path connectivity):       1015/1015 PASS
TC-R2 (sub-terminal branching):  1015/1015 PASS
TC-R3 (area 5 routing):            15/15   PASS
TC-O1 (cell overlap):            1015/1015 PASS
TC-O2 (pixel overlap):           1015/1015 PASS
TC-O3 (5b S-bend):                  X/X    PASS
TC-O4 (5c column-shift):            X/X    PASS
TC-A1 (E/S alignment):           1015/1015 PASS

Overall: 1015/1015 PASS (100%)
```

### Failure Detail Format

```
FAIL [case=FIX-WE-1] TC-O1: H+H overlap at sub-block (3, 5)
  nterm=4, ports=3
  ports: W0-E0, W1-E0, W2-E0
  route 0 H at (3,5), route 1 H at (3,5)

FAIL [seed=156] TC-R1: route 2 does not reach dst edge
  nterm=5, ports=8
  ports: W0-E2, W3-S1, ...
  route 2 last point: (180, 120), expected y=0 (N edge)
```

---

## Relation to Existing Tests

| Existing Test | This Test | Relationship |
|---------------|-----------|-------------|
| epic/2/test/random-test.js | RND group | Superset: adds TC-R2, TC-R3, TC-O2, TC-O3, TC-O4, TC-A1 |
| epic/4/test/subterminal-test.js | FIX-WN-1, FIX-WS-1, FIX-WE-1 | Same 3 base cases but with full area verification |
| TC-5 (epic/2 cell overlap) | TC-O1 | Equivalent check, but TC-O1 also covers spine cells |
| TC-A1 (epic/4 termPos) | TC-A1 here | Extended: also checks spine-termPos connectivity |
