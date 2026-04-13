#!/usr/bin/env node
/**
 * Epic 4 v2: Comprehensive test for 9-area block structure.
 * TC-R1: path connectivity, TC-O1: grid overlaps, TC-O2: pixel overlaps, TC-A1: E/S alignment
 */

const fs = require('fs');
const path = require('path');

/* ---- Extract routeBlockPorts from index.html ---- */
const htmlPath = path.resolve(__dirname, '..', '..', '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('ERROR: no <script>'); process.exit(1); }
const jsCode = scriptMatch[1];
const drawIdx = jsCode.indexOf('function draw()');
eval(jsCode.substring(0, drawIdx));
if (typeof routeBlockPorts !== 'function') { console.error('ERROR: routeBlockPorts not found'); process.exit(1); }

const CELL = 240;

/* ---- PRNG xoshiro128** ---- */
function mkPRNG(seed) {
  let s = [seed >>> 0, (seed * 1664525 + 1013904223) >>> 0,
           (seed * 214013 + 2531011) >>> 0, (seed * 6364136223846793005 + 1442695040888963407) >>> 0];
  return function() {
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t; s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
    return s[0] >>> 0;
  };
}

/* ---- Pixel overlap detection ---- */
function checkPixelOverlaps(routes, spines) {
  const segs = [];
  for (let ri = 0; ri < routes.length; ri++)
    for (let j = 0; j < routes[ri].length - 1; j++)
      segs.push({ a: routes[ri][j], b: routes[ri][j+1], type: 'R' });
  for (let si = 0; si < spines.length; si++)
    segs.push({ a: spines[si][0], b: spines[si][1], type: 'S' });
  let RR = 0, SS = 0, RS = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const ov = segOv(segs[i], segs[j]);
      if (ov > 0) {
        if (segs[i].type === 'R' && segs[j].type === 'R') RR++;
        else if (segs[i].type === 'S' && segs[j].type === 'S') SS++;
        else RS++;
      }
    }
  }
  return { RR, SS, RS };
}
function segOv(p, q) {
  const pH = Math.abs(p.a.y - p.b.y) < 0.01, qH = Math.abs(q.a.y - q.b.y) < 0.01;
  const pV = Math.abs(p.a.x - p.b.x) < 0.01, qV = Math.abs(q.a.x - q.b.x) < 0.01;
  if (pH && qH && Math.abs(p.a.y - q.a.y) < 0.01)
    return rangeOv(Math.min(p.a.x,p.b.x),Math.max(p.a.x,p.b.x),Math.min(q.a.x,q.b.x),Math.max(q.a.x,q.b.x));
  if (pV && qV && Math.abs(p.a.x - q.a.x) < 0.01)
    return rangeOv(Math.min(p.a.y,p.b.y),Math.max(p.a.y,p.b.y),Math.min(q.a.y,q.b.y),Math.max(q.a.y,q.b.y));
  return 0;
}
function rangeOv(a1,a2,b1,b2) { const lo=Math.max(a1,b1),hi=Math.min(a2,b2); return hi>lo+0.01?hi-lo:0; }

/* ---- Test A: sub-port full-path connectivity ---- */
/* For each port, check that route + spines form a connected chain from src edge to dst edge.
 * 1. Route internal: consecutive points are orthogonal (no diagonals)
 * 2. Route start lies on a spine segment (src terminal's spine reaches the route)
 * 3. Route end lies on a spine segment (dst terminal's spine reaches the route)  */
function checkFullConnectivity(ports, routes, spines, cellSize) {
  const EPS = 0.5;
  function ptOnSeg(px, py, s) {
    const isH = Math.abs(s[0].y - s[1].y) < EPS;
    const isV = Math.abs(s[0].x - s[1].x) < EPS;
    if (isH && Math.abs(py - s[0].y) < EPS) {
      return px >= Math.min(s[0].x,s[1].x)-EPS && px <= Math.max(s[0].x,s[1].x)+EPS;
    }
    if (isV && Math.abs(px - s[0].x) < EPS) {
      return py >= Math.min(s[0].y,s[1].y)-EPS && py <= Math.max(s[0].y,s[1].y)+EPS;
    }
    return false;
  }
  const fails = [];
  for (let i = 0; i < ports.length; i++) {
    const r = routes[i];
    if (!r || r.length < 2) { fails.push(`port ${i}: route too short (len=${r?r.length:0})`); continue; }
    /* Internal orthogonality */
    for (let j = 0; j < r.length - 1; j++) {
      const dx = Math.abs(r[j].x - r[j+1].x), dy = Math.abs(r[j].y - r[j+1].y);
      if (dx > 0.01 && dy > 0.01) { fails.push(`port ${i} seg ${j}: diagonal`); break; }
    }
    /* Route start on a spine */
    const first = r[0];
    if (!spines.some(s => ptOnSeg(first.x, first.y, s)))
      fails.push(`port ${i}: route start (${first.x.toFixed(1)},${first.y.toFixed(1)}) not on any spine`);
    /* Route end on a spine */
    const last = r[r.length - 1];
    if (!spines.some(s => ptOnSeg(last.x, last.y, s)))
      fails.push(`port ${i}: route end (${last.x.toFixed(1)},${last.y.toFixed(1)}) not on any spine`);
  }
  return fails;
}

/* ---- Test B: same-direction overlap (all segments: routes + spines) ---- */
/* Collect all drawn segments with owners. Two segments from different owners that are
 * same-direction (both H or both V) and on the same row/col must not overlap.
 * Crossing (H+V at one point) is OK. Single-point touching at endpoints is OK. */
function checkSameDirOverlap(ports, routes, spines) {
  const EPS = 0.01;
  const segs = []; /* {a, b, owner, isH, isV} */
  /* Route segments */
  for (let pi = 0; pi < routes.length; pi++) {
    const r = routes[pi]; if (!r) continue;
    for (let j = 0; j < r.length - 1; j++)
      segs.push({ a: r[j], b: r[j+1], owner: 'R'+pi });
  }
  /* Spine segments */
  for (let si = 0; si < spines.length; si++)
    segs.push({ a: spines[si][0], b: spines[si][1], owner: 'S'+si });

  let count = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i+1; j < segs.length; j++) {
      if (segs[i].owner === segs[j].owner) continue;
      const p = segs[i], q = segs[j];
      const pH = Math.abs(p.a.y-p.b.y)<EPS, qH = Math.abs(q.a.y-q.b.y)<EPS;
      const pV = Math.abs(p.a.x-p.b.x)<EPS, qV = Math.abs(q.a.x-q.b.x)<EPS;
      if (pH && qH && Math.abs(p.a.y - q.a.y) < EPS) {
        const ov = rangeOv(Math.min(p.a.x,p.b.x),Math.max(p.a.x,p.b.x),
                           Math.min(q.a.x,q.b.x),Math.max(q.a.x,q.b.x));
        if (ov > EPS) count++;
      }
      if (pV && qV && Math.abs(p.a.x - q.a.x) < EPS) {
        const ov = rangeOv(Math.min(p.a.y,p.b.y),Math.max(p.a.y,p.b.y),
                           Math.min(q.a.y,q.b.y),Math.max(q.a.y,q.b.y));
        if (ov > EPS) count++;
      }
    }
  }
  return count;
}

/* ---- TC-A1: E/S alignment ---- */
function checkAlignment(termPos, nterm, cellSize) {
  const fails = [];
  for (let i = 0; i < nterm; i++) {
    const w = termPos['W'+i], e = termPos['E'+i], n = termPos['N'+i], s = termPos['S'+i];
    if (!w||!e||!n||!s) { fails.push(`missing termPos for idx ${i}`); continue; }
    if (Math.abs(e.y - w.y) > 0.01) fails.push(`E${i}.y=${e.y.toFixed(1)} ≠ W${i}.y=${w.y.toFixed(1)}`);
    if (Math.abs(s.x - n.x) > 0.01) fails.push(`S${i}.x=${s.x.toFixed(1)} ≠ N${i}.x=${n.x.toFixed(1)}`);
    if (Math.abs(e.x - cellSize) > 0.01) fails.push(`E${i}.x=${e.x.toFixed(1)} ≠ cellSize`);
    if (Math.abs(s.y - cellSize) > 0.01) fails.push(`S${i}.y=${s.y.toFixed(1)} ≠ cellSize`);
  }
  return fails;
}

/* ---- Run one test case ---- */
function runCase(label, ports, nterm) {
  let result;
  try { result = routeBlockPorts(ports, nterm, CELL); }
  catch(e) { return { label, ok: false, fails: ['EXCEPTION: ' + e.message] }; }
  const fails = [];
  /* Test A: full-path connectivity (route start/end on spine, no diagonals) */
  const tA = checkFullConnectivity(ports, result.routes, result.spines, CELL);
  if (tA.length) fails.push(...tA.map(f => 'A: ' + f));
  /* Test B: same-direction overlap (routes + spines, all owners) */
  const ovB = checkSameDirOverlap(ports, result.routes, result.spines);
  if (ovB > 0) fails.push(`B: ${ovB} same-dir overlaps`);
  /* Grid-level overlap (internal check) */
  if (result.overlaps.length) fails.push(`O1: ${result.overlaps.length} grid overlaps`);
  /* E/S alignment */
  const a1 = checkAlignment(result.termPos, nterm, CELL);
  if (a1.length) fails.push(...a1.map(f => 'A1: ' + f));
  return { label, ok: fails.length === 0, fails };
}

/* ---- Parse maze string ports (normal block only) ---- */
function parseMazePorts(mazeStr) {
  const normalMatch = mazeStr.match(/normal:\s*([^;]+)/);
  if (!normalMatch) return { ports: [], nterm: 0 };
  const portStrs = normalMatch[1].trim().split(',').map(s => s.trim()).filter(Boolean);
  const ports = [];
  let maxIdx = 0;
  for (const ps of portStrs) {
    const m = ps.match(/([WENS])(\d+)-([WENS])(\d+)/);
    if (!m) continue;
    const src = { dir: m[1], idx: parseInt(m[2]) };
    const dst = { dir: m[3], idx: parseInt(m[4]) };
    ports.push({ src, dst });
    maxIdx = Math.max(maxIdx, src.idx, dst.idx);
  }
  return { ports, nterm: maxIdx + 1 };
}

/* ---- Test groups ---- */
const results = [];
let pass = 0, fail = 0;

function runAndRecord(label, ports, nterm) {
  const r = runCase(label, ports, nterm);
  results.push(r);
  if (r.ok) pass++;
  else { fail++; console.log(`FAIL [${label}]`); for (const f of r.fails) console.log(`  ${f}`); }
}

/* Fixed cases */
const fixed = [
  { label:'FIX-WN-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'N',idx:0}}] },
  { label:'FIX-WN-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'N',idx:1}},{src:{dir:'W',idx:2},dst:{dir:'N',idx:2}}] },
  { label:'FIX-WN-3', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'N',idx:1}}] },
  { label:'FIX-WS-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:0}}] },
  { label:'FIX-WS-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:1}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:2}}] },
  { label:'FIX-WS-3', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:1}}] },
  { label:'FIX-WE-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:0}}] },
  { label:'FIX-WE-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:1}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:2}}] },
  { label:'FIX-WE-3', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:1}}] },
  { label:'MIX-1', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:0}}] },
  { label:'MIX-2', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'E',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:1}}] },
  { label:'MIX-3', nterm:3, ports:[{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}},{src:{dir:'S',idx:0},dst:{dir:'W',idx:2}},{src:{dir:'W',idx:2},dst:{dir:'S',idx:1}},{src:{dir:'N',idx:1},dst:{dir:'W',idx:1}}] },
  { label:'MIX-4', nterm:4, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:2}},{src:{dir:'W',idx:2},dst:{dir:'E',idx:3}},{src:{dir:'W',idx:3},dst:{dir:'S',idx:0}},{src:{dir:'N',idx:0},dst:{dir:'W',idx:0}}] },
  { label:'MIX-5', nterm:4, ports:[{src:{dir:'N',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'N',idx:1},dst:{dir:'S',idx:1}},{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:1},dst:{dir:'E',idx:1}}] },
  { label:'MIX-6', nterm:2, ports:[{src:{dir:'W',idx:0},dst:{dir:'S',idx:0}},{src:{dir:'W',idx:0},dst:{dir:'N',idx:0}}] },
  { label:'MIX-7', nterm:2, ports:[{src:{dir:'W',idx:0},dst:{dir:'E',idx:0}},{src:{dir:'W',idx:0},dst:{dir:'E',idx:1}}] },
];
for (const tc of fixed) runAndRecord(tc.label, tc.ports, tc.nterm);

/* User-provided maze */
const userMaze = 'normal: W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7, W7-E8, W8-S2, N2-W6, E9-W10, W10-N3, S3-W9, W11-E12, W12-E13, W13-S4, N4-W11, E14-W15, W15-N5, S5-W14, W16-S6, N6-W16, S7-W4, S8-W9, S9-W14, S10-W1; nx: E4-E6, E9-E11, E14-E16; ny: N0-N7, N2-N8, N4-N9, N6-N10';
const { ports: userPorts, nterm: userNterm } = parseMazePorts(userMaze);
runAndRecord('USER-MAZE', userPorts, userNterm);

/* Random cases */
const rng = mkPRNG(42);
const dirs = ['W','E','N','S'];
for (let seed = 42; seed < 1042; seed++) {
  const rng2 = mkPRNG(seed);
  const nterm = 2 + (rng2() % 7);
  const maxPorts = Math.min(20, nterm * 4 * (nterm * 4 - 1) / 2);
  const k = 1 + (rng2() % maxPorts);
  const ports = [];
  const seen = new Set();
  let attempts = 0;
  while (ports.length < k && attempts < k * 10) {
    attempts++;
    const sd = dirs[rng2() % 4], si = rng2() % nterm;
    const dd = dirs[rng2() % 4], di = rng2() % nterm;
    if (sd === dd && si === di) continue;
    const key = `${sd}${si}-${dd}${di}`;
    const key2 = `${dd}${di}-${sd}${si}`;
    if (seen.has(key) || seen.has(key2)) continue;
    seen.add(key);
    ports.push({ src: { dir: sd, idx: si }, dst: { dir: dd, idx: di } });
  }
  if (ports.length > 0) runAndRecord(`RND-${seed}`, ports, nterm);
}

/* Summary */
const total = pass + fail;
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${total}  PASS: ${pass}  FAIL: ${fail}`);
console.log(fail === 0 ? 'ALL PASS' : `${fail} FAILURES`);
