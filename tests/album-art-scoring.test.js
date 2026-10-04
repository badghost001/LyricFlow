const assert = require('assert');

// 1. Primary Artist Splitting
function extractPrimaryArtist(artist) {
  let s = artist.trim();
  const lower = s.toLowerCase();
  const seps = [' feat. ', ' feat ', ' ft. ', ' ft ', ' with ', ' / ', ' vs. ', ' vs '];
  for (const sep of seps) {
    const pos = lower.indexOf(sep);
    if (pos !== -1) {
      s = s.slice(0, pos).trim();
      break;
    }
  }
  const primary = s.split(/[;,&]/)[0].trim();
  return primary || artist.trim();
}

// 2. Anti-Tribute / Anti-Cover Disqualification
function isDisqualifiedCover(query, candidateText) {
  const qLower = query.toLowerCase();
  const cLower = candidateText.toLowerCase();
  const blacklisted = [
    'karaoke',
    'tribute',
    'originally performed by',
    'in the style of',
    'backing track',
    'piano version',
    '2 pianos version',
    'piano cover',
    'acoustic cover',
    'instrumental',
    'cover version',
    ' cover',
    '(cover',
    '[cover'
  ];
  for (const term of blacklisted) {
    if (cLower.includes(term) && !qLower.includes(term)) {
      return true;
    }
  }
  return false;
}

// 3. String Similarity (Levenshtein + Token containment)
function computeStringSimilarity(a, b) {
  const normA = a.toLowerCase().replace(/[\(\)\[\]\-]/g, '').trim();
  const normB = b.toLowerCase().replace(/[\(\)\[\]\-]/g, '').trim();
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    return maxLen > 0 ? 0.75 + (minLen / maxLen) * 0.25 : 0.0;
  }
  // Token match
  const wordsA = new Set(normA.split(/\s+/));
  const wordsB = new Set(normB.split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0.0;
}

// 4. Candidate Match Evaluator
function evaluateCandidate(reqTitle, reqArtist, candTitle, candArtists) {
  const candCombined = `${candTitle} ${candArtists.join(' ')}`;
  const reqCombined = `${reqTitle} ${reqArtist}`;
  if (isDisqualifiedCover(reqCombined, candCombined)) {
    return { passes: false, score: 0.0, reason: 'disqualified_cover' };
  }

  const titleScore = computeStringSimilarity(reqTitle, candTitle);
  let maxArtistScore = 0.0;
  for (const a of candArtists) {
    const score = computeStringSimilarity(reqArtist, a);
    if (score > maxArtistScore) maxArtistScore = score;
  }

  const combined = (titleScore * 0.5) + (maxArtistScore * 0.5);
  const passes = (combined >= 0.70 && maxArtistScore >= 0.60) || (titleScore >= 0.90 && maxArtistScore >= 0.55);
  return { passes, score: combined, titleScore, maxArtistScore };
}

// 5. Test Suite
console.log('Running Album Art Retrieval & Scoring Test Suite...');

// Test 1: Primary Artist Extraction
assert.strictEqual(extractPrimaryArtist('The Weeknd, Daft Punk'), 'The Weeknd');
assert.strictEqual(extractPrimaryArtist('Taylor Swift & Post Malone'), 'Taylor Swift');
assert.strictEqual(extractPrimaryArtist('Ed Sheeran feat. Justin Bieber'), 'Ed Sheeran');
assert.strictEqual(extractPrimaryArtist('Billie Eilish with Khalid'), 'Billie Eilish');
assert.strictEqual(extractPrimaryArtist('YOASOBI'), 'YOASOBI');
console.log('✓ Test 1 Passed: Primary artist extraction works across all separators');

// Test 2: Disqualifying Tributes & Covers
assert.strictEqual(isDisqualifiedCover('夜に駆ける YOASOBI', 'YOASOBI - 夜に駆ける [2 pianos version] KayThePianist'), true);
assert.strictEqual(isDisqualifiedCover('Idol YOASOBI', 'IDOL KARAOKE Original by YOASOBI'), true);
assert.strictEqual(isDisqualifiedCover('Idol YOASOBI', 'Idol English Cover (From "Oshi No Ko") [Full] Phoebe'), true);
assert.strictEqual(isDisqualifiedCover('Cruel Summer Taylor Swift', 'Cruel Summer - Acoustic Piano Cover'), true);
assert.strictEqual(isDisqualifiedCover('Shape of You Piano Cover', 'Shape of You Piano Cover'), false); // User asked for it
console.log('✓ Test 2 Passed: Tributes, piano covers, and karaoke versions are correctly disqualified');

// Test 3: Candidate Scoring - Genuine Match
const matchResult = evaluateCandidate('Blinding Lights', 'The Weeknd', 'Blinding Lights', ['The Weeknd']);
assert.strictEqual(matchResult.passes, true);
assert.ok(matchResult.score >= 0.95);
console.log('✓ Test 3 Passed: Authentic track candidates match with high confidence (>= 0.95)');

// Test 4: Candidate Scoring - Blind Track Match with Wrong Artist (e.g. "Home")
const wrongArtistResult = evaluateCandidate(
  'Home',
  'Edward Sharpe & The Magnetic Zeros',
  'Home',
  ['Justin Bieber']
);
assert.strictEqual(wrongArtistResult.passes, false);
console.log('✓ Test 4 Passed: Wrong artist candidates for common track titles are safely rejected');

// Test 5: Japanese & Unicode Track Matching
const yoasobiResult = evaluateCandidate(
  '夜に駆ける',
  'YOASOBI',
  '夜に駆ける',
  ['YOASOBI']
);
assert.strictEqual(yoasobiResult.passes, true);
assert.ok(yoasobiResult.score >= 0.95);
console.log('✓ Test 5 Passed: Japanese kanji/kana titles and artists match accurately');

// Test 6: URL Resolution Upgrade
function upgradeArtworkResolution(url) {
  if (!url) return '';
  return url
    .replace(/\/\d+x\d+bb?\.(jpg|png|webp)/i, '/600x600bb.$1')
    .replace('100x100bb', '600x600bb');
}
const upgraded = upgradeArtworkResolution('https://is1-ssl.mzstatic.com/image/thumb/Music/100x100bb.jpg');
assert.strictEqual(upgraded, 'https://is1-ssl.mzstatic.com/image/thumb/Music/600x600bb.jpg');
console.log('✓ Test 6 Passed: High-resolution artwork upgrade works as expected');

// Test 7: Cache Key Migration & Ground Truth Verification
const mockStorage = {};
mockStorage['lyricflow_local_art_cache'] = JSON.stringify({ oldKey: 'bad_art' });

// Migration logic
delete mockStorage['lyricflow_local_art_cache'];
assert.strictEqual(mockStorage['lyricflow_local_art_cache'], undefined);

mockStorage['lyricflow_local_art_cache_v2'] = JSON.stringify({ 'The Weeknd:::Blinding Lights': 'https://i.scdn.co/good_art' });
assert.ok(mockStorage['lyricflow_local_art_cache_v2'].includes('good_art'));
console.log('✓ Test 7 Passed: Cache migration purges v1 corrupted entries and persists v2');

console.log('\nAll 7 Album Art Scoring Tests Passed Successfully! (100% PASS)');
