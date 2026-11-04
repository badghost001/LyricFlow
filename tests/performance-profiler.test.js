const assert = require('assert');
const fs = require('fs');
const path = require('path');

const profiler = fs.readFileSync(path.join(__dirname, '../scripts/measure_cpu.ps1'), 'utf8');
const uiProbe = fs.readFileSync(path.join(__dirname, '../scripts/measure-ui-responsiveness.js'), 'utf8');

assert.match(profiler, /\[int\]\$DurationSeconds = 60/);
assert.match(profiler, /\[double\]\$IntervalSeconds = 1\.0/);
assert.match(profiler, /\[string\]\$Scenario = "unspecified"/);
assert.match(profiler, /ParentProcessId/);
assert.match(profiler, /--type=renderer/);
assert.match(profiler, /--type=gpu-process/);
assert.match(profiler, /ProcessorCount/);
assert.match(profiler, /TotalAppCpuP95Pct/);
assert.match(profiler, /TotalAppCpuMaxPct/);
assert.match(profiler, /OpenProcess\(0x1000/);
assert.match(profiler, /WorkingSetMeanMB/);
assert.match(profiler, /PrivateBytesMeanMB/);
assert.doesNotMatch(profiler, /Get-CimInstance|Win32_Process/,
  'Profiler must remain usable when CIM process enumeration is denied.');

assert.match(uiProbe, /PerformanceObserver/);
assert.match(uiProbe, /longtask/);
assert.match(uiProbe, /event/);
assert.match(uiProbe, /interactionP95Ms/);
assert.match(uiProbe, /window\.__lfPerf/);

console.log('Performance profiler and UI responsiveness probe contracts passed.');
