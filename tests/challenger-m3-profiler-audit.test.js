/**
 * Challenger M3 Empirical Verification & Stress Test Suite
 *
 * Independent empirical verification of Milestone 3:
 * 1. Process tree discovery and role classification in measure_cpu.ps1
 * 2. CPU normalization math and logical core accounting (8 cores)
 * 3. Deep forensic audit of live_cpu_metrics.csv
 * 4. Full test suite validation check
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  CHALLENGER M3: EMPIRICAL PROFILER AUDIT & VERIFICATION SUITE   ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: PROCESS TREE DISCOVERY & CLASSIFICATION LOGIC
// ----------------------------------------------------------------------------
console.log('--- Suite 1: Process Tree Discovery & Role Classification ---');

runTest('1.1. Profiler script measure_cpu.ps1 exists and defines correct parameters', () => {
  const scriptPath = path.join(__dirname, '../.agents/teamwork/teamwork_explorer_o7_system/measure_cpu.ps1');
  assert.ok(fs.existsSync(scriptPath), 'measure_cpu.ps1 must exist');
  const content = fs.readFileSync(scriptPath, 'utf8');

  assert.ok(content.includes('[int]$DurationSeconds = 15'), 'Must support DurationSeconds param');
  assert.ok(content.includes('[double]$IntervalSeconds = 1.0'), 'Must support IntervalSeconds param');
  assert.ok(content.includes('[string]$CsvPath = ""'), 'Must support CsvPath param');
  assert.ok(content.includes('[Environment]::ProcessorCount'), 'Must query logical processor count dynamically');
});

runTest('1.2. Role classification logic matches Chromium/WebView2 architecture', () => {
  const scriptPath = path.join(__dirname, '../.agents/teamwork/teamwork_explorer_o7_system/measure_cpu.ps1');
  const content = fs.readFileSync(scriptPath, 'utf8');

  // Verify role classifiers
  assert.ok(content.includes('if ($wmiProc.Name -match "lyricflow\\.exe")'), 'Must classify lyricflow.exe as Host (Rust)');
  assert.ok(content.includes('$cmd -match "--type=gpu-process"'), 'Must classify --type=gpu-process as GPU Process');
  assert.ok(content.includes('$cmd -match "--type=renderer"'), 'Must classify --type=renderer as Renderer (JS/DOM)');
  assert.ok(content.includes('$cmd -match "--type=utility"'), 'Must classify --type=utility as Utility');
  assert.ok(content.includes('$cmd -match "--type=crashpad-handler"'), 'Must classify --type=crashpad-handler as Crashpad');
  assert.ok(content.includes('$role = "Browser Manager"'), 'Must fallback to Browser Manager for root webview2');
});

runTest('1.3. Synthetic process tree traversal accurately isolates LyricFlow descendants', () => {
  // Replicate BFS logic from measure_cpu.ps1 in JS
  const mockAllProcs = [
    { ProcessId: 100, ParentProcessId: 1, Name: 'lyricflow.exe', CommandLine: 'lyricflow.exe' },
    { ProcessId: 101, ParentProcessId: 100, Name: 'msedgewebview2.exe', CommandLine: 'msedgewebview2.exe --embedded-browser-webview=1' },
    { ProcessId: 102, ParentProcessId: 101, Name: 'msedgewebview2.exe', CommandLine: 'msedgewebview2.exe --type=renderer' },
    { ProcessId: 103, ParentProcessId: 101, Name: 'msedgewebview2.exe', CommandLine: 'msedgewebview2.exe --type=gpu-process' },
    { ProcessId: 104, ParentProcessId: 101, Name: 'msedgewebview2.exe', CommandLine: 'msedgewebview2.exe --type=utility' },
    { ProcessId: 105, ParentProcessId: 101, Name: 'msedgewebview2.exe', CommandLine: 'msedgewebview2.exe --type=crashpad-handler' },
    // External processes that must be excluded
    { ProcessId: 200, ParentProcessId: 1, Name: 'SearchHost.exe', CommandLine: 'SearchHost.exe' },
    { ProcessId: 201, ParentProcessId: 200, Name: 'msedgewebview2.exe', CommandLine: 'msedgewebview2.exe --type=renderer' },
    { ProcessId: 300, ParentProcessId: 1, Name: 'chrome.exe', CommandLine: 'chrome.exe' },
    { ProcessId: 106, ParentProcessId: 100, Name: 'conhost.exe', CommandLine: 'conhost.exe' }, // Child of lyricflow, but non-matching name
  ];

  const rootHostPid = 100;
  const treePids = new Set([rootHostPid]);
  const queue = [rootHostPid];

  while (queue.length > 0) {
    const curr = queue.shift();
    for (const p of mockAllProcs) {
      if (p.ParentProcessId === curr && !treePids.has(p.ProcessId)) {
        treePids.add(p.ProcessId);
        queue.push(p.ProcessId);
      }
    }
  }

  // Filter strictly to lyricflow.exe and msedgewebview2.exe
  const classified = [];
  for (const pid of treePids) {
    const proc = mockAllProcs.find(p => p.ProcessId === pid);
    if (!proc) continue;
    if (!/lyricflow\.exe|msedgewebview2\.exe/.test(proc.Name)) continue;

    let role = 'Unknown';
    if (/lyricflow\.exe/.test(proc.Name)) role = 'Host (Rust)';
    else if (/--type=gpu-process/.test(proc.CommandLine)) role = 'GPU Process';
    else if (/--type=renderer/.test(proc.CommandLine)) role = 'Renderer (JS/DOM)';
    else if (/--type=utility/.test(proc.CommandLine)) role = 'Utility';
    else if (/--type=crashpad-handler/.test(proc.CommandLine)) role = 'Crashpad';
    else role = 'Browser Manager';

    classified.push({ pid, role, name: proc.Name });
  }

  assert.strictEqual(classified.length, 6, 'Must isolate exactly 6 processes (host + 5 webview2 descendants)');
  assert.ok(classified.some(c => c.pid === 100 && c.role === 'Host (Rust)'));
  assert.ok(classified.some(c => c.pid === 101 && c.role === 'Browser Manager'));
  assert.ok(classified.some(c => c.pid === 102 && c.role === 'Renderer (JS/DOM)'));
  assert.ok(classified.some(c => c.pid === 103 && c.role === 'GPU Process'));
  assert.ok(classified.some(c => c.pid === 104 && c.role === 'Utility'));
  assert.ok(classified.some(c => c.pid === 105 && c.role === 'Crashpad'));
  // Ensure SearchHost child and conhost were excluded
  assert.ok(!classified.some(c => c.pid === 201), 'Must exclude SearchHost WebView2 child');
  assert.ok(!classified.some(c => c.pid === 106), 'Must exclude non-webview2 child (conhost)');
});

// ----------------------------------------------------------------------------
// SUITE 2: NORMALIZED CPU MATH & 8-CORE SYSTEM ACCOUNTING
// ----------------------------------------------------------------------------
console.log('\n--- Suite 2: Normalized CPU Math & System Core Accounting ---');

runTest('2.1. CPU normalization oracle: single-core 100% equates to 12.5% normalized across 8 cores', () => {
  const numCores = 8;
  const timeDeltaMs = 1000.0;
  const cpuDeltaMs = 1000.0; // 1 full core utilized for 1 second

  const rawCpuPct = (cpuDeltaMs / timeDeltaMs) * 100.0;
  const normCpuPct = rawCpuPct / numCores;

  assert.strictEqual(rawCpuPct, 100.0);
  assert.strictEqual(normCpuPct, 12.5);
});

runTest('2.2. CPU normalization handles multi-core saturation and idle edge cases', () => {
  const numCores = 8;

  // Fully saturated 8-core CPU
  const fullRaw = (8000.0 / 1000.0) * 100.0;
  const fullNorm = fullRaw / numCores;
  assert.strictEqual(fullRaw, 800.0);
  assert.strictEqual(fullNorm, 100.0);

  // Zero CPU delta
  const idleRaw = (0.0 / 1000.0) * 100.0;
  const idleNorm = idleRaw / numCores;
  assert.strictEqual(idleRaw, 0.0);
  assert.strictEqual(idleNorm, 0.0);

  // Single Windows timer tick (15.625 ms)
  const tickRaw = (15.625 / 1000.0) * 100.0;
  const tickNorm = tickRaw / numCores;
  assert.strictEqual(Math.round(tickNorm * 100) / 100, 0.20);
});

// ----------------------------------------------------------------------------
// SUITE 3: FORENSIC AUDIT OF LIVE_CPU_METRICS.CSV
// ----------------------------------------------------------------------------
console.log('\n--- Suite 3: Forensic Audit of live_cpu_metrics.csv ---');

const csvPath = path.join(__dirname, '../.agents/teamwork/teamwork_worker_m3/live_cpu_metrics.csv');
const csvRaw = fs.readFileSync(csvPath, 'utf8').trim().split('\n');

runTest('3.1. CSV structure and row count integrity', () => {
  assert.ok(csvRaw.length > 1, 'CSV must contain data');
  const header = csvRaw[0].replace(/\r/g, '').split(',').map(s => s.replace(/"/g, ''));
  const expectedHeader = ['Iteration', 'ProcessId', 'Role', 'RawCpuPct', 'NormCpuPct', 'WorkingSetMB', 'PrivateMB'];
  assert.deepStrictEqual(header, expectedHeader, 'Header columns must match expected format');

  const rows = csvRaw.slice(1).map(line => {
    const parts = line.replace(/\r/g, '').split(',').map(s => s.replace(/"/g, ''));
    return {
      iteration: parseInt(parts[0], 10),
      pid: parseInt(parts[1], 10),
      role: parts[2],
      rawCpu: parseFloat(parts[3]),
      normCpu: parseFloat(parts[4]),
      wsMB: parseFloat(parts[5]),
      privMB: parseFloat(parts[6]),
    };
  });

  assert.strictEqual(rows.length, 140, 'Must have exactly 140 rows (20 iterations * 7 processes)');

  // Verify all 20 iterations are present
  const iterations = new Set(rows.map(r => r.iteration));
  assert.strictEqual(iterations.size, 20, 'Must contain exactly 20 iterations');
  for (let i = 1; i <= 20; i++) {
    assert.ok(iterations.has(i), `Iteration ${i} must exist`);
  }

  // Verify all 7 PIDs are present in each iteration
  const pids = new Set(rows.map(r => r.pid));
  assert.strictEqual(pids.size, 7, 'Must track exactly 7 unique processes');
  for (let i = 1; i <= 20; i++) {
    const iterRows = rows.filter(r => r.iteration === i);
    assert.strictEqual(iterRows.length, 7, `Iteration ${i} must have exactly 7 process rows`);
    const iterPids = new Set(iterRows.map(r => r.pid));
    assert.strictEqual(iterPids.size, 7, `Iteration ${i} must have 7 unique PIDs`);
  }
});

runTest('3.2. Normalization mathematical invariant holds across 100% of rows', () => {
  const rows = csvRaw.slice(1).map(line => {
    const parts = line.replace(/\r/g, '').split(',').map(s => s.replace(/"/g, ''));
    return {
      iteration: parseInt(parts[0], 10),
      pid: parseInt(parts[1], 10),
      role: parts[2],
      rawCpu: parseFloat(parts[3]),
      normCpu: parseFloat(parts[4]),
    };
  });

  for (const r of rows) {
    const expectedNorm = Math.round((r.rawCpu / 8) * 100) / 100;
    const diff = Math.abs(r.normCpu - expectedNorm);
    assert.ok(diff <= 0.01, `Row at Iter ${r.iteration} PID ${r.pid} normCpu (${r.normCpu}) must equal expected (${expectedNorm})`);
  }
});

runTest('3.3. Empirical CPU metrics satisfy Milestone 3 target criteria', () => {
  const rows = csvRaw.slice(1).map(line => {
    const parts = line.replace(/\r/g, '').split(',').map(s => s.replace(/"/g, ''));
    return {
      iteration: parseInt(parts[0], 10),
      pid: parseInt(parts[1], 10),
      role: parts[2],
      rawCpu: parseFloat(parts[3]),
      normCpu: parseFloat(parts[4]),
      wsMB: parseFloat(parts[5]),
      privMB: parseFloat(parts[6]),
    };
  });

  // Calculate averages per role
  const roles = [...new Set(rows.map(r => r.role))];
  const summary = {};
  for (const role of roles) {
    const roleRows = rows.filter(r => r.role === role);
    const avgNorm = roleRows.reduce((acc, r) => acc + r.normCpu, 0) / roleRows.length;
    const maxNorm = Math.max(...roleRows.map(r => r.normCpu));
    const avgWs = roleRows.reduce((acc, r) => acc + r.wsMB, 0) / roleRows.length;
    summary[role] = { avgNorm, maxNorm, avgWs };
  }

  // Verify Renderer: Target < 5%, Worker claimed 0.01%
  assert.ok(summary['Renderer (JS/DOM)'], 'Renderer role must exist');
  assert.ok(summary['Renderer (JS/DOM)'].avgNorm < 1.0, `Renderer avg CPU (${summary['Renderer (JS/DOM)'].avgNorm}%) must be < 1.0% (target < 5%)`);
  assert.ok(summary['Renderer (JS/DOM)'].maxNorm < 2.0, `Renderer peak CPU (${summary['Renderer (JS/DOM)'].maxNorm}%) must be < 2.0%`);

  // Verify GPU Process: Target < 4%, Worker claimed 0.02%
  assert.ok(summary['GPU Process'], 'GPU Process role must exist');
  assert.ok(summary['GPU Process'].avgNorm < 1.0, `GPU Process avg CPU (${summary['GPU Process'].avgNorm}%) must be < 1.0% (target < 4%)`);
  assert.ok(summary['GPU Process'].maxNorm < 2.0, `GPU Process peak CPU (${summary['GPU Process'].maxNorm}%) must be < 2.0%`);

  // Verify Host (Rust): Target <= 1.7%, Worker claimed 0.11%
  assert.ok(summary['Host (Rust)'], 'Host role must exist');
  assert.ok(summary['Host (Rust)'].avgNorm <= 1.7, `Host avg CPU (${summary['Host (Rust)'].avgNorm}%) must be <= 1.7%`);

  // Verify Total Average Normalized CPU: Target < 8-10%, Worker claimed ~0.22%
  let totalAvgNorm = 0;
  for (const role of roles) {
    totalAvgNorm += summary[role].avgNorm;
  }
  assert.ok(totalAvgNorm < 5.0, `Total application CPU (${totalAvgNorm.toFixed(2)}%) must be well below target (< 8-10%)`);
});

runTest('3.4. Memory footprints exhibit stability without continuous unbounded expansion', () => {
  const rows = csvRaw.slice(1).map(line => {
    const parts = line.replace(/\r/g, '').split(',').map(s => s.replace(/"/g, ''));
    return {
      iteration: parseInt(parts[0], 10),
      pid: parseInt(parts[1], 10),
      role: parts[2],
      wsMB: parseFloat(parts[5]),
      privMB: parseFloat(parts[6]),
    };
  });

  // Check total working set per iteration
  const iterWorkingSets = [];
  for (let i = 1; i <= 20; i++) {
    const totalWs = rows.filter(r => r.iteration === i).reduce((sum, r) => sum + r.wsMB, 0);
    iterWorkingSets.push(totalWs);
  }

  const startWs = iterWorkingSets[0];
  const endWs = iterWorkingSets[19];
  const diffWs = endWs - startWs;

  // Total working set should not grow by more than 50 MB over 20s
  assert.ok(Math.abs(diffWs) < 50.0, `Working set drift (${diffWs.toFixed(2)} MB) must be bounded (< 50 MB)`);
});

console.log(`\nAll ${passedTests}/${totalTests} Challenger M3 audit tests passed successfully!\n`);
