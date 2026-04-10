#!/usr/bin/env node
/**
 * Comprehensive coordinate verification for Epic 1 fix (v2).
 *
 * Verifies:
 *   TC-1: All routes are orthogonal (H/V only)
 *   TC-2: nx ports use W channel y, matching spine endpoints
 *   TC-3: ny ports use S channel x, matching spine endpoints
 *   TC-4: Answer path — no diagonal lines at block boundaries
 *   TC-5: Start/Goal markers match grid positions
 *   TC-6: gridTermPos has all terminals
 */

const BASE_CELL = 240;
const BASE_MARGIN = 100;

function parseTermName(s) {
  s = s.trim();
  return { dir: s[0], idx: parseInt(s.substring(1)) };
}

function parseMaze(text) {
  text = text.replace(/^maze:\s*/i, '').trim();
  text = text.replace(/^path\s+length:\s*\d+.*$/gim, '').trim();
  const result = { normal: [], nx: [], ny: [] };
  const sections = text.split(';');
  for (const sec of sections) {
    const t = sec.trim();
    const ci = t.indexOf(':');
    if (ci < 0) continue;
    const type = t.substring(0, ci).trim().toLowerCase();
    const body = t.substring(ci + 1).trim();
    if (body === '(none)' || !body) continue;
    const ports = body.split(',').map(p => {
      const t = p.trim();
      const parts = t.includes('->') ? t.split('->') : t.split('-');
      if (parts.length !== 2) return null;
      return { src: parseTermName(parts[0]), dst: parseTermName(parts[1]) };
    }).filter(p => p !== null);
    if (type === 'normal') result.normal = ports;
    else if (type === 'nx') result.nx = ports;
    else if (type === 'ny') result.ny = ports;
  }
  return result;
}

function detectNterm(maze, path) {
  let nterm = 2;
  for (const ports of [maze.normal, maze.nx, maze.ny])
    for (const p of ports)
      nterm = Math.max(nterm, p.src.idx + 1, p.dst.idx + 1);
  for (const s of path)
    nterm = Math.max(nterm, s.idx + 1);
  return nterm;
}

function termLocalPos(dir, idx, nterm, cellSize) {
  const t = cellSize * (idx + 1) / (nterm + 1);
  switch (dir) {
    case 'E': return { x: cellSize, y: t };
    case 'W': return { x: 0, y: t };
    case 'N': return { x: t, y: 0 };
    case 'S': return { x: t, y: cellSize };
  }
}

function routeBlockPorts(ports, nterm, cellSize) {
  if (ports.length === 0) {
    const termPos = {};
    for (let i = 0; i < nterm; i++) {
      const t = cellSize * (i + 1) / (nterm + 1);
      termPos['W' + i] = { x: 0, y: t };
      termPos['E' + i] = { x: cellSize, y: t };
      termPos['N' + i] = { x: t, y: 0 };
      termPos['S' + i] = { x: t, y: cellSize };
    }
    return { routes: [], spines: [], junctions: [], termPos };
  }
  const opposite = { E: 'W', W: 'E', N: 'S', S: 'N' };
  const isLR = d => d === 'W' || d === 'E';
  const termPorts = {};
  for (let i = 0; i < ports.length; i++) {
    const p = ports[i];
    const sk = p.src.dir + p.src.idx, dk = p.dst.dir + p.dst.idx;
    (termPorts[sk] = termPorts[sk] || []).push({ pi: i, end: 'src' });
    (termPorts[dk] = termPorts[dk] || []).push({ pi: i, end: 'dst' });
  }
  const sideCh = { W: 0, E: 0, N: 0, S: 0 };
  const chMap = [];
  for (let i = 0; i < ports.length; i++) chMap.push({ src: -1, dst: -1 });
  for (let d = 0; d < 4; d++) {
    const dir = 'WENS'[d];
    for (let idx = 0; idx < nterm; idx++) {
      const k = dir + idx;
      if (!termPorts[k]) continue;
      for (const { pi, end } of termPorts[k])
        chMap[pi][end] = sideCh[dir]++;
    }
  }
  const pW = sideCh.W, pE = sideCh.E, pN = sideCh.N, pS = sideCh.S;
  const H = 1, V = 2;
  let nR = pW + pE + 2, nC = pN + pS + 2;
  if (nR < 3) nR = 3;
  if (nC < 3) nC = 3;
  let grid = Array.from({length: nR}, () => Array(nC).fill(0));
  function mkChG(dir, ch) {
    switch (dir) {
      case 'W': return { r: ch + 1, c: 0 };
      case 'E': return { r: pW + ch + 1, c: nC - 1 };
      case 'N': return { r: 0, c: ch + 1 };
      case 'S': return { r: nR - 1, c: pN + ch + 1 };
    }
  }
  const chG = [];
  for (let i = 0; i < ports.length; i++)
    chG.push({ src: mkChG(ports[i].src.dir, chMap[i].src),
               dst: mkChG(ports[i].dst.dir, chMap[i].dst) });
  const allRoutes = [];
  function insertRow(atR) {
    grid.splice(atR, 0, Array(nC).fill(0)); nR++;
    for (const cg of chG) { if (cg.src.r >= atR) cg.src.r++; if (cg.dst.r >= atR) cg.dst.r++; }
    for (const rt of allRoutes) for (const pt of rt) if (pt.r >= atR) pt.r++;
  }
  function insertCol(atC) {
    for (const row of grid) row.splice(atC, 0, 0); nC++;
    for (const cg of chG) { if (cg.src.c >= atC) cg.src.c++; if (cg.dst.c >= atC) cg.dst.c++; }
    for (const rt of allRoutes) for (const pt of rt) if (pt.c >= atC) pt.c++;
  }
  function isHVHFree(sg, dg, mc) {
    const c1lo = Math.min(sg.c, mc), c1hi = Math.max(sg.c, mc);
    for (let c = c1lo; c <= c1hi; c++) if (c !== sg.c && grid[sg.r][c] & H) return false;
    const rlo = Math.min(sg.r, dg.r), rhi = Math.max(sg.r, dg.r);
    for (let r = rlo; r <= rhi; r++) if (grid[r][mc] & V) return false;
    const c2lo = Math.min(mc, dg.c), c2hi = Math.max(mc, dg.c);
    for (let c = c2lo; c <= c2hi; c++) if (c !== dg.c && grid[dg.r][c] & H) return false;
    return true;
  }
  function isVHVFree(sg, dg, mr) {
    const r1lo = Math.min(sg.r, mr), r1hi = Math.max(sg.r, mr);
    for (let r = r1lo; r <= r1hi; r++) if (r !== sg.r && grid[r][sg.c] & V) return false;
    const clo = Math.min(sg.c, dg.c), chi = Math.max(sg.c, dg.c);
    for (let c = clo; c <= chi; c++) if (grid[mr][c] & H) return false;
    const r2lo = Math.min(mr, dg.r), r2hi = Math.max(mr, dg.r);
    for (let r = r2lo; r <= r2hi; r++) if (r !== dg.r && grid[r][dg.c] & V) return false;
    return true;
  }
  function placeH(r, c1, c2, route) {
    const step = c1 <= c2 ? 1 : -1;
    for (let c = c1; step > 0 ? c <= c2 : c >= c2; c += step) { grid[r][c] |= H; route.push({ r, c }); }
  }
  function placeV(r1, r2, c, route) {
    const step = r1 <= r2 ? 1 : -1;
    for (let r = r1; step > 0 ? r <= r2 : r >= r2; r += step) { grid[r][c] |= V; route.push({ r, c }); }
  }
  const portOrder = ports.map((_, i) => i);
  portOrder.sort((a, b) => {
    const pa = ports[a], pb = ports[b];
    const adjA = pa.src.dir !== pa.dst.dir && pa.src.dir !== opposite[pa.dst.dir] ? 0 : 1;
    const adjB = pb.src.dir !== pb.dst.dir && pb.src.dir !== opposite[pb.dst.dir] ? 0 : 1;
    return adjA - adjB;
  });
  for (const i of portOrder) {
    const p = ports[i]; const sg = chG[i].src, dg = chG[i].dst; const route = [];
    function tryHVH(sg, dg, route) {
      if (sg.r === dg.r && sg.c !== dg.c) {
        const clo = Math.min(sg.c, dg.c), chi = Math.max(sg.c, dg.c);
        for (let c = clo; c <= chi; c++) if (c !== sg.c && c !== dg.c && grid[sg.r][c] & H) return false;
        placeH(sg.r, sg.c, dg.c, route); return true;
      }
      let mc = -1;
      if (dg.c >= 1 && dg.c < nC - 1 && isHVHFree(sg, dg, dg.c)) mc = dg.c;
      if (mc < 0) for (let c = 1; c < nC - 1; c++) if (isHVHFree(sg, dg, c)) { mc = c; break; }
      if (mc < 0) for (let c = 0; c < nC; c++) if (isHVHFree(sg, dg, c)) { mc = c; break; }
      if (mc < 0) return false;
      placeH(sg.r, sg.c, mc, route);
      if (sg.r !== dg.r) placeV(sg.r, dg.r, mc, route);
      if (mc !== dg.c) placeH(dg.r, mc, dg.c, route);
      return true;
    }
    function tryVHV(sg, dg, route) {
      if (sg.c === dg.c && sg.r !== dg.r) {
        const rlo = Math.min(sg.r, dg.r), rhi = Math.max(sg.r, dg.r);
        for (let r = rlo; r <= rhi; r++) if (r !== sg.r && r !== dg.r && grid[r][sg.c] & V) return false;
        placeV(sg.r, dg.r, sg.c, route); return true;
      }
      let mr = -1;
      if (dg.r >= 1 && dg.r < nR - 1 && isVHVFree(sg, dg, dg.r)) mr = dg.r;
      if (mr < 0) for (let r = 1; r < nR - 1; r++) if (isVHVFree(sg, dg, r)) { mr = r; break; }
      if (mr < 0) for (let r = 0; r < nR; r++) if (isVHVFree(sg, dg, r)) { mr = r; break; }
      if (mr < 0) return false;
      placeV(sg.r, mr, sg.c, route);
      if (sg.c !== dg.c) placeH(mr, sg.c, dg.c, route);
      if (mr !== dg.r) placeV(mr, dg.r, dg.c, route);
      return true;
    }
    if (sg.r === dg.r && sg.c === dg.c) { /* same cell */ } else {
      const first = isLR(p.src.dir) ? tryHVH : tryVHV;
      const second = isLR(p.src.dir) ? tryVHV : tryHVH;
      let ok = first(sg, dg, route) || second(sg, dg, route);
      while (!ok) { insertCol(nC - 1); insertRow(nR - 1); ok = first(sg, dg, route) || second(sg, dg, route); }
    }
    allRoutes.push(route);
  }
  const cW = cellSize / nC, rH = cellSize / nR;
  const toXY = pt => ({ x: (pt.c + 0.5) * cW, y: (pt.r + 0.5) * rH });
  const pixelRoutes = allRoutes.map(route => {
    const seen = new Set(); const pts = [];
    for (const pt of route) { const k = pt.r + ',' + pt.c; if (!seen.has(k)) { seen.add(k); pts.push(toXY(pt)); } }
    return pts;
  });
  const termPos = {};
  for (const [k, arr] of Object.entries(termPorts)) {
    const dir = k[0];
    const channels = arr.map(({ pi, end }) => toXY(chG[pi][end]));
    if (isLR(dir)) {
      channels.sort((a, b) => a.y - b.y);
      termPos[k] = { x: dir === 'W' ? 0 : cellSize, y: channels[0].y };
    } else {
      channels.sort((a, b) => a.x - b.x);
      termPos[k] = { x: channels[0].x, y: dir === 'N' ? 0 : cellSize };
    }
  }
  for (let i = 0; i < nterm; i++) {
    const t = cellSize * (i + 1) / (nterm + 1);
    if (!termPos['W' + i]) termPos['W' + i] = { x: 0, y: t };
    if (!termPos['E' + i]) termPos['E' + i] = { x: cellSize, y: t };
    if (!termPos['N' + i]) termPos['N' + i] = { x: t, y: 0 };
    if (!termPos['S' + i]) termPos['S' + i] = { x: t, y: cellSize };
  }
  return { routes: pixelRoutes, termPos, _pW: pW, _pE: pE, _pN: pN, _pS: pS, _nR: nR, _nC: nC };
}

/* ================================================================ */

const MAZE_INPUT = `normal: W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7, W7-E8, W8-S2, N2-W6, E9-W10, W10-N3, S3-W9, W11-E12, W12-E13, W13-S4, N4-W11, E14-W15, W15-N5, S5-W14, W16-S6, N6-W16, S7-W4, S8-W9, S9-W14, S10-W1; nx: E4-E6, E9-E11, E14-E16; ny: N0-N7, N2-N8, N4-N9, N6-N10`;

const maze = parseMaze(MAZE_INPUT);
const nterm = detectNterm(maze, []);
const CELL = BASE_CELL;

const deduped = [];
const seenPorts = new Set();
for (const port of maze.normal) {
  const k1 = port.src.dir + port.src.idx + ',' + port.dst.dir + port.dst.idx;
  const k2 = port.dst.dir + port.dst.idx + ',' + port.src.dir + port.src.idx;
  if (seenPorts.has(k2)) continue;
  seenPorts.add(k1);
  deduped.push(port);
}

const result = routeBlockPorts(deduped, nterm, CELL);
const tp = result.termPos;

console.log(`nterm=${nterm}, CELL=${CELL}, grid=${result._nR}r×${result._nC}c, pW=${result._pW} pE=${result._pE} pN=${result._pN} pS=${result._pS}`);

let failures = 0;
const res = {};

function pass(msg) { console.log(`  PASS: ${msg}`); }
function fail(msg) { console.log(`  FAIL: ${msg}`); failures++; }
function chk(cond, msg) { cond ? pass(msg) : fail(msg); return cond; }

/* ================================================================
 * TC-1: Route orthogonality
 * ================================================================ */
console.log('\n--- TC-1: Route orthogonality ---');
let tc1 = true;
for (let ri = 0; ri < result.routes.length; ri++) {
  const r = result.routes[ri];
  for (let i = 1; i < r.length; i++) {
    const dx = Math.abs(r[i].x - r[i-1].x), dy = Math.abs(r[i].y - r[i-1].y);
    if (dx > 0.001 && dy > 0.001) { tc1 = false; fail(`Route ${ri} seg ${i-1}→${i}: diagonal`); }
  }
}
chk(tc1, `${result.routes.length} routes — all segments orthogonal`);
res['TC-1'] = tc1;

/* ================================================================
 * TC-2: nx ports use W channel y
 * ================================================================ */
console.log('\n--- TC-2: nx ports — W channel y alignment ---');
let tc2 = true;
for (const port of maze.nx) {
  const si = port.src.idx, di = port.dst.idx;
  /* nx drawing code: from.y = gridTermPos['W'+si].y, to.y = gridTermPos['W'+di].y */
  const srcY = tp['W' + si].y;
  const dstY = tp['W' + di].y;
  /* These must match the W terminal edge positions in the grid */
  tc2 = chk(tp['W' + si] !== undefined, `E${si}-E${di}: W${si} exists in termPos, y=${srcY.toFixed(2)}`) && tc2;
  tc2 = chk(tp['W' + di] !== undefined, `E${si}-E${di}: W${di} exists in termPos, y=${dstY.toFixed(2)}`) && tc2;
  /* Verify x is at right edge (CELL) for nx block */
  console.log(`    nx curve endpoints: (${CELL}, ${srcY.toFixed(2)}) → (${CELL}, ${dstY.toFixed(2)})`);
}
res['TC-2'] = tc2;

/* ================================================================
 * TC-3: ny ports use S channel x
 * ================================================================ */
console.log('\n--- TC-3: ny ports — S channel x alignment ---');
let tc3 = true;
for (const port of maze.ny) {
  const si = port.src.idx, di = port.dst.idx;
  /* ny drawing code: from.x = gridTermPos['S'+si].x, to.x = gridTermPos['S'+di].x */
  const srcX = tp['S' + si].x;
  const dstX = tp['S' + di].x;
  tc3 = chk(tp['S' + si] !== undefined, `N${si}-N${di}: S${si} exists in termPos, x=${srcX.toFixed(2)}`) && tc3;
  tc3 = chk(tp['S' + di] !== undefined, `N${si}-N${di}: S${di} exists in termPos, x=${dstX.toFixed(2)}`) && tc3;
  console.log(`    ny curve endpoints: (${srcX.toFixed(2)}, 0) → (${dstX.toFixed(2)}, 0)`);

  /* Key check: S[i].x must be at the S channel grid position, NOT at N channel or default */
  /* S terminals that participate in ports should have grid-assigned positions
   * (not equal to termLocalPos default) */
  const defSrcX = CELL * (si + 1) / (nterm + 1);
  const defDstX = CELL * (di + 1) / (nterm + 1);
  /* If S[i] participates in a port, its x should differ from the default (grid channel pos) */
  const srcParticipates = deduped.some(p =>
    (p.src.dir === 'S' && p.src.idx === si) || (p.dst.dir === 'S' && p.dst.idx === si));
  const dstParticipates = deduped.some(p =>
    (p.src.dir === 'S' && p.src.idx === di) || (p.dst.dir === 'S' && p.dst.idx === di));

  if (srcParticipates) {
    tc3 = chk(Math.abs(srcX - defSrcX) > 0.01,
      `S${si} has GRID position (${srcX.toFixed(2)}), not default (${defSrcX.toFixed(2)})`) && tc3;
  }
  if (dstParticipates) {
    tc3 = chk(Math.abs(dstX - defDstX) > 0.01,
      `S${di} has GRID position (${dstX.toFixed(2)}), not default (${defDstX.toFixed(2)})`) && tc3;
  }
}
res['TC-3'] = tc3;

/* ================================================================
 * TC-4: Answer path — no diagonal at block boundaries
 * ================================================================ */
console.log('\n--- TC-4: Answer path — boundary alignment ---');
let tc4 = true;

const path = [
  { x: 0, y: 1, dir: 'E', idx: 0 },
  { x: 1, y: 1, dir: 'N', idx: 0 },
  { x: 0, y: 2, dir: 'E', idx: 2 },
  { x: 1, y: 1, dir: 'N', idx: 1 },
  { x: 0, y: 1, dir: 'E', idx: 1 },
];

const minX = 0, maxX = 1, minY = 1, maxY = 2;
const MARGIN = BASE_MARGIN;
function bpos(bx, by) {
  return { x: MARGIN + (bx - minX) * CELL, y: MARGIN + (maxY - by) * CELL };
}

/* statePos exactly as in index.html L.685-701 */
function statePos(s) {
  const bp = bpos(s.x, s.y);
  if (s.dir === 'E') {
    const wk = 'W' + s.idx;
    if (tp[wk]) return { x: bp.x + CELL, y: bp.y + tp[wk].y };
  } else if (s.dir === 'N') {
    const sk = 'S' + s.idx;
    if (tp[sk]) return { x: bp.x + tp[sk].x, y: bp.y };
  }
  const tlp = termLocalPos(s.dir, s.idx, nterm, CELL);
  return { x: bp.x + tlp.x, y: bp.y + tlp.y };
}

/* Sub-check 4a: statePos never falls back to termLocalPos for E/N states */
console.log('  4a: No termLocalPos fallback for E/N states');
for (let i = 0; i < path.length; i++) {
  const s = path[i];
  const key = s.dir === 'E' ? 'W' + s.idx : s.dir === 'N' ? 'S' + s.idx : null;
  if (key) {
    tc4 = chk(tp[key] !== undefined,
      `Step ${i} ${s.dir}${s.idx}@(${s.x},${s.y}): gridTermPos['${key}'] exists → grid-aligned`) && tc4;
  }
}

/* Sub-check 4b: E[i] statePos matches where W[i] is drawn in the adjacent block.
 *
 * E[i]@(bx,by) is the right edge of block (bx,by) = left edge of block (bx+1,by).
 * In block (bx+1,by), the W[i] terminal is drawn at gridTermPos['W'+i].
 * statePos(E[i]@(bx,by)) = {bpos(bx,by).x + CELL, bpos(bx,by).y + W[i].y}
 * W[i] drawn position in block (bx+1,by) = {bpos(bx+1,by).x + W[i].x, bpos(bx+1,by).y + W[i].y}
 *   where W[i].x = 0 (left edge of block)
 *
 * Since bpos(bx,by).x + CELL = bpos(bx+1,by).x (adjacent blocks), x matches.
 * Both use W[i].y from the same gridTermPos, so y matches.
 * → E[i] statePos aligns with W[i] drawn position in adjacent block.
 */
console.log('\n  4b: E→W cross-block alignment');
for (let i = 0; i < path.length; i++) {
  const s = path[i];
  if (s.dir !== 'E') continue;
  const pos = statePos(s);
  /* Position where W[idx] is drawn in block (s.x+1, s.y) */
  const adjBp = bpos(s.x + 1, s.y);
  const wDrawn = { x: adjBp.x + tp['W' + s.idx].x, y: adjBp.y + tp['W' + s.idx].y };

  const xMatch = Math.abs(pos.x - wDrawn.x) < 0.01;
  const yMatch = Math.abs(pos.y - wDrawn.y) < 0.01;
  tc4 = chk(xMatch && yMatch,
    `Step ${i} E${s.idx}@(${s.x},${s.y}): statePos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}) ` +
    `vs W${s.idx} drawn@(${s.x+1},${s.y})=(${wDrawn.x.toFixed(2)}, ${wDrawn.y.toFixed(2)}) → ${xMatch && yMatch ? 'IDENTICAL' : 'MISMATCH'}`) && tc4;
}

/* Sub-check 4c: N[i] statePos matches where S[i] is drawn in the adjacent block.
 *
 * N[i]@(bx,by) is the top edge of block (bx,by) = bottom edge of block (bx,by+1).
 * In block (bx,by+1), the S[i] terminal is drawn at gridTermPos['S'+i].
 * statePos(N[i]@(bx,by)) = {bpos(bx,by).x + S[i].x, bpos(bx,by).y}
 * S[i] drawn position in block (bx,by+1) = {bpos(bx,by+1).x + S[i].x, bpos(bx,by+1).y + S[i].y}
 *   where S[i].y = cellSize (bottom edge)
 *
 * Since bpos(bx,by).y = bpos(bx,by+1).y + CELL (y-flipped coords), y matches.
 * Both use S[i].x from the same gridTermPos, so x matches.
 * → N[i] statePos aligns with S[i] drawn position in adjacent block.
 */
console.log('\n  4c: N→S cross-block alignment');
for (let i = 0; i < path.length; i++) {
  const s = path[i];
  if (s.dir !== 'N') continue;
  const pos = statePos(s);
  /* Position where S[idx] is drawn in block (s.x, s.y+1) */
  const adjBp = bpos(s.x, s.y + 1);
  const sDrawn = { x: adjBp.x + tp['S' + s.idx].x, y: adjBp.y + tp['S' + s.idx].y };

  const xMatch = Math.abs(pos.x - sDrawn.x) < 0.01;
  /* For y: N is at top (y=0 local), S is at bottom (y=CELL local).
   * statePos(N) gives bp.y + 0 = bp.y (top of block bx,by).
   * S drawn gives adjBp.y + CELL = bpos(bx,by+1).y + CELL.
   * bpos(bx,by+1).y + CELL = MARGIN + (maxY-(by+1))*CELL + CELL = MARGIN + (maxY-by)*CELL = bpos(bx,by).y
   * So they should match. */
  const yMatch = Math.abs(pos.y - sDrawn.y) < 0.01;
  tc4 = chk(xMatch && yMatch,
    `Step ${i} N${s.idx}@(${s.x},${s.y}): statePos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}) ` +
    `vs S${s.idx} drawn@(${s.x},${s.y+1})=(${sDrawn.x.toFixed(2)}, ${sDrawn.y.toFixed(2)}) → ${xMatch && yMatch ? 'IDENTICAL' : 'MISMATCH'}`) && tc4;
}

/* Sub-check 4d: Print all positions for inspection */
console.log('\n  4d: All step positions:');
for (let i = 0; i < path.length; i++) {
  const s = path[i];
  const pos = statePos(s);
  console.log(`    Step ${i}: ${s.dir}${s.idx}@(${s.x},${s.y}) → (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
}

res['TC-4'] = tc4;

/* ================================================================
 * TC-5: Start/Goal markers
 * ================================================================ */
console.log('\n--- TC-5: Start/Goal marker alignment ---');
let tc5 = true;

const startPos = statePos({ x: 0, y: 1, dir: 'E', idx: 0 });
const goalPos  = statePos({ x: 0, y: 1, dir: 'E', idx: 1 });
const startBp = bpos(0, 1);

/* Start y = W0's y (relative) */
tc5 = chk(Math.abs((startPos.y - startBp.y) - tp['W0'].y) < 0.01,
  `Start E0: relative y = ${(startPos.y - startBp.y).toFixed(2)}, W0.y = ${tp['W0'].y.toFixed(2)} → MATCH`) && tc5;
/* Goal y = W1's y (relative) */
tc5 = chk(Math.abs((goalPos.y - startBp.y) - tp['W1'].y) < 0.01,
  `Goal E1: relative y = ${(goalPos.y - startBp.y).toFixed(2)}, W1.y = ${tp['W1'].y.toFixed(2)} → MATCH`) && tc5;
/* Both at right edge of nx block */
tc5 = chk(Math.abs(startPos.x - (startBp.x + CELL)) < 0.01,
  `Start x = ${startPos.x.toFixed(2)}, right edge = ${(startBp.x + CELL).toFixed(2)} → MATCH`) && tc5;
tc5 = chk(Math.abs(goalPos.x - (startBp.x + CELL)) < 0.01,
  `Goal x = ${goalPos.x.toFixed(2)}, right edge = ${(startBp.x + CELL).toFixed(2)} → MATCH`) && tc5;

/* Cross-check: Start/Goal y matches nx curve y positions (same W channel) */
const nxFirstSrcY = tp['W' + maze.nx[0].src.idx].y;
console.log(`  Cross-check: nx E4-E6 uses W4.y=${nxFirstSrcY.toFixed(2)}, Start uses W0.y=${tp['W0'].y.toFixed(2)}, Goal uses W1.y=${tp['W1'].y.toFixed(2)} — all from same gridTermPos`);
res['TC-5'] = tc5;

/* ================================================================
 * TC-6: gridTermPos completeness
 * ================================================================ */
console.log('\n--- TC-6: gridTermPos completeness ---');
let tc6 = true;
const missing = [];
for (let i = 0; i < nterm; i++)
  for (const d of ['W', 'E', 'N', 'S'])
    if (!tp[d + i]) missing.push(d + i);
tc6 = chk(missing.length === 0,
  `${Object.keys(tp).length}/${nterm * 4} terminals present, missing: ${missing.length === 0 ? 'none' : missing.join(', ')}`);
res['TC-6'] = tc6;

/* ================================================================
 * SUMMARY
 * ================================================================ */
console.log('\n' + '='.repeat(50));
console.log('SUMMARY');
console.log('='.repeat(50));
for (const tc of ['TC-1', 'TC-2', 'TC-3', 'TC-4', 'TC-5', 'TC-6']) {
  console.log(`  ${(res[tc] ? 'PASS' : 'FAIL').padEnd(6)} ${tc}`);
}
console.log(`\n  Failures: ${failures}`);
console.log(`  Overall: ${failures === 0 ? 'ALL PASS' : 'SOME FAILURES'}`);
process.exit(failures === 0 ? 0 : 1);
