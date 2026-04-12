#!/usr/bin/env node
/**
 * Epic 4: Sub-terminal branching test for E/S terminals.
 * Tests 3 cases: W→N (reference), W→S, W→E
 * Checks routes, spines, termPos, pixel overlaps, channel counts, branch segments.
 */

const fs = require('fs');
const path = require('path');

/* ---- Extract routeBlockPorts from index.html ---- */
const htmlPath = path.resolve(__dirname, '..', '..', '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('ERROR: Could not find <script> block'); process.exit(1); }
const jsCode = scriptMatch[1];
const drawIdx = jsCode.indexOf('function draw()');
if (drawIdx < 0) { console.error('ERROR: Could not find function draw()'); process.exit(1); }
eval(jsCode.substring(0, drawIdx));
if (typeof routeBlockPorts !== 'function') {
  console.error('ERROR: routeBlockPorts not found'); process.exit(1);
}

const CELL = 240;

/* ---- Pixel overlap detection ---- */
function checkPixelOverlaps(routes, spines) {
  const allSegs = [];
  // Collect route segments
  for (let ri = 0; ri < routes.length; ri++) {
    const r = routes[ri];
    for (let j = 0; j < r.length - 1; j++) {
      allSegs.push({ from: r[j], to: r[j+1], type: 'route', idx: ri });
    }
  }
  // Collect spine segments
  for (let si = 0; si < spines.length; si++) {
    const s = spines[si];
    allSegs.push({ from: s[0], to: s[1], type: 'spine', idx: si });
  }

  const overlaps = { RR: 0, SS: 0, RS: 0 };
  for (let i = 0; i < allSegs.length; i++) {
    for (let j = i + 1; j < allSegs.length; j++) {
      const a = allSegs[i], b = allSegs[j];
      const ov = segOverlap(a, b);
      if (ov > 0) {
        const key = a.type === 'route' && b.type === 'route' ? 'RR'
                  : a.type === 'spine' && b.type === 'spine' ? 'SS' : 'RS';
        overlaps[key]++;
      }
    }
  }
  return overlaps;
}

function segOverlap(a, b) {
  const aH = a.from.y === a.to.y;
  const aV = a.from.x === a.to.x;
  const bH = b.from.y === b.to.y;
  const bV = b.from.x === b.to.x;

  if (aH && bH && Math.abs(a.from.y - b.from.y) < 0.01) {
    return rangeOverlap(
      Math.min(a.from.x, a.to.x), Math.max(a.from.x, a.to.x),
      Math.min(b.from.x, b.to.x), Math.max(b.from.x, b.to.x)
    );
  }
  if (aV && bV && Math.abs(a.from.x - b.from.x) < 0.01) {
    return rangeOverlap(
      Math.min(a.from.y, a.to.y), Math.max(a.from.y, a.to.y),
      Math.min(b.from.y, b.to.y), Math.max(b.from.y, b.to.y)
    );
  }
  return 0;
}

function rangeOverlap(a1, a2, b1, b2) {
  const lo = Math.max(a1, b1), hi = Math.min(a2, b2);
  return hi > lo + 0.01 ? hi - lo : 0;
}

/* ---- Test cases ---- */
const cases = [
  {
    name: 'Case 1: W→N (reference)',
    nterm: 4,
    ports: [
      { src: { dir: 'W', idx: 0 }, dst: { dir: 'N', idx: 0 } },
      { src: { dir: 'W', idx: 1 }, dst: { dir: 'N', idx: 0 } },
      { src: { dir: 'W', idx: 2 }, dst: { dir: 'N', idx: 0 } },
    ],
    checkTerminal: 'N0',
    checkDir: 'N',
  },
  {
    name: 'Case 2: W→S',
    nterm: 4,
    ports: [
      { src: { dir: 'W', idx: 0 }, dst: { dir: 'S', idx: 0 } },
      { src: { dir: 'W', idx: 1 }, dst: { dir: 'S', idx: 0 } },
      { src: { dir: 'W', idx: 2 }, dst: { dir: 'S', idx: 0 } },
    ],
    checkTerminal: 'S0',
    checkDir: 'S',
  },
  {
    name: 'Case 3: W→E',
    nterm: 4,
    ports: [
      { src: { dir: 'W', idx: 0 }, dst: { dir: 'E', idx: 0 } },
      { src: { dir: 'W', idx: 1 }, dst: { dir: 'E', idx: 0 } },
      { src: { dir: 'W', idx: 2 }, dst: { dir: 'E', idx: 0 } },
    ],
    checkTerminal: 'E0',
    checkDir: 'E',
  },
];

for (const tc of cases) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${tc.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`nterm=${tc.nterm}, ports=${tc.ports.length}`);
  console.log(`Ports:`);
  for (const p of tc.ports) {
    console.log(`  ${p.src.dir}${p.src.idx} → ${p.dst.dir}${p.dst.idx}`);
  }

  const result = routeBlockPorts(tc.ports, tc.nterm, CELL);

  // Routes
  console.log(`\nRoutes (${result.routes.length}):`);
  for (let i = 0; i < result.routes.length; i++) {
    const r = result.routes[i];
    const pts = r.map(p => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(' → ');
    console.log(`  R${i}: ${pts}`);
  }

  // Spines
  console.log(`\nSpines (${result.spines.length}):`);
  for (let i = 0; i < result.spines.length; i++) {
    const s = result.spines[i];
    const isH = Math.abs(s[0].y - s[1].y) < 0.01;
    const type = isH ? 'H' : 'V';
    const len = isH ? Math.abs(s[1].x - s[0].x) : Math.abs(s[1].y - s[0].y);
    console.log(`  S${i}: (${s[0].x.toFixed(1)},${s[0].y.toFixed(1)}) → (${s[1].x.toFixed(1)},${s[1].y.toFixed(1)}) [${type}, len=${len.toFixed(1)}]`);
  }

  // Junctions
  console.log(`\nJunctions (${result.junctions.length}):`);
  for (const j of result.junctions) {
    console.log(`  (${j.x.toFixed(1)},${j.y.toFixed(1)})`);
  }

  // termPos
  console.log(`\ntermPos:`);
  const keys = Object.keys(result.termPos).sort();
  for (const k of keys) {
    const tp = result.termPos[k];
    console.log(`  ${k}: (${tp.x.toFixed(1)}, ${tp.y.toFixed(1)})`);
  }

  // Grid-level overlaps
  console.log(`\nGrid-level overlaps: ${result.overlaps.length}`);

  // Pixel-level overlaps
  const pxOv = checkPixelOverlaps(result.routes, result.spines);
  console.log(`Pixel overlaps: RR=${pxOv.RR}, SS=${pxOv.SS}, RS=${pxOv.RS}`);

  // Channel analysis for the checked terminal
  const tk = tc.checkTerminal;
  const dir = tc.checkDir;
  console.log(`\n--- ${tk} analysis ---`);

  // Count channels for this terminal
  let chCount = 0;
  for (let i = 0; i < tc.ports.length; i++) {
    const p = tc.ports[i];
    if ((p.src.dir === dir && p.src.idx === parseInt(tk[1])) ||
        (p.dst.dir === dir && p.dst.idx === parseInt(tk[1]))) {
      chCount++;
    }
  }
  console.log(`  Channels used: ${chCount} (expected: 3)`);

  // Count branch spines (spine segments covering multiple channels)
  let branchSpines = 0;
  let edgeSpines = 0;
  for (const s of result.spines) {
    const isH = Math.abs(s[0].y - s[1].y) < 0.01;
    const len = isH ? Math.abs(s[1].x - s[0].x) : Math.abs(s[1].y - s[0].y);
    if (len < 0.01) continue;
    // edge spine: touches block border (x=0, x=CELL, y=0, y=CELL)
    const touchesBorder = [s[0].x, s[1].x, s[0].y, s[1].y].some(v =>
      Math.abs(v) < 0.01 || Math.abs(v - CELL) < 0.01);
    if (touchesBorder) edgeSpines++;
    else branchSpines++;
  }
  console.log(`  Edge spines: ${edgeSpines}`);
  console.log(`  Branch spines: ${branchSpines}`);
  console.log(`  Junctions: ${result.junctions.length} (expected: 2 for 3 channels)`);

  // Check termPos vs spine connectivity
  const tp = result.termPos[tk];
  console.log(`  termPos ${tk}: (${tp.x.toFixed(1)}, ${tp.y.toFixed(1)})`);

  // Find spine that starts/ends at border matching this terminal
  let spineAtBorder = null;
  for (const s of result.spines) {
    const matchesBorder = (
      (dir === 'N' && (Math.abs(s[0].y) < 0.01 || Math.abs(s[1].y) < 0.01)) ||
      (dir === 'S' && (Math.abs(s[0].y - CELL) < 0.01 || Math.abs(s[1].y - CELL) < 0.01)) ||
      (dir === 'W' && (Math.abs(s[0].x) < 0.01 || Math.abs(s[1].x) < 0.01)) ||
      (dir === 'E' && (Math.abs(s[0].x - CELL) < 0.01 || Math.abs(s[1].x - CELL) < 0.01))
    );
    if (matchesBorder) {
      spineAtBorder = s;
      break;
    }
  }
  if (spineAtBorder) {
    console.log(`  Edge spine: (${spineAtBorder[0].x.toFixed(1)},${spineAtBorder[0].y.toFixed(1)}) → (${spineAtBorder[1].x.toFixed(1)},${spineAtBorder[1].y.toFixed(1)})`);
    // Check if termPos matches the edge spine's border end
    const spBorderPt = [spineAtBorder[0], spineAtBorder[1]].find(p =>
      Math.abs(p.x) < 0.01 || Math.abs(p.x - CELL) < 0.01 ||
      Math.abs(p.y) < 0.01 || Math.abs(p.y - CELL) < 0.01
    );
    if (spBorderPt) {
      const dx = Math.abs(tp.x - spBorderPt.x);
      const dy = Math.abs(tp.y - spBorderPt.y);
      console.log(`  termPos-spine border gap: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
      if (dx > 0.01 || dy > 0.01) {
        console.log(`  *** DISCONNECT: termPos does NOT match spine border position ***`);
        // For E/S: check alignment vs corresponding W/N
        if (dir === 'E') {
          const wtp = result.termPos['W' + tk[1]];
          console.log(`  W${tk[1]} termPos: (${wtp.x.toFixed(1)}, ${wtp.y.toFixed(1)})`);
          console.log(`  E${tk[1]}.y aligned to W${tk[1]}.y = ${wtp.y.toFixed(1)} (correct for cross-block)`);
          console.log(`  But spine border point is at y=${spBorderPt.y.toFixed(1)}`);
        }
        if (dir === 'S') {
          const ntp = result.termPos['N' + tk[1]];
          console.log(`  N${tk[1]} termPos: (${ntp.x.toFixed(1)}, ${ntp.y.toFixed(1)})`);
          console.log(`  S${tk[1]}.x aligned to N${tk[1]}.x = ${ntp.x.toFixed(1)} (correct for cross-block)`);
          console.log(`  But spine border point is at x=${spBorderPt.x.toFixed(1)}`);
        }
      } else {
        console.log(`  termPos matches spine border position ✓`);
      }
    }
  } else {
    console.log(`  No edge spine found for ${tk}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('DONE');
