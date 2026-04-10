#!/usr/bin/env node
/**
 * Comprehensive coordinate verification for Epic 1 fix.
 *
 * Extracts routeBlockPorts and statePos logic from index.html and verifies:
 *   TC-2: nx ports use W channel y, matching grid spine endpoints
 *   TC-3: ny ports use S channel x, matching grid spine endpoints
 *   TC-4: Answer path has no diagonal lines at block boundaries
 *   TC-5: Start/Goal markers match grid positions
 */

/* ---- Extracted from index.html ---- */

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
    grid.splice(atR, 0, Array(nC).fill(0));
    nR++;
    for (const cg of chG) {
      if (cg.src.r >= atR) cg.src.r++;
      if (cg.dst.r >= atR) cg.dst.r++;
    }
    for (const rt of allRoutes)
      for (const pt of rt)
        if (pt.r >= atR) pt.r++;
  }

  function insertCol(atC) {
    for (const row of grid) row.splice(atC, 0, 0);
    nC++;
    for (const cg of chG) {
      if (cg.src.c >= atC) cg.src.c++;
      if (cg.dst.c >= atC) cg.dst.c++;
    }
    for (const rt of allRoutes)
      for (const pt of rt)
        if (pt.c >= atC) pt.c++;
  }

  function isHVHFree(sg, dg, mc) {
    const c1lo = Math.min(sg.c, mc), c1hi = Math.max(sg.c, mc);
    for (let c = c1lo; c <= c1hi; c++)
      if (c !== sg.c && grid[sg.r][c] & H) return false;
    const rlo = Math.min(sg.r, dg.r), rhi = Math.max(sg.r, dg.r);
    for (let r = rlo; r <= rhi; r++)
      if (grid[r][mc] & V) return false;
    const c2lo = Math.min(mc, dg.c), c2hi = Math.max(mc, dg.c);
    for (let c = c2lo; c <= c2hi; c++)
      if (c !== dg.c && grid[dg.r][c] & H) return false;
    return true;
  }

  function isVHVFree(sg, dg, mr) {
    const r1lo = Math.min(sg.r, mr), r1hi = Math.max(sg.r, mr);
    for (let r = r1lo; r <= r1hi; r++)
      if (r !== sg.r && grid[r][sg.c] & V) return false;
    const clo = Math.min(sg.c, dg.c), chi = Math.max(sg.c, dg.c);
    for (let c = clo; c <= chi; c++)
      if (grid[mr][c] & H) return false;
    const r2lo = Math.min(mr, dg.r), r2hi = Math.max(mr, dg.r);
    for (let r = r2lo; r <= r2hi; r++)
      if (r !== dg.r && grid[r][dg.c] & V) return false;
    return true;
  }

  function placeH(r, c1, c2, route) {
    const step = c1 <= c2 ? 1 : -1;
    for (let c = c1; step > 0 ? c <= c2 : c >= c2; c += step) {
      grid[r][c] |= H;
      route.push({ r, c });
    }
  }

  function placeV(r1, r2, c, route) {
    const step = r1 <= r2 ? 1 : -1;
    for (let r = r1; step > 0 ? r <= r2 : r >= r2; r += step) {
      grid[r][c] |= V;
      route.push({ r, c });
    }
  }

  const portOrder = ports.map((_, i) => i);
  portOrder.sort((a, b) => {
    const pa = ports[a], pb = ports[b];
    const adjA = pa.src.dir !== pa.dst.dir && pa.src.dir !== opposite[pa.dst.dir] ? 0 : 1;
    const adjB = pb.src.dir !== pb.dst.dir && pb.src.dir !== opposite[pb.dst.dir] ? 0 : 1;
    return adjA - adjB;
  });

  for (const i of portOrder) {
    const p = ports[i];
    const sg = chG[i].src, dg = chG[i].dst;
    const route = [];

    function tryHVH(sg, dg, route) {
      if (sg.r === dg.r && sg.c !== dg.c) {
        const clo = Math.min(sg.c, dg.c), chi = Math.max(sg.c, dg.c);
        for (let c = clo; c <= chi; c++)
          if (c !== sg.c && c !== dg.c && grid[sg.r][c] & H) return false;
        placeH(sg.r, sg.c, dg.c, route);
        return true;
      }
      let mc = -1;
      if (dg.c >= 1 && dg.c < nC - 1 && isHVHFree(sg, dg, dg.c)) mc = dg.c;
      if (mc < 0)
        for (let c = 1; c < nC - 1; c++)
          if (isHVHFree(sg, dg, c)) { mc = c; break; }
      if (mc < 0)
        for (let c = 0; c < nC; c++)
          if (isHVHFree(sg, dg, c)) { mc = c; break; }
      if (mc < 0) return false;
      placeH(sg.r, sg.c, mc, route);
      if (sg.r !== dg.r) placeV(sg.r, dg.r, mc, route);
      if (mc !== dg.c) placeH(dg.r, mc, dg.c, route);
      return true;
    }

    function tryVHV(sg, dg, route) {
      if (sg.c === dg.c && sg.r !== dg.r) {
        const rlo = Math.min(sg.r, dg.r), rhi = Math.max(sg.r, dg.r);
        for (let r = rlo; r <= rhi; r++)
          if (r !== sg.r && r !== dg.r && grid[r][sg.c] & V) return false;
        placeV(sg.r, dg.r, sg.c, route);
        return true;
      }
      let mr = -1;
      if (dg.r >= 1 && dg.r < nR - 1 && isVHVFree(sg, dg, dg.r)) mr = dg.r;
      if (mr < 0)
        for (let r = 1; r < nR - 1; r++)
          if (isVHVFree(sg, dg, r)) { mr = r; break; }
      if (mr < 0)
        for (let r = 0; r < nR; r++)
          if (isVHVFree(sg, dg, r)) { mr = r; break; }
      if (mr < 0) return false;
      placeV(sg.r, mr, sg.c, route);
      if (sg.c !== dg.c) placeH(mr, sg.c, dg.c, route);
      if (mr !== dg.r) placeV(mr, dg.r, dg.c, route);
      return true;
    }

    if (sg.r === dg.r && sg.c === dg.c) {
      /* same cell */
    } else {
      const first = isLR(p.src.dir) ? tryHVH : tryVHV;
      const second = isLR(p.src.dir) ? tryVHV : tryHVH;
      let ok = first(sg, dg, route) || second(sg, dg, route);
      while (!ok) {
        insertCol(nC - 1);
        insertRow(nR - 1);
        ok = first(sg, dg, route) || second(sg, dg, route);
      }
    }
    allRoutes.push(route);
  }

  const cW = cellSize / nC, rH = cellSize / nR;
  const toXY = pt => ({ x: (pt.c + 0.5) * cW, y: (pt.r + 0.5) * rH });

  const pixelRoutes = allRoutes.map(route => {
    const seen = new Set();
    const pts = [];
    for (const pt of route) {
      const k = pt.r + ',' + pt.c;
      if (!seen.has(k)) { seen.add(k); pts.push(toXY(pt)); }
    }
    return pts;
  });

  const spines = [];
  for (const [k, arr] of Object.entries(termPorts)) {
    const dir = k[0];
    const channels = arr.map(({ pi, end }) => toXY(chG[pi][end]));
    if (isLR(dir)) {
      channels.sort((a, b) => a.y - b.y);
      const edgeX = dir === 'W' ? 0 : cellSize;
      const spineX = channels[0].x;
      spines.push({ key: k, pts: [{ x: edgeX, y: channels[0].y }, { x: spineX, y: channels[0].y }] });
      if (channels.length > 1)
        spines.push({ key: k + '_vert', pts: [{ x: spineX, y: channels[0].y },
                     { x: spineX, y: channels[channels.length - 1].y }] });
    } else {
      channels.sort((a, b) => a.x - b.x);
      const edgeY = dir === 'N' ? 0 : cellSize;
      const spineY = channels[0].y;
      spines.push({ key: k, pts: [{ x: channels[0].x, y: edgeY }, { x: channels[0].x, y: spineY }] });
      if (channels.length > 1)
        spines.push({ key: k + '_horiz', pts: [{ x: channels[0].x, y: spineY },
                     { x: channels[channels.length - 1].x, y: spineY }] });
    }
  }

  const junctions = [];
  for (const [k, arr] of Object.entries(termPorts)) {
    if (arr.length < 2) continue;
    const dir = k[0];
    const channels = arr.map(({ pi, end }) => toXY(chG[pi][end]));
    if (isLR(dir)) {
      channels.sort((a, b) => a.y - b.y);
      const sx = channels[0].x;
      for (let j = 0; j < channels.length - 1; j++)
        junctions.push({ x: sx, y: channels[j].y });
    } else {
      channels.sort((a, b) => a.x - b.x);
      const sy = channels[0].y;
      for (let j = 0; j < channels.length - 1; j++)
        junctions.push({ x: channels[j].x, y: sy });
    }
  }

  const termPos = {};
  for (const [k, arr] of Object.entries(termPorts)) {
    const dir = k[0];
    const channels = arr.map(({ pi, end }) => toXY(chG[pi][end]));
    if (isLR(dir)) {
      channels.sort((a, b) => a.y - b.y);
      const edgeX = dir === 'W' ? 0 : cellSize;
      termPos[k] = { x: edgeX, y: channels[0].y };
    } else {
      channels.sort((a, b) => a.x - b.x);
      const edgeY = dir === 'N' ? 0 : cellSize;
      termPos[k] = { x: channels[0].x, y: edgeY };
    }
  }

  for (let i = 0; i < nterm; i++) {
    const t = cellSize * (i + 1) / (nterm + 1);
    if (!termPos['W' + i]) termPos['W' + i] = { x: 0, y: t };
    if (!termPos['E' + i]) termPos['E' + i] = { x: cellSize, y: t };
    if (!termPos['N' + i]) termPos['N' + i] = { x: t, y: 0 };
    if (!termPos['S' + i]) termPos['S' + i] = { x: t, y: cellSize };
  }

  return { routes: pixelRoutes, spines, junctions, termPos, _debug: { termPorts, chG, chMap, pW, pE, pN, pS, nR, nC, portOrder } };
}

/* ================================================================
 *                    TEST RUNNER
 * ================================================================ */

const MAZE_INPUT = `normal: W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7, W7-E8, W8-S2, N2-W6, E9-W10, W10-N3, S3-W9, W11-E12, W12-E13, W13-S4, N4-W11, E14-W15, W15-N5, S5-W14, W16-S6, N6-W16, S7-W4, S8-W9, S9-W14, S10-W1; nx: E4-E6, E9-E11, E14-E16; ny: N0-N7, N2-N8, N4-N9, N6-N10`;

const maze = parseMaze(MAZE_INPUT);
const nterm = detectNterm(maze, []);
const CELL = BASE_CELL;  // 240

/* Deduplicate for undirected mode */
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
const dbg = result._debug;

console.log(`nterm=${nterm}, CELL=${CELL}`);
console.log(`Grid: ${dbg.nR} rows × ${dbg.nC} cols`);
console.log(`Channels: pW=${dbg.pW}, pE=${dbg.pE}, pN=${dbg.pN}, pS=${dbg.pS}`);
console.log(`Routes: ${result.routes.length}, Spines: ${result.spines.length}`);

let failures = 0;
const results = {};

function check(name, cond, detail) {
  if (cond) {
    console.log(`  PASS: ${detail}`);
  } else {
    console.log(`  FAIL: ${detail}`);
    failures++;
  }
  return cond;
}

/* ================================================================
 * TC-2: nx ports — W channel y alignment
 * ================================================================ */
console.log('\n' + '='.repeat(60));
console.log('TC-2: nx block — W channel y grid alignment');
console.log('='.repeat(60));

let tc2Pass = true;
for (const port of maze.nx) {
  const si = port.src.idx, di = port.dst.idx;
  console.log(`\n  nx port E${si}-E${di}:`);

  /* What the nx drawing code uses: gridTermPos['W'+idx].y */
  const wSrcY = tp['W' + si].y;
  const wDstY = tp['W' + di].y;
  console.log(`    Code uses: W${si}.y = ${wSrcY.toFixed(2)}, W${di}.y = ${wDstY.toFixed(2)}`);

  /* Find the W terminal spine endpoint y on the block edge */
  const wSrcSpine = result.spines.find(s => s.key === 'W' + si);
  const wDstSpine = result.spines.find(s => s.key === 'W' + di);

  if (wSrcSpine) {
    const spineEdgeY = wSrcSpine.pts[0].y; // first point = edge position
    const match = Math.abs(wSrcY - spineEdgeY) < 0.01;
    tc2Pass = check('TC-2', match,
      `W${si} spine edge y = ${spineEdgeY.toFixed(2)}, termPos y = ${wSrcY.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc2Pass;
  } else {
    console.log(`    W${si}: no spine (non-participating) — uses default y = ${wSrcY.toFixed(2)}`);
    /* Non-participating terminal: verify it has termLocalPos-equivalent default */
    const defaultY = CELL * (si + 1) / (nterm + 1);
    const match = Math.abs(wSrcY - defaultY) < 0.01;
    tc2Pass = check('TC-2', match,
      `W${si} default y = ${defaultY.toFixed(2)}, termPos y = ${wSrcY.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc2Pass;
  }

  if (wDstSpine) {
    const spineEdgeY = wDstSpine.pts[0].y;
    const match = Math.abs(wDstY - spineEdgeY) < 0.01;
    tc2Pass = check('TC-2', match,
      `W${di} spine edge y = ${spineEdgeY.toFixed(2)}, termPos y = ${wDstY.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc2Pass;
  } else {
    console.log(`    W${di}: no spine (non-participating) — uses default y = ${wDstY.toFixed(2)}`);
    const defaultY = CELL * (di + 1) / (nterm + 1);
    const match = Math.abs(wDstY - defaultY) < 0.01;
    tc2Pass = check('TC-2', match,
      `W${di} default y = ${defaultY.toFixed(2)}, termPos y = ${wDstY.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc2Pass;
  }

  /* Verify the nx curve endpoints are at the correct y on the right edge */
  console.log(`    → nx curve: from (CELL, ${wSrcY.toFixed(2)}) to (CELL, ${wDstY.toFixed(2)})`);
}
results['TC-2'] = tc2Pass ? 'PASS' : 'FAIL';

/* ================================================================
 * TC-3: ny ports — S channel x alignment
 * ================================================================ */
console.log('\n' + '='.repeat(60));
console.log('TC-3: ny block — S channel x grid alignment');
console.log('  (code uses gridTermPos[\'S\'+idx].x per spec correction)');
console.log('='.repeat(60));

let tc3Pass = true;
for (const port of maze.ny) {
  const si = port.src.idx, di = port.dst.idx;
  console.log(`\n  ny port N${si}-N${di}:`);

  /* What the ny drawing code uses: gridTermPos['S'+idx].x */
  const sSrcX = tp['S' + si].x;
  const sDstX = tp['S' + di].x;
  console.log(`    Code uses: S${si}.x = ${sSrcX.toFixed(2)}, S${di}.x = ${sDstX.toFixed(2)}`);

  /* Find the S terminal spine endpoint x on the block edge */
  const sSrcSpine = result.spines.find(s => s.key === 'S' + si);
  const sDstSpine = result.spines.find(s => s.key === 'S' + di);

  if (sSrcSpine) {
    const spineEdgeX = sSrcSpine.pts[0].x;
    const match = Math.abs(sSrcX - spineEdgeX) < 0.01;
    tc3Pass = check('TC-3', match,
      `S${si} spine edge x = ${spineEdgeX.toFixed(2)}, termPos x = ${sSrcX.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc3Pass;
  } else {
    console.log(`    S${si}: no spine (non-participating) — uses default x = ${sSrcX.toFixed(2)}`);
    const defaultX = CELL * (si + 1) / (nterm + 1);
    const match = Math.abs(sSrcX - defaultX) < 0.01;
    tc3Pass = check('TC-3', match,
      `S${si} default x = ${defaultX.toFixed(2)}, termPos x = ${sSrcX.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc3Pass;
  }

  if (sDstSpine) {
    const spineEdgeX = sDstSpine.pts[0].x;
    const match = Math.abs(sDstX - spineEdgeX) < 0.01;
    tc3Pass = check('TC-3', match,
      `S${di} spine edge x = ${spineEdgeX.toFixed(2)}, termPos x = ${sDstX.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc3Pass;
  } else {
    console.log(`    S${di}: no spine (non-participating) — uses default x = ${sDstX.toFixed(2)}`);
    const defaultX = CELL * (di + 1) / (nterm + 1);
    const match = Math.abs(sDstX - defaultX) < 0.01;
    tc3Pass = check('TC-3', match,
      `S${di} default x = ${defaultX.toFixed(2)}, termPos x = ${sDstX.toFixed(2)} → ${match ? 'MATCH' : 'MISMATCH'}`) && tc3Pass;
  }

  console.log(`    → ny curve: from (${sSrcX.toFixed(2)}, 0) to (${sDstX.toFixed(2)}, 0)`);
}
results['TC-3'] = tc3Pass ? 'PASS' : 'FAIL';

/* ================================================================
 * TC-4: Answer path — no diagonal at block boundaries
 * ================================================================ */
console.log('\n' + '='.repeat(60));
console.log('TC-4: Answer path — no diagonal lines at block boundaries');
console.log('='.repeat(60));

const path = [
  { x: 0, y: 1, dir: 'E', idx: 0 },
  { x: 1, y: 1, dir: 'N', idx: 0 },
  { x: 0, y: 2, dir: 'E', idx: 2 },
  { x: 1, y: 1, dir: 'N', idx: 1 },
  { x: 0, y: 1, dir: 'E', idx: 1 },
];

/* Simulate bpos with bounds from this path */
const minX = 0, maxX = 1, minY = 1, maxY = 2;
const MARGIN = BASE_MARGIN;
function bpos(bx, by) {
  return { x: MARGIN + (bx - minX) * CELL, y: MARGIN + (maxY - by) * CELL };
}

/* Simulate statePos exactly as in index.html L.685-701
 * (uses 'S' for N states, 'W' for E states) */
function statePos(s) {
  const bp = bpos(s.x, s.y);
  /* E[i]@(x,y) = W[i]@(x+1,y): use W[i]'s y */
  if (s.dir === 'E') {
    const wk = 'W' + s.idx;
    if (tp[wk])
      return { x: bp.x + CELL, y: bp.y + tp[wk].y };
  }
  /* N[i]@(x,y) = S[i]@(x,y+1): use S[i]'s x */
  if (s.dir === 'N') {
    const sk = 'S' + s.idx;
    if (tp[sk])
      return { x: bp.x + tp[sk].x, y: bp.y };
  }
  const tlp = termLocalPos(s.dir, s.idx, nterm, CELL);
  return { x: bp.x + tlp.x, y: bp.y + tlp.y };
}

let tc4Pass = true;
const positions = path.map((s, i) => {
  const pos = statePos(s);
  console.log(`  Step ${i}: ${s.dir}${s.idx}@(${s.x},${s.y}) → pixel (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
  return pos;
});

/* Check: consecutive states sharing a physical boundary must have
 * identical x or y to avoid diagonal lines.
 *
 * Identify boundary-sharing pairs:
 * - E[i]@(bx,by) = W[i]@(bx+1,by):
 *   If step A is E[i]@(bx,by) and step B is anything at (bx+1,by),
 *   the E→W transition puts them at the same x (boundary x).
 *   The key check: E[i]@(bx, by) position.x == bpos(bx+1,by).x
 *
 * - N[i]@(bx,by) = S[i]@(bx,by+1):
 *   If step A is N[i]@(bx,by) and step B is anything at (bx,by+1),
 *   the N→S transition puts them at the same y (boundary y).
 *   The key check: N[i]@(bx,by) position.y == bpos(bx,by).y == bpos(bx,by+1).y + CELL
 */

console.log('\n  Boundary alignment checks:');
for (let i = 0; i < path.length - 1; i++) {
  const a = path[i], b = path[i + 1];
  const pa = positions[i], pb = positions[i + 1];

  /* Check if these share an E→W boundary */
  if (a.dir === 'E' && a.x + 1 === b.x && a.y === b.y) {
    /* E[i]@(bx,by) to something@(bx+1,by): pa.x should be at the boundary */
    const boundaryX = bpos(b.x, b.y).x;  // left edge of block (bx+1,by)
    const match = Math.abs(pa.x - boundaryX) < 0.01;
    tc4Pass = check('TC-4', match,
      `Step ${i}→${i+1}: E${a.idx}@(${a.x},${a.y}).x = ${pa.x.toFixed(2)}, boundary x = ${boundaryX.toFixed(2)} → ${match ? 'ALIGNED' : 'DIAGONAL'}`) && tc4Pass;
  }

  /* Check if these share an N→S boundary */
  if (a.dir === 'N' && a.x === b.x && a.y + 1 === b.y) {
    const boundaryY = bpos(a.x, a.y).y;  // top edge of block (bx,by) = bottom of (bx,by+1)
    const match = Math.abs(pa.y - boundaryY) < 0.01;
    tc4Pass = check('TC-4', match,
      `Step ${i}→${i+1}: N${a.idx}@(${a.x},${a.y}).y = ${pa.y.toFixed(2)}, boundary y = ${boundaryY.toFixed(2)} → ${match ? 'ALIGNED' : 'DIAGONAL'}`) && tc4Pass;
  }

  /* Also check: for canonical equivalences, the SAME physical point
   * represented differently should give identical coordinates.
   * E[i]@(bx,by) should have same coords as W[i]@(bx+1,by) */
  if (a.dir === 'E') {
    const equiv = { x: a.x + 1, y: a.y, dir: 'W', idx: a.idx };
    const equivPos = statePos(equiv);
    const xMatch = Math.abs(pa.x - equivPos.x) < 0.01;
    const yMatch = Math.abs(pa.y - equivPos.y) < 0.01;
    tc4Pass = check('TC-4', xMatch && yMatch,
      `Step ${i}: E${a.idx}@(${a.x},${a.y}) = W${a.idx}@(${equiv.x},${equiv.y}): ` +
      `(${pa.x.toFixed(2)},${pa.y.toFixed(2)}) vs (${equivPos.x.toFixed(2)},${equivPos.y.toFixed(2)}) → ${xMatch && yMatch ? 'IDENTICAL' : 'MISMATCH'}`) && tc4Pass;
  }
  if (a.dir === 'N') {
    const equiv = { x: a.x, y: a.y + 1, dir: 'S', idx: a.idx };
    const equivPos = statePos(equiv);
    const xMatch = Math.abs(pa.x - equivPos.x) < 0.01;
    const yMatch = Math.abs(pa.y - equivPos.y) < 0.01;
    tc4Pass = check('TC-4', xMatch && yMatch,
      `Step ${i}: N${a.idx}@(${a.x},${a.y}) = S${a.idx}@(${equiv.x},${equiv.y}): ` +
      `(${pa.x.toFixed(2)},${pa.y.toFixed(2)}) vs (${equivPos.x.toFixed(2)},${equivPos.y.toFixed(2)}) → ${xMatch && yMatch ? 'IDENTICAL' : 'MISMATCH'}`) && tc4Pass;
  }
}

/* Check statePos never falls back to termLocalPos */
console.log('\n  Fallback check (statePos should never use termLocalPos):');
for (let i = 0; i < path.length; i++) {
  const s = path[i];
  let usedGrid = false;
  if (s.dir === 'E' && tp['W' + s.idx]) usedGrid = true;
  if (s.dir === 'N' && tp['S' + s.idx]) usedGrid = true;
  if (s.dir === 'W' && tp['W' + s.idx]) usedGrid = true;
  if (s.dir === 'S' && tp['S' + s.idx]) usedGrid = true;
  tc4Pass = check('TC-4', usedGrid,
    `Step ${i} ${s.dir}${s.idx}: gridTermPos lookup → ${usedGrid ? 'HIT' : 'MISS (fallback!)'}`) && tc4Pass;
}
results['TC-4'] = tc4Pass ? 'PASS' : 'FAIL';

/* ================================================================
 * TC-5: Start/Goal marker positions
 * ================================================================ */
console.log('\n' + '='.repeat(60));
console.log('TC-5: Start/Goal marker grid alignment');
console.log('='.repeat(60));

let tc5Pass = true;
const startState = { x: 0, y: 1, dir: 'E', idx: 0 };
const goalState  = { x: 0, y: 1, dir: 'E', idx: 1 };
const startPos = statePos(startState);
const goalPos  = statePos(goalState);

console.log(`  Start E0@(0,1): pixel (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)})`);
console.log(`  Goal  E1@(0,1): pixel (${goalPos.x.toFixed(2)}, ${goalPos.y.toFixed(2)})`);

/* Start y must equal termPos['W0'].y (relative to block) */
const startBp = bpos(0, 1);
const startRelY = startPos.y - startBp.y;
const w0Y = tp['W0'].y;
tc5Pass = check('TC-5', Math.abs(startRelY - w0Y) < 0.01,
  `Start: block-relative y = ${startRelY.toFixed(2)}, W0.y = ${w0Y.toFixed(2)} → ${Math.abs(startRelY - w0Y) < 0.01 ? 'MATCH' : 'MISMATCH'}`) && tc5Pass;

/* Goal y must equal termPos['W1'].y */
const goalRelY = goalPos.y - startBp.y;
const w1Y = tp['W1'].y;
tc5Pass = check('TC-5', Math.abs(goalRelY - w1Y) < 0.01,
  `Goal: block-relative y = ${goalRelY.toFixed(2)}, W1.y = ${w1Y.toFixed(2)} → ${Math.abs(goalRelY - w1Y) < 0.01 ? 'MATCH' : 'MISMATCH'}`) && tc5Pass;

/* Start/Goal x must be at right edge of nx block (bpos(0,1).x + CELL) */
const expectedX = startBp.x + CELL;
tc5Pass = check('TC-5', Math.abs(startPos.x - expectedX) < 0.01,
  `Start x = ${startPos.x.toFixed(2)}, expected (block right edge) = ${expectedX.toFixed(2)} → ${Math.abs(startPos.x - expectedX) < 0.01 ? 'MATCH' : 'MISMATCH'}`) && tc5Pass;
tc5Pass = check('TC-5', Math.abs(goalPos.x - expectedX) < 0.01,
  `Goal x = ${goalPos.x.toFixed(2)}, expected (block right edge) = ${expectedX.toFixed(2)} → ${Math.abs(goalPos.x - expectedX) < 0.01 ? 'MATCH' : 'MISMATCH'}`) && tc5Pass;

/* Verify Start/Goal y matches nx curve endpoints */
/* nx curves for E4-E6 etc. use W channel y. Start uses W0.y, Goal uses W1.y.
 * These are part of the same grid, so positions are consistent. */
console.log(`\n  Cross-check with nx port positions:`);
for (const port of maze.nx) {
  const wSrcY = tp['W' + port.src.idx].y;
  const wDstY = tp['W' + port.dst.idx].y;
  console.log(`    E${port.src.idx}-E${port.dst.idx} curve y: ${wSrcY.toFixed(2)}, ${wDstY.toFixed(2)}`);
}
console.log(`    Start (W0) y: ${w0Y.toFixed(2)}, Goal (W1) y: ${w1Y.toFixed(2)}`);
console.log(`    All use same gridTermPos → consistent`);

results['TC-5'] = tc5Pass ? 'PASS' : 'FAIL';

/* ================================================================
 * TC-6: gridTermPos completeness (quick re-verify)
 * ================================================================ */
console.log('\n' + '='.repeat(60));
console.log('TC-6: gridTermPos all-terminal coverage');
console.log('='.repeat(60));

let tc6Pass = true;
const missing = [];
for (let i = 0; i < nterm; i++) {
  for (const d of ['W', 'E', 'N', 'S']) {
    if (!tp[d + i]) missing.push(d + i);
  }
}
tc6Pass = check('TC-6', missing.length === 0,
  `${Object.keys(tp).length} / ${nterm * 4} terminal positions present. Missing: ${missing.length === 0 ? 'none' : missing.join(', ')}`);
results['TC-6'] = tc6Pass ? 'PASS' : 'FAIL';

/* ================================================================
 * TC-1: Route orthogonality
 * ================================================================ */
console.log('\n' + '='.repeat(60));
console.log('TC-1: All routes are orthogonal (H/V segments only)');
console.log('='.repeat(60));

let tc1Pass = true;
let diagonalCount = 0;
for (let ri = 0; ri < result.routes.length; ri++) {
  const route = result.routes[ri];
  for (let pi = 1; pi < route.length; pi++) {
    const dx = Math.abs(route[pi].x - route[pi-1].x);
    const dy = Math.abs(route[pi].y - route[pi-1].y);
    if (dx > 0.001 && dy > 0.001) {
      console.log(`  FAIL: Route ${ri} seg ${pi-1}→${pi}: diagonal (dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`);
      diagonalCount++;
      tc1Pass = false;
    }
  }
}
tc1Pass = check('TC-1', diagonalCount === 0,
  `${result.routes.length} routes, ${diagonalCount} diagonal segments found`);
results['TC-1'] = tc1Pass ? 'PASS' : 'FAIL';

/* ================================================================
 *                    SUMMARY
 * ================================================================ */
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
const order = ['TC-1', 'TC-2', 'TC-3', 'TC-4', 'TC-5', 'TC-6'];
for (const tc of order) {
  console.log(`  ${(results[tc] || '???').padEnd(6)} ${tc}`);
}
console.log(`\n  Total failures: ${failures}`);
console.log(`  Overall: ${failures === 0 ? 'ALL PASS' : 'SOME FAILURES'}`);
process.exit(failures === 0 ? 0 : 1);
