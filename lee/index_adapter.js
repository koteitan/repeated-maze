/* lee/index_adapter.js
 * Adapter: index.html's routeBlockPorts -> diagonal.md + lee_algorithm.
 *
 * Internal coord convention: CANVAS-style.
 *   x+ = east, y+ = south (y=0 is the TOP row).
 *   N subterms at y=0, S at y=H-1, W at x=0, E at x=W-1.
 *
 * This matches Lee's internal char labels (Lee's 'D' side = y+1 = visual
 * down, so Lee-produced corner chars (┌┐└┘) render correctly in the
 * canvas without any y-flip.
 */
(function (global) {
  const require_lee = typeof require !== 'undefined';
  const LEE = require_lee
    ? {
        lee_algorithm: require('./lee_algorithm.js').lee_algorithm,
        insert_map: require('./insert_map.js').insert_map,
      }
    : {
        lee_algorithm: global.lee_algorithm,
        insert_map: global.insert_map,
      };

  /* Map a connect[W/E/N/S] (0/1) to a subport char.
   * Bit encoding used by test-v2.js DIRS: bit0=R, bit1=D, bit2=L, bit3=U.
   * With canvas coords: N-up is 'U' in Lee's labels (matches visually).
   */
  const SHAPE_BY_BITS = {
    0b0000: ' ',
    0b0101: '─', 0b1010: '│',
    0b1001: '└', 0b1100: '┘', 0b0011: '┌', 0b0110: '┐',
    0b1011: '├', 0b1110: '┤', 0b0111: '┬', 0b1101: '┴',
    0b1111: '┼',
    0b0001: '─', 0b0100: '─', 0b1000: '│', 0b0010: '│',
  };
  function connectToChar(conn) {
    const bits = (conn.E ? 1 : 0) | (conn.S ? 2 : 0) | (conn.W ? 4 : 0) | (conn.N ? 8 : 0);
    return SHAPE_BY_BITS[bits] || '?';
  }

  function buildBlockSubgrid(ports, nterm, cellSize) {
    /* ---- 1. Count subterminals per (dir, terminal-idx) ---- */
    const nsub = { W: [], E: [], N: [], S: [] };
    for (let i = 0; i < nterm; i++) {
      nsub.W.push(0); nsub.E.push(0); nsub.N.push(0); nsub.S.push(0);
    }
    for (const p of ports) {
      nsub[p.src.dir][p.src.idx]++;
      nsub[p.dst.dir][p.dst.idx]++;
    }

    /* ---- 2. Grid size (diagonal.md §39-40) ---- */
    let Hcore = 0, Wcore = 0;
    for (let t = 0; t < nterm; t++) {
      Hcore += Math.max(nsub.W[t], nsub.E[t]);
      Wcore += Math.max(nsub.N[t], nsub.S[t]);
    }
    let H = Hcore + 2;
    let W = Wcore + 2;

    /* ---- 3. Subterminal placement (canvas convention) ----
     * W/E: y ∈ [1, H-2] (top=1 to bottom=H-2, avoiding corners).
     * S/N: x ∈ [1, W-2].
     *
     * diagonal.md §44-50 says "y=0, t=0 に初期化, y をインクリメント". We
     * start y=1 to leave corner (0,0) empty.  The spec's order t=0, t=1,
     * ... is preserved: the t=0 subterminals come first in the subgrid's
     * y range, closest to the top (y=1, 2, ...).
     */
    const wY = [], eY = [], nX = [], sX = [];
    for (let t = 0; t < nterm; t++) { wY.push([]); eY.push([]); nX.push([]); sX.push([]); }
    {
      let y = 1;
      for (let t = 0; t < nterm; t++) {
        const maxWE = Math.max(nsub.W[t], nsub.E[t]);
        for (let s = 0; s < maxWE; s++) {
          if (s < nsub.W[t]) wY[t].push(y);
          if (s < nsub.E[t]) eY[t].push(y);
          y++;
        }
      }
    }
    {
      let x = 1;
      for (let t = 0; t < nterm; t++) {
        const maxSN = Math.max(nsub.N[t], nsub.S[t]);
        for (let s = 0; s < maxSN; s++) {
          if (s < nsub.S[t]) sX[t].push(x);
          if (s < nsub.N[t]) nX[t].push(x);
          x++;
        }
      }
    }

    /* ---- 4. Tin: dx/dy points INTO block interior (canvas conv) ----
     *   W at (0, y)     : dx=+1, dy=0
     *   E at (W-1, y)   : dx=-1
     *   N at (x, 0)     : dx=0, dy=+1  (down into block)
     *   S at (x, H-1)   : dy=-1
     */
    const Tin = [];
    const tinKeyByIdx = [];
    const tinIdxByKey = {};
    function addTerm(dir, t, s, x, y, dx, dy) {
      const key = dir + t + '-' + s;
      tinIdxByKey[key] = Tin.length;
      tinKeyByIdx.push(key);
      Tin.push({ x, y, dx, dy });
    }
    for (let t = 0; t < nterm; t++) {
      for (let s = 0; s < wY[t].length; s++) addTerm('W', t, s, 0, wY[t][s], +1, 0);
      for (let s = 0; s < eY[t].length; s++) addTerm('E', t, s, W - 1, eY[t][s], -1, 0);
      for (let s = 0; s < nX[t].length; s++) addTerm('N', t, s, nX[t][s], 0, 0, +1);
      for (let s = 0; s < sX[t].length; s++) addTerm('S', t, s, sX[t][s], H - 1, 0, -1);
    }

    /* ---- 5. Build P from (src, dst), first-come s order ---- */
    const used = { W: [], E: [], N: [], S: [] };
    for (let i = 0; i < nterm; i++) { used.W.push(0); used.E.push(0); used.N.push(0); used.S.push(0); }
    const P = [];
    for (const p of ports) {
      const sKey = p.src.dir + p.src.idx + '-' + (used[p.src.dir][p.src.idx]++);
      const eKey = p.dst.dir + p.dst.idx + '-' + (used[p.dst.dir][p.dst.idx]++);
      P.push({ s: tinIdxByKey[sKey], e: tinIdxByKey[eKey] });
    }

    if (Tin.length === 0) return emptyResult(nterm, cellSize);

    /* ---- 6. Run Lee ---- */
    const TinCopy = Tin.map(t => ({ x: t.x, y: t.y, dx: t.dx, dy: t.dy }));
    const leeRes = LEE.lee_algorithm(TinCopy, P);
    if (leeRes.error) {
      console.warn('lee_algorithm error:', leeRes.error, 'failedPort:', leeRes.failedPort);
    }
    let m = leeRes.m;
    let curW = leeRes.W;
    let curH = leeRes.H;
    const T = leeRes.T;

    /* ---- 7. Square the grid (diagonal.md §53-57) ----
     * Insert row at canvas y=1 (just below top-row N terminals); this
     * corresponds to spec's "H'-2" position after shift. Insert col at
     * x=W-1 (just inside the right-edge E terminals).
     */
    while (curW < curH) {
      m = LEE.insert_map(m, curW - 1, 0, 'col', T);
      curW++;
    }
    while (curH < curW) {
      m = LEE.insert_map(m, 0, 1, 'row', T);
      curH++;
    }

    /* Normalize Lee's ASCII '-' / '|' to Unicode box-drawing chars. */
    for (let x = 0; x < curW; x++) {
      for (let y = 0; y < curH; y++) {
        const ch = m[x][y];
        if (ch === '-') m[x][y] = '─';
        else if (ch === '|') m[x][y] = '│';
      }
    }

    /* ---- 8. Compute connect[] for each subterminal & overwrite 'T' ---- */
    const entriesByKey = {};
    for (let i = 0; i < Tin.length; i++) {
      const key = tinKeyByIdx[i];
      const m_ = /^([WENS])(\d+)-(\d+)$/.exec(key);
      if (!m_) continue;
      const dir = m_[1], tN = +m_[2], sN = +m_[3];
      const gk = dir + tN;
      (entriesByKey[gk] = entriesByKey[gk] || []).push({ idx: i, s: sN, key, dir, t: tN });
    }
    for (const k in entriesByKey) entriesByKey[k].sort((a, b) => a.s - b.s);

    const conns = new Array(Tin.length).fill(null);
    for (const k in entriesByKey) {
      const list = entriesByKey[k];
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const c = { W: 0, E: 0, N: 0, S: 0 };
        /* Outward (toward terminal outside the block) — only s=0 per
         * diagonal.md §63 "Dt-0 の connect[D]". */
        if (e.s === 0) c[e.dir] = 1;
        /* Inward (Lee-routed subport) */
        if (e.dir === 'W') c.E = 1;
        if (e.dir === 'E') c.W = 1;
        if (e.dir === 'N') c.S = 1;
        if (e.dir === 'S') c.N = 1;
        /* Neighbors on the same edge (branch line).
         * W/E edges: subterms stacked vertically. In canvas conv, s=0 sits
         * at smaller y (closer to top). prev (smaller s) is N of current. */
        const hasPrev = i > 0;
        const hasNext = i < list.length - 1;
        if (e.dir === 'W' || e.dir === 'E') {
          if (hasPrev) c.N = 1;
          if (hasNext) c.S = 1;
        } else {
          if (hasPrev) c.W = 1;
          if (hasNext) c.E = 1;
        }
        conns[e.idx] = c;
        const tp = T[e.idx];
        if (m[tp.x] && m[tp.x][tp.y] === 'T') {
          m[tp.x][tp.y] = connectToChar(c);
        }
      }
    }

    /* ---- 8b. Fill gaps between adjacent subterminals on the same edge
     * (Lee's row/col insertions may have spread subterms apart). */
    for (const k in entriesByKey) {
      const list = entriesByKey[k];
      if (list.length < 2) continue;
      const dir = list[0].dir;
      for (let i = 0; i < list.length - 1; i++) {
        const a = T[list[i].idx], b = T[list[i + 1].idx];
        if (dir === 'W' || dir === 'E') {
          const x = a.x;
          const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
          for (let y = y1 + 1; y < y2; y++) {
            const ch = m[x][y];
            if (ch === ' ') m[x][y] = '│';
            else if (ch === '─') m[x][y] = '┼';
          }
        } else {
          const y = a.y;
          const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
          for (let x = x1 + 1; x < x2; x++) {
            const ch = m[x][y];
            if (ch === ' ') m[x][y] = '─';
            else if (ch === '│') m[x][y] = '┼';
          }
        }
      }
    }

    /* ---- 9. subgrid[r][c] = m[c][r] (no flip; canvas convention) ---- */
    const nR = curH, nC = curW;
    const subgrid = new Array(nR);
    for (let r = 0; r < nR; r++) {
      const row = new Array(nC);
      for (let c = 0; c < nC; c++) row[c] = m[c][r];
      subgrid[r] = row;
    }

    const cellW = cellSize / nC, cellH = cellSize / nR;

    /* ---- 10. termPos (block-local pixel coords, canvas convention) ----
     * Fill all idx ∈ [0, nterm-1] in each direction. For used terminals,
     * use first subterm's cross-axis center. Alignment W[i].y = E[i].y
     * and N[i].x = S[i].x is guaranteed by the shared-y/x placement.
     */
    const termPos = {};
    for (let t = 0; t < nterm; t++) {
      let yCanvas;
      if (wY[t].length > 0 || eY[t].length > 0) {
        const key = (wY[t].length > 0 ? 'W' : 'E') + t + '-0';
        const pos = T[tinIdxByKey[key]];
        yCanvas = (pos.y + 0.5) * cellH;
      } else {
        yCanvas = cellSize * (t + 1) / (nterm + 1);
      }
      termPos['W' + t] = { x: 0, y: yCanvas };
      termPos['E' + t] = { x: cellSize, y: yCanvas };

      let xCanvas;
      if (nX[t].length > 0 || sX[t].length > 0) {
        const key = (nX[t].length > 0 ? 'N' : 'S') + t + '-0';
        const pos = T[tinIdxByKey[key]];
        xCanvas = (pos.x + 0.5) * cellW;
      } else {
        xCanvas = cellSize * (t + 1) / (nterm + 1);
      }
      termPos['N' + t] = { x: xCanvas, y: 0 };
      termPos['S' + t] = { x: xCanvas, y: cellSize };
    }

    /* ---- 11. Junctions ---- */
    const junctions = [];
    for (let i = 0; i < Tin.length; i++) {
      const c = conns[i];
      if (!c) continue;
      const sum = c.W + c.E + c.N + c.S;
      if (sum > 2) {
        const tp = T[i];
        junctions.push({
          x: (tp.x + 0.5) * cellW,
          y: (tp.y + 0.5) * cellH,
        });
      }
    }

    return {
      routes: [], spines: [], junctions, termPos, overlaps: [],
      subgrid, nR, nC,
    };
  }

  function emptyResult(nterm, cellSize) {
    const termPos = {};
    for (let i = 0; i < nterm; i++) {
      const t = cellSize * (i + 1) / (nterm + 1);
      termPos['W' + i] = { x: 0, y: t };
      termPos['E' + i] = { x: cellSize, y: t };
      termPos['N' + i] = { x: t, y: 0 };
      termPos['S' + i] = { x: t, y: cellSize };
    }
    return {
      routes: [], spines: [], junctions: [], termPos, overlaps: [],
      subgrid: [[' ']], nR: 1, nC: 1,
    };
  }

  global.buildBlockSubgrid = buildBlockSubgrid;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildBlockSubgrid };
  }
})(typeof window !== 'undefined' ? window : globalThis);
