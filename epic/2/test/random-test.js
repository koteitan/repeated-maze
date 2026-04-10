#!/usr/bin/env node
/**
 * Epic 2: Random routing stress test for routeBlockPorts().
 *
 * Usage:
 *   node random-test.js [--count N] [--seed N] [--verbose]
 *
 * Generates random port configurations and verifies:
 *   TC-1: Generation parameters are in spec range
 *   TC-2: routeBlockPorts completes without exceptions or timeout
 *   TC-3: overlaps array is empty
 *   TC-4: All route segments are orthogonal (H/V only)
 *   TC-5: No same-direction segment overlap in grid cells (independent check)
 *   TC-6: termPos contains all W/E/N/S × 0..nterm-1
 */

/* ---- CLI args ---- */
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? parseInt(args[i + 1]) : def;
}
const TOTAL = getArg('count', 1000);
const BASE_SEED = getArg('seed', 42);
const VERBOSE = args.includes('--verbose');
const CELL = 240;
const TIMEOUT_MS = 5000;

/* ---- Seeded PRNG (xoshiro128**) ---- */
function mkRng(seed) {
  let s = [seed ^ 0x12345678, seed ^ 0x9ABCDEF0, seed ^ 0xFEDCBA98, seed ^ 0x76543210];
  function rotl(x, k) { return ((x << k) | (x >>> (32 - k))) >>> 0; }
  function next() {
    const result = (rotl((s[1] * 5) >>> 0, 7) * 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t; s[3] = rotl(s[3], 11);
    return result;
  }
  /* Warm up */
  for (let i = 0; i < 20; i++) next();
  return {
    nextInt(max) { return next() % max; },
    nextRange(min, max) { return min + (next() % (max - min + 1)); },
  };
}

/* ---- routeBlockPorts dynamically extracted from index.html ---- */
const fs = require('fs');
const htmlPath = require('path').resolve(__dirname, '..', '..', '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('ERROR: Could not find <script> block in index.html'); process.exit(1); }
const jsCode = scriptMatch[1];
const drawIdx = jsCode.indexOf('function draw()');
if (drawIdx < 0) { console.error('ERROR: Could not find function draw() in index.html'); process.exit(1); }
/* The production code has no expansion limit (infinite for-loop until success).
 * To detect divergence in tests, we patch the source to add a MAX_EXPAND guard
 * that throws after 200 iterations instead of looping forever. */
let evalCode = jsCode.substring(0, drawIdx);
evalCode = evalCode.replace(
  'for (let _expand = 0; !ok; _expand++) {',
  'for (let _expand = 0; !ok; _expand++) { if (_expand > 200) throw new Error("Grid expansion limit reached (nR="+nR+", nC="+nC+") for port "+i);'
);
eval(evalCode);
if (typeof routeBlockPorts !== 'function') {
  console.error('ERROR: routeBlockPorts not found after eval of index.html');
  process.exit(1);
}

/* ---- Random port generation ---- */

const DIRS = ['W', 'E', 'N', 'S'];

function generatePorts(rng, nterm) {
  const maxPorts = Math.min(20, (nterm * 4) * (nterm * 4 - 1) / 2);
  const k = rng.nextRange(1, maxPorts);
  const ports = [];
  const seen = new Set();
  let attempts = 0;
  while (ports.length < k && attempts < k * 10) {
    attempts++;
    const sd = DIRS[rng.nextInt(4)];
    const si = rng.nextInt(nterm);
    const dd = DIRS[rng.nextInt(4)];
    const di = rng.nextInt(nterm);
    if (sd === dd && si === di) continue; // no self-loop
    const fwd = sd + si + ',' + dd + di;
    const rev = dd + di + ',' + sd + si;
    if (seen.has(fwd) || seen.has(rev)) continue; // no duplicate
    seen.add(fwd);
    ports.push({ src: { dir: sd, idx: si }, dst: { dir: dd, idx: di } });
  }
  return ports;
}

function portsToString(ports) {
  return ports.map(p => `${p.src.dir}${p.src.idx}-${p.dst.dir}${p.dst.idx}`).join(', ');
}

/* ---- Test runner ---- */

const counts = { tc1: 0, tc2: 0, tc3: 0, tc4: 0, tc5: 0, tc6: 0 };
const skipped = { tc3: 0, tc4: 0, tc5: 0, tc6: 0 };
const failures = [];

for (let t = 0; t < TOTAL; t++) {
  const seed = BASE_SEED + t;
  const rng = mkRng(seed);
  const nterm = rng.nextRange(2, 8);
  const ports = generatePorts(rng, nterm);
  const portStr = portsToString(ports);
  const maxPorts = Math.min(20, (nterm * 4) * (nterm * 4 - 1) / 2);

  /* TC-1: Parameter validation */
  let tc1ok = true;
  if (nterm < 2 || nterm > 8) { tc1ok = false; failures.push({ seed, tc: 'TC-1', msg: `nterm=${nterm} out of range` }); }
  if (ports.length < 1 || ports.length > maxPorts) { tc1ok = false; failures.push({ seed, tc: 'TC-1', msg: `ports=${ports.length} out of range (max=${maxPorts})` }); }
  for (const p of ports) {
    if (p.src.dir === p.dst.dir && p.src.idx === p.dst.idx) {
      tc1ok = false; failures.push({ seed, tc: 'TC-1', msg: `self-loop: ${p.src.dir}${p.src.idx}` }); break;
    }
  }
  if (tc1ok) counts.tc1++;

  /* TC-2: Completion check */
  let result = null;
  let tc2ok = true;
  const t0 = Date.now();
  try {
    result = routeBlockPorts(ports, nterm, CELL);
    const elapsed = Date.now() - t0;
    if (elapsed > TIMEOUT_MS) {
      tc2ok = false;
      failures.push({ seed, tc: 'TC-2', msg: `TIMEOUT: ${elapsed}ms`, nterm, portStr });
    }
  } catch (e) {
    tc2ok = false;
    failures.push({ seed, tc: 'TC-2', msg: `EXCEPTION: ${e.message}`, nterm, portStr });
  }
  if (tc2ok) {
    if (!result || !result.routes || !result.termPos || !result.overlaps) {
      tc2ok = false;
      failures.push({ seed, tc: 'TC-2', msg: 'Invalid return structure', nterm, portStr });
    }
  }
  if (tc2ok) counts.tc2++;

  if (!result) { skipped.tc3++; skipped.tc4++; skipped.tc5++; skipped.tc6++; continue; }

  /* TC-3: Overlaps empty */
  if (result.overlaps.length === 0) {
    counts.tc3++;
  } else {
    const ovStr = result.overlaps.map(o => `(${o.r},${o.c},${o.dir})`).join(', ');
    failures.push({ seed, tc: 'TC-3', msg: `overlaps: [${ovStr}]`, nterm, portStr });
  }

  /* TC-4: Orthogonality */
  let tc4ok = true;
  for (let ri = 0; ri < result.routes.length && tc4ok; ri++) {
    const route = result.routes[ri];
    for (let pi = 1; pi < route.length; pi++) {
      const dx = Math.abs(route[pi].x - route[pi-1].x);
      const dy = Math.abs(route[pi].y - route[pi-1].y);
      if (dx > 0.001 && dy > 0.001) {
        tc4ok = false;
        failures.push({ seed, tc: 'TC-4', msg: `route ${ri} seg ${pi-1}→${pi}: diagonal (dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`, nterm, portStr });
        break;
      }
    }
  }
  if (tc4ok) counts.tc4++;

  /* TC-5: Independent segment overlap check via pixel routes.
   * For each pair of routes, check if any segment from route A overlaps
   * with a same-direction segment from route B on the same grid line,
   * excluding endpoints (sub-terminal cells).
   *
   * We reconstruct grid-cell occupancy from pixel routes.
   */
  let tc5ok = true;
  if (result.routes.length > 1) {
    /* Reconstruct per-route cell sets with direction */
    const routeCells = result.routes.map((route, ri) => {
      const hCells = new Set();
      const vCells = new Set();
      for (let i = 1; i < route.length; i++) {
        const dx = Math.abs(route[i].x - route[i-1].x);
        const dy = Math.abs(route[i].y - route[i-1].y);
        const isH = dx > 0.001 && dy < 0.001;
        const isV = dy > 0.001 && dx < 0.001;
        /* Both endpoints of this segment contribute cells.
         * We use the pixel coords as cell identifiers (they come from the same grid). */
        const key1 = route[i-1].x.toFixed(4) + ',' + route[i-1].y.toFixed(4);
        const key2 = route[i].x.toFixed(4) + ',' + route[i].y.toFixed(4);
        if (isH) {
          /* Horizontal: all intermediate pixel positions share same y.
           * Since pixel routes are deduplicated grid points, each point is a cell. */
          hCells.add(key1); hCells.add(key2);
        } else if (isV) {
          vCells.add(key1); vCells.add(key2);
        }
      }
      /* Remove endpoints (first and last point of route) */
      if (route.length > 0) {
        const first = route[0].x.toFixed(4) + ',' + route[0].y.toFixed(4);
        const last = route[route.length-1].x.toFixed(4) + ',' + route[route.length-1].y.toFixed(4);
        hCells.delete(first); hCells.delete(last);
        vCells.delete(first); vCells.delete(last);
      }
      return { hCells, vCells };
    });
    /* Check for intersections between different routes */
    for (let a = 0; a < routeCells.length && tc5ok; a++) {
      for (let b = a + 1; b < routeCells.length && tc5ok; b++) {
        for (const cell of routeCells[a].hCells) {
          if (routeCells[b].hCells.has(cell)) {
            tc5ok = false;
            failures.push({ seed, tc: 'TC-5', msg: `H overlap at ${cell} between routes ${a},${b}`, nterm, portStr });
            break;
          }
        }
        if (!tc5ok) break;
        for (const cell of routeCells[a].vCells) {
          if (routeCells[b].vCells.has(cell)) {
            tc5ok = false;
            failures.push({ seed, tc: 'TC-5', msg: `V overlap at ${cell} between routes ${a},${b}`, nterm, portStr });
            break;
          }
        }
      }
    }
  }
  if (tc5ok) counts.tc5++;

  /* TC-6: termPos completeness */
  let tc6ok = true;
  const missing = [];
  for (let i = 0; i < nterm; i++) {
    for (const d of DIRS) {
      if (!result.termPos[d + i]) missing.push(d + i);
    }
  }
  if (missing.length > 0) {
    tc6ok = false;
    failures.push({ seed, tc: 'TC-6', msg: `missing: ${missing.join(', ')}`, nterm, portStr });
  } else {
    /* Check that all entries have numeric x, y */
    for (let i = 0; i < nterm; i++) {
      for (const d of DIRS) {
        const pos = result.termPos[d + i];
        if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || isNaN(pos.x) || isNaN(pos.y)) {
          tc6ok = false;
          failures.push({ seed, tc: 'TC-6', msg: `${d}${i}: invalid coords (${pos.x}, ${pos.y})`, nterm, portStr });
          break;
        }
      }
      if (!tc6ok) break;
    }
  }
  if (tc6ok) counts.tc6++;

  /* Progress */
  if ((t + 1) % 100 === 0 || t === TOTAL - 1) {
    process.stderr.write(`\r  ${t + 1}/${TOTAL} tests...`);
  }
}
process.stderr.write('\n');

/* ---- Summary ---- */

console.log('Random Routing Test Results');
console.log('='.repeat(40));
console.log(`Total tests: ${TOTAL}`);
console.log(`Seed range: ${BASE_SEED}..${BASE_SEED + TOTAL - 1}`);
console.log();

const tcs = [
  ['TC-1', 'params',       counts.tc1, 0],
  ['TC-2', 'completion',   counts.tc2, 0],
  ['TC-3', 'overlaps',     counts.tc3, skipped.tc3],
  ['TC-4', 'orthogonal',   counts.tc4, skipped.tc4],
  ['TC-5', 'cell overlap', counts.tc5, skipped.tc5],
  ['TC-6', 'termPos',      counts.tc6, skipped.tc6],
];

let allPass = true;
let tc2Failures = TOTAL - counts.tc2;
for (const [id, name, pass, skip] of tcs) {
  const ran = TOTAL - skip;
  const failed = ran - pass;
  let status;
  if (skip === 0) {
    status = pass === TOTAL ? 'PASS' : `${failed} FAIL`;
  } else {
    status = failed === 0 ? `PASS (${skip} skipped)` : `${failed} FAIL (${skip} skipped)`;
  }
  console.log(`${id} (${name}):`.padEnd(22) + `${pass}/${ran} ${status}`);
  if (failed > 0) allPass = false;
}

console.log();
if (allPass) {
  console.log(`Overall: ${TOTAL}/${TOTAL} PASS (100%)`);
} else {
  const failedSeeds = [...new Set(failures.map(f => f.seed))];
  console.log(`Overall: ${TOTAL - failedSeeds.length}/${TOTAL} PASS (${((TOTAL - failedSeeds.length) / TOTAL * 100).toFixed(1)}%)`);
  console.log(`Failed seeds: ${failedSeeds.join(', ')}`);
}

/* Print failure details */
if (failures.length > 0) {
  console.log('\n' + '-'.repeat(40));
  console.log('FAILURE DETAILS');
  console.log('-'.repeat(40));
  /* Group by seed, limit output */
  const bySeed = {};
  for (const f of failures) {
    (bySeed[f.seed] = bySeed[f.seed] || []).push(f);
  }
  const seedList = Object.keys(bySeed).map(Number).sort((a, b) => a - b);
  const MAX_SHOW = 20;
  for (let i = 0; i < Math.min(seedList.length, MAX_SHOW); i++) {
    const seed = seedList[i];
    const fs = bySeed[seed];
    console.log(`\nFAIL [seed=${seed}] nterm=${fs[0].nterm || '?'}, ports=${fs[0].portStr ? fs[0].portStr.split(',').length : '?'}`);
    if (fs[0].portStr) console.log(`  ports: ${fs[0].portStr}`);
    for (const f of fs) {
      console.log(`  ${f.tc}: ${f.msg}`);
    }
  }
  if (seedList.length > MAX_SHOW) {
    console.log(`\n... and ${seedList.length - MAX_SHOW} more failed seeds`);
  }
}

process.exit(allPass ? 0 : 1);
