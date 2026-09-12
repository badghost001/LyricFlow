/**
 * Escaping utility for template interpolation to prevent syntax/HTML breakages.
 */
function escapeHtmlAndBackticks(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize strings for safe embedding into JavaScript contexts.
 */
function sanitizeForJs(str) {
  if (!str) return '';
  return JSON.stringify(String(str));
}

module.exports = {
  escapeHtmlAndBackticks,
  sanitizeForJs
};
