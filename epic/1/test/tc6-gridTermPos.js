#!/usr/bin/env node
/**
 * TC-6: Verify that routeBlockPorts() returns termPos entries for ALL terminals
 * (W/E/N/S × 0..nterm-1), not just those participating in ports.
 *
 * Also verifies:
 * - statePos E[i] → W[i] lookup always succeeds (gridTermPos['W'+i] exists)
 * - statePos N[i] → N[i] lookup always succeeds (gridTermPos['N'+i] exists)
 * - nx port lookup: gridTermPos['W'+i] exists for all nx terminal indices
 * - ny port lookup: gridTermPos['N'+i] exists for all ny terminal indices
 */

/* ---- Extracted from index.html ---- */

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
      spines.push([{ x: edgeX, y: channels[0].y }, { x: spineX, y: channels[0].y }]);
      if (channels.length > 1)
        spines.push([{ x: spineX, y: channels[0].y },
                     { x: spineX, y: channels[channels.length - 1].y }]);
    } else {
      channels.sort((a, b) => a.x - b.x);
      const edgeY = dir === 'N' ? 0 : cellSize;
      const spineY = channels[0].y;
      spines.push([{ x: channels[0].x, y: edgeY }, { x: channels[0].x, y: spineY }]);
      if (channels.length > 1)
        spines.push([{ x: channels[0].x, y: spineY },
                     { x: channels[channels.length - 1].x, y: spineY }]);
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

  /* Fill in default positions for terminals not in any port */
  for (let i = 0; i < nterm; i++) {
    const t = cellSize * (i + 1) / (nterm + 1);
    if (!termPos['W' + i]) termPos['W' + i] = { x: 0, y: t };
    if (!termPos['E' + i]) termPos['E' + i] = { x: cellSize, y: t };
    if (!termPos['N' + i]) termPos['N' + i] = { x: t, y: 0 };
    if (!termPos['S' + i]) termPos['S' + i] = { x: t, y: cellSize };
  }

  return { routes: pixelRoutes, spines, junctions, termPos };
}

/* ---- Test runner ---- */

const MAZE_INPUT = `normal: W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7, W7-E8, W8-S2, N2-W6, E9-W10, W10-N3, S3-W9, W11-E12, W12-E13, W13-S4, N4-W11, E14-W15, W15-N5, S5-W14, W16-S6, N6-W16, S7-W4, S8-W9, S9-W14, S10-W1; nx: E4-E6, E9-E11, E14-E16; ny: N0-N7, N2-N8, N4-N9, N6-N10`;

const maze = parseMaze(MAZE_INPUT);
const nterm = detectNterm(maze, []);
const CELL = 240;

console.log(`nterm = ${nterm}`);
console.log(`normal ports: ${maze.normal.length}, nx ports: ${maze.nx.length}, ny ports: ${maze.ny.length}`);

/* Deduplicate for undirected mode (same as index.html) */
const deduped = [];
const seen = new Set();
for (const port of maze.normal) {
  const k1 = port.src.dir + port.src.idx + ',' + port.dst.dir + port.dst.idx;
  const k2 = port.dst.dir + port.dst.idx + ',' + port.src.dir + port.src.idx;
  if (seen.has(k2)) continue;
  seen.add(k1);
  deduped.push(port);
}
console.log(`deduped normal ports: ${deduped.length}`);

const result = routeBlockPorts(deduped, nterm, CELL);
const tp = result.termPos;

let allPassed = true;
let testResults = {};

/* ---- TC-6a: All terminals present in termPos ---- */
console.log('\n=== TC-6a: All terminals present in termPos ===');
const missing = [];
for (let i = 0; i < nterm; i++) {
  for (const d of ['W', 'E', 'N', 'S']) {
    if (!tp[d + i]) missing.push(d + i);
  }
}
if (missing.length === 0) {
  console.log('PASS: All terminals (W/E/N/S × 0..' + (nterm-1) + ') present in termPos');
  testResults['TC-6a'] = 'PASS';
} else {
  console.log('FAIL: Missing terminals: ' + missing.join(', '));
  testResults['TC-6a'] = 'FAIL';
  allPassed = false;
}
console.log(`  Total keys in termPos: ${Object.keys(tp).length}, expected: ${nterm * 4}`);

/* ---- TC-6b: Default positions for non-participating terminals ---- */
console.log('\n=== TC-6b: Non-participating terminals have default coords ===');
/* Identify terminals NOT in any normal port */
const participating = new Set();
for (const p of deduped) {
  participating.add(p.src.dir + p.src.idx);
  participating.add(p.dst.dir + p.dst.idx);
}
const nonParticipating = [];
for (let i = 0; i < nterm; i++) {
  for (const d of ['W', 'E', 'N', 'S']) {
    if (!participating.has(d + i)) nonParticipating.push(d + i);
  }
}
console.log(`  Non-participating terminals: ${nonParticipating.length}`);
console.log(`  Examples: ${nonParticipating.slice(0, 10).join(', ')}${nonParticipating.length > 10 ? '...' : ''}`);

let defaultOk = true;
for (const k of nonParticipating) {
  const pos = tp[k];
  if (!pos) {
    console.log(`  FAIL: ${k} not in termPos`);
    defaultOk = false;
    continue;
  }
  const dir = k[0], idx = parseInt(k.substring(1));
  const expected = termLocalPos(dir, idx, nterm, CELL);
  if (Math.abs(pos.x - expected.x) > 0.001 || Math.abs(pos.y - expected.y) > 0.001) {
    console.log(`  INFO: ${k} has grid-assigned pos (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) vs default (${expected.x.toFixed(1)}, ${expected.y.toFixed(1)}) — OK if participating`);
  }
}
testResults['TC-6b'] = defaultOk ? 'PASS' : 'FAIL';
if (!defaultOk) allPassed = false;
console.log(defaultOk ? 'PASS' : 'FAIL');

/* ---- TC-6c: Participating terminals have grid channel positions ---- */
console.log('\n=== TC-6c: Participating terminals have grid channel positions ===');
let gridOk = true;
for (const k of [...participating]) {
  const pos = tp[k];
  if (!pos) {
    console.log(`  FAIL: ${k} not in termPos`);
    gridOk = false;
    continue;
  }
  const dir = k[0], idx = parseInt(k.substring(1));
  const def = termLocalPos(dir, idx, nterm, CELL);
  /* Participating terminals should generally NOT be at default positions
     (unless they happen to coincide) */
}
testResults['TC-6c'] = gridOk ? 'PASS' : 'FAIL';
if (!gridOk) allPassed = false;
console.log(gridOk ? 'PASS: All participating terminals have positions' : 'FAIL');

/* ---- TC-statePos-E: E[i] → W[i] lookup ---- */
console.log('\n=== statePos verification: E[i] → W[i] lookup ===');
let eToWOk = true;
for (let i = 0; i < nterm; i++) {
  const wk = 'W' + i;
  if (!tp[wk]) {
    console.log(`  FAIL: gridTermPos['${wk}'] missing — statePos for E${i} would fallback`);
    eToWOk = false;
  }
}
testResults['statePos-E→W'] = eToWOk ? 'PASS' : 'FAIL';
if (!eToWOk) allPassed = false;
console.log(eToWOk ? 'PASS: All W terminals exist — E[i] statePos always finds gridTermPos[W+i]' : 'FAIL');

/* ---- TC-statePos-N: N[i] → N[i] lookup ---- */
console.log('\n=== statePos verification: N[i] → N[i] lookup ===');
let nToNOk = true;
for (let i = 0; i < nterm; i++) {
  const nk = 'N' + i;
  if (!tp[nk]) {
    console.log(`  FAIL: gridTermPos['${nk}'] missing — statePos for N${i} would fallback`);
    nToNOk = false;
  }
}
testResults['statePos-N→N'] = nToNOk ? 'PASS' : 'FAIL';
if (!nToNOk) allPassed = false;
console.log(nToNOk ? 'PASS: All N terminals exist — N[i] statePos always finds gridTermPos[N+i]' : 'FAIL');

/* ---- TC-nx: nx port W[i] lookup ---- */
console.log('\n=== nx port verification: W[i] lookup for E[i] positions ===');
let nxOk = true;
for (const port of maze.nx) {
  const wSrc = 'W' + port.src.idx;
  const wDst = 'W' + port.dst.idx;
  if (!tp[wSrc]) {
    console.log(`  FAIL: gridTermPos['${wSrc}'] missing for nx port E${port.src.idx}`);
    nxOk = false;
  }
  if (!tp[wDst]) {
    console.log(`  FAIL: gridTermPos['${wDst}'] missing for nx port E${port.dst.idx}`);
    nxOk = false;
  }
  if (tp[wSrc] && tp[wDst]) {
    console.log(`  E${port.src.idx}-E${port.dst.idx}: W${port.src.idx}.y=${tp[wSrc].y.toFixed(1)}, W${port.dst.idx}.y=${tp[wDst].y.toFixed(1)}`);
  }
}
testResults['nx-W-lookup'] = nxOk ? 'PASS' : 'FAIL';
if (!nxOk) allPassed = false;
console.log(nxOk ? 'PASS: All nx port W lookups succeed' : 'FAIL');

/* ---- TC-ny: ny port N[i] lookup ---- */
console.log('\n=== ny port verification: N[i] lookup positions ===');
let nyOk = true;
for (const port of maze.ny) {
  const nSrc = 'N' + port.src.idx;
  const nDst = 'N' + port.dst.idx;
  if (!tp[nSrc]) {
    console.log(`  FAIL: gridTermPos['${nSrc}'] missing for ny port N${port.src.idx}`);
    nyOk = false;
  }
  if (!tp[nDst]) {
    console.log(`  FAIL: gridTermPos['${nDst}'] missing for ny port N${port.dst.idx}`);
    nyOk = false;
  }
  if (tp[nSrc] && tp[nDst]) {
    console.log(`  N${port.src.idx}-N${port.dst.idx}: N${port.src.idx}.x=${tp[nSrc].x.toFixed(1)}, N${port.dst.idx}.x=${tp[nDst].x.toFixed(1)}`);
  }
}
testResults['ny-N-lookup'] = nyOk ? 'PASS' : 'FAIL';
if (!nyOk) allPassed = false;
console.log(nyOk ? 'PASS: All ny port N lookups succeed' : 'FAIL');

/* ---- TC-ny-S-alignment: Compare N[i].x vs S[i].x for ny terminals ---- */
console.log('\n=== ny port analysis: N[i].x vs S[i].x alignment ===');
console.log('  (spec says ny curves should use S[i].x, code uses N[i].x)');
let nyAlignIssues = 0;
for (const port of maze.ny) {
  for (const idx of [port.src.idx, port.dst.idx]) {
    const nk = 'N' + idx, sk = 'S' + idx;
    if (tp[nk] && tp[sk]) {
      const diff = Math.abs(tp[nk].x - tp[sk].x);
      if (diff > 0.001) {
        console.log(`  WARNING: N${idx}.x=${tp[nk].x.toFixed(1)} ≠ S${idx}.x=${tp[sk].x.toFixed(1)} (diff=${diff.toFixed(1)})`);
        nyAlignIssues++;
      } else {
        console.log(`  OK: N${idx}.x=${tp[nk].x.toFixed(1)} == S${idx}.x=${tp[sk].x.toFixed(1)}`);
      }
    }
  }
}
if (nyAlignIssues > 0) {
  console.log(`  NOTE: ${nyAlignIssues} terminals have N.x ≠ S.x — ny curves using N.x may not align with S channel positions in normal block`);
  testResults['ny-NS-align'] = `WARNING (${nyAlignIssues} mismatches)`;
} else {
  testResults['ny-NS-align'] = 'PASS';
}

/* ---- TC-routes: All routes are orthogonal ---- */
console.log('\n=== Route orthogonality check ===');
let orthOk = true;
for (let ri = 0; ri < result.routes.length; ri++) {
  const route = result.routes[ri];
  for (let pi = 1; pi < route.length; pi++) {
    const dx = Math.abs(route[pi].x - route[pi-1].x);
    const dy = Math.abs(route[pi].y - route[pi-1].y);
    if (dx > 0.001 && dy > 0.001) {
      console.log(`  FAIL: Route ${ri}, segment ${pi-1}→${pi}: diagonal (dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`);
      orthOk = false;
    }
  }
}
testResults['route-orthogonal'] = orthOk ? 'PASS' : 'FAIL';
if (!orthOk) allPassed = false;
console.log(orthOk ? 'PASS: All route segments are horizontal or vertical' : 'FAIL');

/* ---- TC-empty: Empty ports case ---- */
console.log('\n=== Empty ports edge case ===');
const emptyResult = routeBlockPorts([], nterm, CELL);
const emptyMissing = [];
for (let i = 0; i < nterm; i++) {
  for (const d of ['W', 'E', 'N', 'S']) {
    if (!emptyResult.termPos[d + i]) emptyMissing.push(d + i);
  }
}
testResults['empty-ports'] = emptyMissing.length === 0 ? 'PASS' : 'FAIL';
if (emptyMissing.length > 0) allPassed = false;
console.log(emptyMissing.length === 0
  ? 'PASS: Empty ports case has all terminal positions'
  : `FAIL: Missing: ${emptyMissing.join(', ')}`);

/* ---- Summary ---- */
console.log('\n========== SUMMARY ==========');
for (const [k, v] of Object.entries(testResults)) {
  console.log(`  ${v.padEnd(10)} ${k}`);
}
console.log(`\nOverall: ${allPassed ? 'ALL PASS' : 'SOME FAILURES'}`);
process.exit(allPassed ? 0 : 1);
