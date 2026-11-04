/*
 * Paste this file into the LyricFlow WebView2 DevTools console while running a
 * named scenario. It observes browser Event Timing and Long Tasks without
 * adding its own animation loop. Call window.__lfPerf.stop() to print a report.
 */
(function installLyricFlowResponsivenessProbe() {
  if (window.__lfPerf?.stop) window.__lfPerf.stop();
  const startedAt = performance.now();
  const events = [];
  const longTasks = [];
  const observers = [];
  const supported = { eventTiming: false, longTasks: false };

  function observe(type, callback, options) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) callback(entry);
      });
      observer.observe({ type, buffered: true, ...options });
      observers.push(observer);
      return true;
    } catch (_) {
      return false;
    }
  }

  supported.eventTiming = observe('event', (entry) => {
    if (entry.duration >= 16) {
      events.push({ name: entry.name, durationMs: entry.duration, startTimeMs: entry.startTime });
    }
  }, { durationThreshold: 16 });
  supported.longTasks = observe('longtask', (entry) => {
    longTasks.push({ durationMs: entry.duration, startTimeMs: entry.startTime });
  });

  function percentile(values, p) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  }

  window.__lfPerf = {
    stop() {
      observers.forEach((observer) => observer.disconnect());
      const eventValues = events.map((item) => item.durationMs);
      const taskValues = longTasks.map((item) => item.durationMs);
      const report = {
        startedAt: new Date(Date.now() - (performance.now() - startedAt)).toISOString(),
        durationSeconds: Number(((performance.now() - startedAt) / 1000).toFixed(1)),
        supported,
        interactionCount: events.length,
        interactionP95Ms: percentile(eventValues, 0.95),
        longTaskCount: longTasks.length,
        longestTaskMs: taskValues.length ? Math.max(...taskValues) : 0,
        events,
        longTasks
      };
      console.log('[LyricFlow UI responsiveness]', JSON.stringify(report));
      delete window.__lfPerf;
      return report;
    }
  };
  console.info('[LyricFlow UI responsiveness] Probe active. Exercise the scenario, then call __lfPerf.stop().');
})();
