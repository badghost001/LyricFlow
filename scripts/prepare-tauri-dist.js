const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'src');
const targetDir = path.join(repoRoot, 'src-tauri', 'target', 'lyricflow-frontend');
const allowedTarget = path.join(repoRoot, 'src-tauri', 'target') + path.sep;
const resolvedTarget = path.resolve(targetDir);

if (!resolvedTarget.startsWith(allowedTarget)) {
  throw new Error(`Refusing to stage frontend outside Cargo target directory: ${resolvedTarget}`);
}

fs.rmSync(resolvedTarget, { recursive: true, force: true });
fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
fs.cpSync(sourceDir, resolvedTarget, {
  recursive: true,
  filter: (entry) => path.resolve(entry) !== path.join(sourceDir, 'edge_glow.html')
});

if (fs.existsSync(path.join(resolvedTarget, 'edge_glow.html'))) {
  throw new Error('Deprecated edge_glow.html must not be included in the Tauri frontend bundle.');
}

console.log('Prepared Tauri frontend (legacy edge-glow page excluded).');
