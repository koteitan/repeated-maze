# diagonal3: Insertion-based routing algorithm

## Block structure
```
   N
  123
 W456E
  789
   S
```
- Areas 2, 4, 6, 8: sub-terminal areas
- Areas 1, 3, 7, 9: empty corners
- Area 5: main routing area

## Algorithm overview

Start with an empty main area (0 rows x 0 columns). Add ports one by one using the insertion algorithm. Each port gets its own dedicated rows/columns, so **collisions never occur by construction**. Swap trials minimize crossing count.

## Port shape classification

- **L-shape**: destination is on the next (adjacent) edge from source (e.g., W->N, W->S, E->N, E->S)
- **S-shape**: destination is on the opposite edge from source (e.g., W->E, N->S)
- **U-shape**: destination is on the same edge as source (e.g., W->W, N->N)

## Insertion algorithm

### Case L (adjacent edges, e.g., W->N)

The port forms an L-shaped line.

1. **Source insertion**: Insert a row into the source (W) sub-terminal list at the correct position in terminal order.
   - Example: if W0 and W2 exist, a new W1 port is inserted between them.

2. **Destination insertion**: Insert a column into the destination (N) sub-terminal list at the correct position in terminal order.
   - Example: if N0 and N2 exist, a new N1 port is inserted between them.

3. **Swap trial**: If existing sub-terminals of the source or destination share the same terminal number as the new port, try all permutations of same-terminal sub-terminals. Count crossings for each case and choose the minimum.
   - Cases to check: (# same-terminal source sub-terminals) x (# same-terminal destination sub-terminals)

### Case S (opposite edges, e.g., W->E)

The port forms an S-shaped (Z-bend) line.

1. **Source insertion**: Insert a row into the source (W) sub-terminal list in terminal order.

2. **Destination insertion**: Insert a row into the destination (E) sub-terminal list in terminal order.

3. **Orthogonal insertion**: Insert a column at the midpoint of the main area's columns.

4. **Swap trial**: Try all permutations of same-terminal sub-terminals for source and destination. Additionally, the orthogonal column can be placed at any existing column position in the main area.
   - Cases to check: (# same-terminal source) x (# same-terminal destination) x (# main area columns)

### Case U (same edge, e.g., W->W)

The port forms a U-shaped line.

1. **Source insertion**: Insert a row into the source (W) sub-terminal list in terminal order.

2. **Destination insertion**: Insert another row into the destination (W) sub-terminal list in terminal order.

3. **Orthogonal insertion**: Insert a column at the midpoint of the main area's columns.

4. **Swap trial**: Same as S-case.
   - Cases to check: (# same-terminal source) x (# same-terminal destination) x (# main area columns)

## Key properties

- **No collisions by construction**: Each port is inserted into its own dedicated rows and columns. No two ports share the same row or column for same-direction segments.
- **Crossings are minimized**: The swap trials enumerate permutations within the same terminal and choose the arrangement with the fewest H+V crossings.
- **Sub-terminal drawing**: After all ports are added, draw the sub-terminal spine/junction structures for areas 2, 4, 6, 8.

## Crossing count

At each cell in the main area, count the number of H+V crossings (where one port goes horizontal and another goes vertical through the same cell). The total crossing count is the sum over all cells.
