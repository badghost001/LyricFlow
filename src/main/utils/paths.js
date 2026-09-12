const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Get project root path reliably across packaged and unpackaged environments.
 */
function getProjectRoot() {
  return app.getAppPath();
}

/**
 * Helper to get script paths correctly when running inside an ASAR archive.
 * Native executables and scripts must be run from app.asar.unpacked.
 */
function getScriptPath(scriptName) {
  let p = path.join(getProjectRoot(), scriptName);
  if (p.includes('app.asar')) {
    p = p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}

/**
 * Get path for config file (with seamless migration from old app folder).
 */
function getConfigPath() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const configPath = path.join(userDataPath, 'config.json');

  // Migrate config from the old "spotify-lyrics-overlay" userData folder if it exists
  if (!fs.existsSync(configPath)) {
    const oldConfigPath = path.join(path.dirname(userDataPath), 'spotify-lyrics-overlay', 'config.json');
    if (fs.existsSync(oldConfigPath)) {
      try {
        fs.copyFileSync(oldConfigPath, configPath);
        console.log('[Config] Migrated config from old app folder.');
      } catch (e) {
        console.warn('[Config] Failed to migrate old config:', e.message);
      }
    }
  }

  return configPath;
}

/**
 * Get path to an asset in the assets directory.
 */
function getAssetPath(assetName) {
  return path.join(getProjectRoot(), 'assets', assetName);
}

/**
 * Get path to an HTML file in src directory.
 */
function getHtmlPath(htmlName) {
  return path.join(getProjectRoot(), 'src', htmlName);
}

/**
 * Get path to a preload script.
 */
function getPreloadPath(preloadName) {
  return path.join(getProjectRoot(), preloadName);
}

module.exports = {
  getProjectRoot,
  getScriptPath,
  getConfigPath,
  getAssetPath,
  getHtmlPath,
  getPreloadPath
};
