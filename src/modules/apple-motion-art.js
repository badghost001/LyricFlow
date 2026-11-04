/**
 * src/modules/apple-motion-art.js
 * High-definition Apple Music Motion Artwork (Album Motion) resolution engine.
 * Resolves animated 1:1 square & 9:16 tall video loops for live playback.
 */

(function (global) {
  'use strict';

  const DEFAULT_DEV_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNzkyNTM1Njc2LCJleHAiOjE3OTg1ODM2NzYsInJvb3RfaHR0cHNfb3JpZ2luIjpbImFwcGxlLmNvbSJdfQ.YpBDqePdK0r_5lxtByqto20zc60FhO1eLoYJ5mrayZ73IYsW4yguaJAFMzud_5FSZ7cjTCdM5ST_MecdbHDA2Q';
  let cachedDevToken = null;
  let devTokenExpiry = 0;

  async function getAppleDeveloperToken() {
    const now = Date.now();
    if (cachedDevToken && now < devTokenExpiry) return cachedDevToken;
    if (typeof fetch === 'undefined') return DEFAULT_DEV_TOKEN;
    try {
      const html = await fetch('https://music.apple.com/us/browse').then(r => r.text());
      const match = html.match(/src="(\/assets\/index~[^"]+\.js)"/);
      if (match) {
        const js = await fetch('https://music.apple.com' + match[1]).then(r => r.text());
        const m = js.match(/="?(ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/);
        if (m) {
          cachedDevToken = m[1];
          devTokenExpiry = now + 12 * 3600 * 1000;
          return cachedDevToken;
        }
      }
    } catch (e) {
      // Fall back to embedded token
    }
    return DEFAULT_DEV_TOKEN;
  }

  // In-memory LRU cache
  const motionCache = new Map();
  const MAX_CACHE_ENTRIES = 50;

  // Load persisted cache on init
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('lf_apple_motion_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const [k, v] of Object.entries(parsed)) {
          motionCache.set(k, v);
          // Older releases did not bound the persisted cache. Trim as it is
          // loaded so an existing oversized cache cannot keep growing in RAM.
          while (motionCache.size > MAX_CACHE_ENTRIES) {
            motionCache.delete(motionCache.keys().next().value);
          }
        }
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }

  function persistCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      const obj = {};
      for (const [k, v] of motionCache.entries()) {
        obj[k] = v;
      }
      localStorage.setItem('lf_apple_motion_cache', JSON.stringify(obj));
    } catch (e) {}
  }

  function getCacheKey(artist, title, album) {
    const a = (artist || '').toLowerCase().trim();
    const t = (title || '').toLowerCase().trim();
    const alb = (album || '').toLowerCase().trim();
    return `${a}::${alb || t}`;
  }

  function cleanString(str) {
    if (!str) return '';
    return str
      .replace(/[\u2018\u2019\u02bc\u0060]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\s*-\s*Topic/gi, '')
      .replace(/\s*\(feat\.[^)]*\)/gi, '')
      .replace(/\s*\[feat\.[^\]]*\]/gi, '')
      .replace(/\s*feat\.\s+.*$/gi, '')
      .replace(/\s*ft\.\s+.*$/gi, '')
      .replace(/\s*\([^)]*(Remaster|Deluxe|Edition|Version|Anniversary|Live|Bonus)[^)]*\)/gi, '')
      .replace(/\s*\[[^\]]*(Remaster|Deluxe|Edition|Version|Anniversary|Live|Bonus)[^\]]*\]/gi, '')
      .replace(/\s*-\s*(Remastered|Deluxe|Single|EP).*$/gi, '')
      .trim();
  }

  function isDisqualifiedAppleCollection(name, artist, isCompilation, curator, queryTarget = '') {
    const n = (name || '').toLowerCase();
    const a = (artist || '').toLowerCase();
    const q = (queryTarget || '').toLowerCase();

    if (q.includes('dj mix') || q.includes('remix')) return false;

    const blacklistKeywords = [
      'dj mix',
      'apple music',
      'rap life',
      '[mixed]',
      '(mixed)',
      'megamix',
      'continuous mix',
      'remix collection'
    ];

    for (const kw of blacklistKeywords) {
      if (n.includes(kw)) return true;
    }

    if (isCompilation === true && !q.includes('compilation')) return true;
    if (curator && curator.toLowerCase().includes('apple music')) return true;
    if (a.includes('various artists') && !q.includes('various artists')) return true;

    return false;
  }

  function isTitleMatch(target, candidate) {
    if (!target || !candidate) return false;
    const t = cleanString(target).toLowerCase();
    const c = cleanString(candidate).toLowerCase();
    return t === c || c.startsWith(t) || t.startsWith(c);
  }

  function isArtistMatch(targetArtist, candidateArtist) {
    if (!targetArtist || !candidateArtist) return false;
    const t = cleanString(targetArtist).toLowerCase();
    const c = cleanString(candidateArtist).toLowerCase();
    const firstWordT = t.split(/[\s,&/]+/)[0];
    const firstWordC = c.split(/[\s,&/]+/)[0];
    return t.includes(firstWordC) || c.includes(firstWordT);
  }

  /**
   * Resolves progressive MP4 url from an HLS manifest containing #EXT-X-MAP:URI or master variant playlist
   */
  async function resolveProgressiveMp4(m3u8Url) {
    if (!m3u8Url || typeof fetch === 'undefined') return null;
    try {
      const res = await fetch(m3u8Url);
      if (!res.ok) return null;
      const text = await res.text();

      // Direct child variant playlist
      const match = text.match(/#EXT-X-MAP:URI="([^"]+)"/);
      if (match && match[1]) {
        return new URL(match[1], m3u8Url).href;
      }

      // Master playlist: pick AVC1 stream with resolution ~400..=540 for silky-smooth 60fps low-GPU playback
      const lines = text.split('\n');
      const candidateVariants = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('#EXT-X-STREAM-INF') && !line.includes('I-FRAME') && lines[i + 1] && !lines[i + 1].trim().startsWith('#')) {
          const nextUrl = new URL(lines[i + 1].trim(), m3u8Url).href;
          const isAvc = line.includes('CODECS="avc1');
          const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
          const width = resMatch ? parseInt(resMatch[1], 10) : 0;
          candidateVariants.push({ url: nextUrl, isAvc, width });
        }
      }

      candidateVariants.sort((a, b) => {
        if (a.isAvc !== b.isAvc) return a.isAvc ? -1 : 1;
        const distA = Math.abs((a.width || 486) - 486);
        const distB = Math.abs((b.width || 486) - 486);
        return distA - distB;
      });

      for (const cand of candidateVariants) {
        try {
          const childRes = await fetch(cand.url);
          if (childRes.ok) {
            const childText = await childRes.text();
            const childMap = childText.match(/#EXT-X-MAP:URI="([^"]+)"/);
            if (childMap && childMap[1]) {
              return new URL(childMap[1], cand.url).href;
            }
          }
        } catch (_) {}
      }

      if (candidateVariants.length === 0) {
        for (const l of lines) {
          if (l.trim() && !l.trim().startsWith('#') && l.includes('.m3u8')) {
            const childUrl = new URL(l.trim(), m3u8Url).href;
            try {
              const childRes = await fetch(childUrl);
              if (childRes.ok) {
                const childText = await childRes.text();
                const childMap = childText.match(/#EXT-X-MAP:URI="([^"]+)"/);
                if (childMap && childMap[1]) {
                  return new URL(childMap[1], childUrl).href;
                }
              }
            } catch (_) {}
            break;
          }
        }
      }
      return null;
    } catch (e) {
      // Fallback
    }
    return null;
  }

  /**
   * Search Apple Music Modern Catalog API directly
   */
  async function searchAppleMusicCatalog(artist, title, album) {
    const token = await getAppleDeveloperToken();
    if (!token || typeof fetch === 'undefined') return null;

    const cleanA = cleanString(artist);
    const cleanT = cleanString(title);
    const cleanAlb = cleanString(album);

    const queries = [];
    if (cleanAlb) {
      queries.push({ term: `${cleanA} ${cleanAlb}`, type: 'albums', target: cleanAlb });
    }
    if (cleanT) {
      queries.push({ term: `${cleanA} ${cleanT}`, type: 'songs', target: cleanT });
    }

    for (const q of queries) {
      try {
        const url = `https://amp-api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(q.term)}&types=${q.type}&limit=6`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Origin': 'https://music.apple.com'
          }
        });
        if (!res.ok) continue;
        const json = await res.json();
        const items = json.results?.[q.type]?.data || [];

        for (const item of items) {
          let albumId = null;
          let candAlbumTitle = '';

          const candArtist = item.attributes?.artistName || '';
          const isCompilation = item.attributes?.isCompilation === true;
          const curator = item.attributes?.curatorName || '';

          if (q.type === 'albums') {
            candAlbumTitle = item.attributes?.name || '';
            if (isDisqualifiedAppleCollection(candAlbumTitle, candArtist, isCompilation, curator, q.target)) continue;
            if (!isArtistMatch(cleanA, candArtist)) continue;
            if (!isTitleMatch(q.target, candAlbumTitle)) continue;
            albumId = item.id;
          } else if (q.type === 'songs') {
            const candTrackTitle = item.attributes?.name || '';
            candAlbumTitle = item.attributes?.albumName || '';
            if (isDisqualifiedAppleCollection(candTrackTitle, candArtist, isCompilation, curator, q.target)) continue;
            if (candAlbumTitle && isDisqualifiedAppleCollection(candAlbumTitle, candArtist, isCompilation, curator, q.target)) continue;
            if (!isArtistMatch(cleanA, candArtist)) continue;
            if (!isTitleMatch(q.target, candTrackTitle)) continue;
            if (cleanAlb && !isTitleMatch(cleanAlb, candAlbumTitle)) {
              continue;
            }
            const songUrl = item.attributes?.url || '';
            const m = songUrl.match(/\/album\/[^\/]+\/(\d+)/);
            if (m) albumId = m[1];
          }

          if (!albumId) continue;

          const detailUrl = `https://amp-api.music.apple.com/v1/catalog/us/albums/${albumId}?extend=editorialVideo`;
          const detailRes = await fetch(detailUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Origin': 'https://music.apple.com'
            }
          });
          if (!detailRes.ok) continue;
          const detailJson = await detailRes.json();
          const albData = detailJson.data?.[0];
          if (!albData) continue;
          if (isDisqualifiedAppleCollection(albData.attributes?.name, albData.attributes?.artistName, albData.attributes?.isCompilation === true, albData.attributes?.curatorName, q.target)) {
            continue;
          }
          const ed = albData.attributes?.editorialVideo;
          const squareM3u8 = ed?.motionDetailSquare?.video || ed?.motionSquareVideo1x1?.video || null;
          const tallM3u8 = ed?.motionDetailTall?.video || ed?.motionTallVideo3x4?.video || null;
          if (squareM3u8 || tallM3u8) {
            // Some catalog entries expose only the 3:4 stream. Keep it usable
            // as the primary video and preserve its tall aspect selection.
            const squareSource = squareM3u8 || tallM3u8;
            const tallSource = tallM3u8 || squareM3u8;
            const squareMp4 = await resolveProgressiveMp4(squareSource);
            const tallMp4 = await resolveProgressiveMp4(tallSource);

            const effectiveSquare = squareMp4 || tallMp4;
            const effectiveTall = tallMp4 || squareMp4;
            if (!effectiveSquare && !effectiveTall) continue;

            return {
              type: 'video',
              url: effectiveSquare,
              tallUrl: effectiveTall,
              motionSourceVersion: 1,
              m3u8Url: squareSource,
              aspectRatio: squareM3u8 ? 'square' : 'tall',
              album: albData.attributes?.name || candAlbumTitle,
              artist: albData.attributes?.artistName || cleanA,
              source: 'apple-motion'
            };
          }
        }
      } catch (e) {}
    }

    return null;
  }

  /**
   * Fallback iTunes search API for potential Apple Music album candidate URLs
   */
  async function findAppleMusicAlbumUrls(artist, title, album) {
    if (typeof fetch === 'undefined') return [];

    const cleanArtist = cleanString(artist);
    const cleanAlbum = cleanString(album);
    const cleanTitle = cleanString(title);

    const queries = [];
    if (cleanArtist && cleanAlbum) {
      queries.push({ term: `${cleanArtist} ${cleanAlbum}`, entity: 'album', target: cleanAlbum });
    }
    if (cleanArtist && cleanTitle && cleanTitle !== cleanAlbum) {
      queries.push({ term: `${cleanArtist} ${cleanTitle}`, entity: 'album', target: cleanTitle });
    }

    const candidateUrls = [];
    const seenUrls = new Set();

    for (const q of queries) {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q.term)}&entity=${q.entity}&limit=4`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            for (const item of data.results) {
              const candArtist = item.artistName || '';
              const candCollection = item.collectionName || '';
              const isComp = item.collectionType === 'Compilation';
              if (isDisqualifiedAppleCollection(candCollection, candArtist, isComp, null, q.target)) continue;
              if (!isArtistMatch(cleanArtist, candArtist)) continue;
              if (!isTitleMatch(q.target, candCollection)) continue;

              if (item.collectionViewUrl && !seenUrls.has(item.collectionViewUrl)) {
                const cleanUrl = item.collectionViewUrl.split('?')[0];
                seenUrls.add(cleanUrl);
                candidateUrls.push({ url: cleanUrl, album: candCollection, artist: candArtist });
              }
            }
          }
        }
      } catch (e) {}
    }

    return candidateUrls;
  }

  /**
   * Primary entrypoint: Fetches Motion Artwork for track / album
   */
  async function fetchAppleMotionArt(artist, title, album = '') {
    if (!artist && !title && !album) return null;

    const cacheKey = getCacheKey(artist, title, album);
    if (motionCache.has(cacheKey)) {
      const cached = motionCache.get(cacheKey);
      if (cached !== 'notfound') {
        // Refresh legacy video entries once; older caches stored only a square
        // URL and masked the tall stream now exposed by the catalog.
        const needsAspectRefresh = cached?.type === 'video' && cached.motionSourceVersion !== 1;
        if (!needsAspectRefresh) {
          // Map insertion order is the LRU order used by persistCache().
          motionCache.delete(cacheKey);
          motionCache.set(cacheKey, cached);
          return cached;
        }
        motionCache.delete(cacheKey);
      }
      // Old releases persisted negative results indefinitely. Retry these
      // entries so temporary API failures do not permanently disable motion art.
      motionCache.delete(cacheKey);
    }

    // 1. Try Tauri Rust backend IPC if available
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.fetchAppleMotionArt === 'function') {
      try {
        const rustResult = await window.electronAPI.fetchAppleMotionArt(artist, title, album);
        if (rustResult && (rustResult.url || rustResult.tall_url)) {
          let primaryUrl = rustResult.url;
          let tallUrl = rustResult.tall_url || rustResult.tallUrl || rustResult.url;

          // Ensure both streams resolve to direct progressive MP4s, never raw m3u8 playlists
          if (primaryUrl && primaryUrl.includes('.m3u8')) {
            primaryUrl = await resolveProgressiveMp4(primaryUrl);
          }
          if (tallUrl && tallUrl.includes('.m3u8')) {
            tallUrl = await resolveProgressiveMp4(tallUrl);
          }
          if (!tallUrl) tallUrl = primaryUrl;
          if (!primaryUrl) primaryUrl = tallUrl;

          if (primaryUrl) {
            const item = {
              type: 'video',
              url: primaryUrl,
              tallUrl: tallUrl || primaryUrl,
              motionSourceVersion: 1,
              m3u8Url: rustResult.m3u8_url || rustResult.m3u8Url,
              aspectRatio: rustResult.aspect_ratio || 'square',
              album: rustResult.album,
              artist: rustResult.artist,
              staticArt: rustResult.static_art || rustResult.staticArt,
              source: 'apple-motion'
            };
            motionCache.set(cacheKey, item);
            if (motionCache.size > MAX_CACHE_ENTRIES) {
              const first = motionCache.keys().next().value;
              motionCache.delete(first);
            }
            persistCache();
            return item;
          }
        } else if (rustResult === null) {
          // A catalog miss is not definitive: the web catalog / cover service
          // can still resolve motion art even when Rust's catalog request did not.
        }
      } catch (e) {
        console.warn('[AppleMotionArt] Tauri IPC fetch error, falling back to web fetcher:', e);
      }
    }

    // 2. Primary Web Catalog Engine
    try {
      const catalogResult = await searchAppleMusicCatalog(artist, title, album);
      if (catalogResult) {
        motionCache.set(cacheKey, catalogResult);
        if (motionCache.size > MAX_CACHE_ENTRIES) {
          const first = motionCache.keys().next().value;
          motionCache.delete(first);
        }
        persistCache();
        return catalogResult;
      }
    } catch (e) {
      console.warn('[AppleMotionArt] Catalog search error:', e);
    }

    // 3. Secondary Fallback via verified candidate URLs
    try {
      const albumCandidates = await findAppleMusicAlbumUrls(artist, title, album);
      for (const cand of albumCandidates) {
        try {
          const coversApiUrl = `https://api.aritra.ovh/v1/covers?url=${encodeURIComponent(cand.url)}`;
          const coverRes = await fetch(coversApiUrl);
          if (!coverRes.ok) continue;

          const coverData = await coverRes.json();
          const squareStreams = coverData.master_Streams?.square;
          const tallStreams = coverData.master_Streams?.tall;

          let squareM3u8 = null;
          if (Array.isArray(squareStreams) && squareStreams.length > 0) {
            const selected = squareStreams.find(s => s.width >= 360 && s.width <= 768) || squareStreams[0];
            squareM3u8 = selected?.uri;
          } else if (coverData.master?.square) {
            squareM3u8 = coverData.master.square;
          }

          let tallM3u8 = null;
          if (Array.isArray(tallStreams) && tallStreams.length > 0) {
            const selected = tallStreams.find(s => s.width >= 360 && s.width <= 830) || tallStreams[0];
            tallM3u8 = selected?.uri;
          } else if (coverData.master?.tall) {
            tallM3u8 = coverData.master.tall;
          }

          if (squareM3u8 || tallM3u8) {
            const primaryM3u8 = squareM3u8 || tallM3u8;
            const directSquareMp4 = squareM3u8 ? await resolveProgressiveMp4(squareM3u8) : null;
            const directTallMp4 = tallM3u8 ? await resolveProgressiveMp4(tallM3u8) : null;

            const effectiveSquare = directSquareMp4 || directTallMp4;
            const effectiveTall = directTallMp4 || directSquareMp4;
            if (!effectiveSquare && !effectiveTall) continue;

            const item = {
              type: 'video',
              url: effectiveSquare,
              tallUrl: effectiveTall,
              motionSourceVersion: 1,
              m3u8Url: primaryM3u8,
              aspectRatio: squareM3u8 ? 'square' : 'tall',
              album: coverData.album_info?.title || cand.album,
              artist: coverData.album_info?.artist || cand.artist,
              staticArt: coverData.uncompressed_cover_art?.url,
              source: 'apple-motion'
            };

            motionCache.set(cacheKey, item);
            if (motionCache.size > MAX_CACHE_ENTRIES) {
              const first = motionCache.keys().next().value;
              motionCache.delete(first);
            }
            persistCache();
            return item;
          }
        } catch (e) {}
      }

      return null;
    } catch (err) {
      console.warn('[AppleMotionArt] Error resolving motion artwork:', err);
      return null;
    }
  }

  const moduleExports = {
    fetchAppleMotionArt,
    cleanString,
    getCacheKey,
    isTitleMatch,
    isArtistMatch,
    isDisqualifiedAppleCollection,
    resolveProgressiveMp4,
    findAppleMusicAlbumUrls,
    searchAppleMusicCatalog
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduleExports;
  }
  if (typeof global !== 'undefined') {
    global.AppleMotionArt = moduleExports;
  }
})(typeof window !== 'undefined' ? window : globalThis);
