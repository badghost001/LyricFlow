/**
 * LyricFlow - LyricsPlus Service & Provider (v2 Endpoint)
 * Endpoint: LyricsPlus v2 with public mirror failover.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const models = require('./models');
    const LyricsProvider = require('./LyricsProvider');
    module.exports = factory(models, LyricsProvider);
  } else {
    root.LyricsPlus = factory(root.LyricModels, root.LyricsProvider);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (LyricModels, LyricsProvider) {
  'use strict';

  const { createLyricWord, createLyricLine, createNormalizedLyrics } = LyricModels;

  const API_ENDPOINTS = [
    'https://lyricsplus.binimum.org/v2/lyrics/get',
    'https://lyricsplus.prjktla.my.id/v2/lyrics/get'
  ];
  const API_SOURCE_ORDER = 'apple,lyricsplus,musixmatch,spotify,musixmatch-word';

  function isQAppleLyrics(normalized) {
    const source = `${normalized?.winnerSource || ''} ${normalized?.source || ''}`.toLowerCase();
    return /qapple|apple/.test(source);
  }

  // Development-only logging helper
  const isDev = () => {
    try {
      if (typeof window !== 'undefined') {
        return window.__DEV__ === true || localStorage.getItem('lyricflow_debug') === 'true';
      }
      if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV !== 'production';
      }
    } catch (_) {}
    return false;
  };

  const devLog = (...args) => {
    if (isDev()) {
      console.log(...args);
    }
  };

  /**
   * Normalize input metadata according to Priority:
   * 1. ISRC
   * 2. platformId
   * 3. title + artist + album + duration
   * 4. title + artist
   */
  function normalizeMetadata(raw) {
    if (!raw || typeof raw !== 'object') return {};

    const cleanStr = (s) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : null);

    const title = cleanStr(raw.title || raw.name || raw.trackName);
    const rawArtistStr = cleanStr(raw.artist || raw.artistName || (raw.artists?.[0]?.name) || (typeof raw.artists?.[0] === 'string' ? raw.artists[0] : null));
    const primaryArtist = rawArtistStr ? rawArtistStr.split(/\s*[,&/]\s*|\s+(?:feat\.|ft\.|with)\s+/i)[0].trim() : rawArtistStr;
    const artist = rawArtistStr;
    const album = cleanStr(raw.album?.name || raw.album || raw.albumName);
    const isrc = cleanStr(raw.isrc || raw.external_ids?.isrc);
    const platformId = cleanStr(raw.platformId || raw.id);

    let duration = null;
    if (raw.duration !== undefined && raw.duration !== null) {
      duration = Number(raw.duration);
    } else if (raw.duration_ms !== undefined && raw.duration_ms !== null) {
      duration = Number(raw.duration_ms) / 1000;
    } else if (raw.durationMs !== undefined && raw.durationMs !== null) {
      duration = Number(raw.durationMs) / 1000;
    }

    if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) {
      duration = null;
    } else if (duration !== null) {
      duration = Math.round(duration);
    }

    const source = cleanStr(raw.source);

    return {
      title,
      artist,
      primaryArtist,
      album,
      duration,
      isrc,
      platformId,
      source
    };
  }

  function getFallbackCacheKey(meta) {
    const cleanA = (meta.artist || '').toLowerCase().trim();
    const cleanT = (meta.title || '').toLowerCase().trim();
    const dur = meta.duration ? Math.round(Number(meta.duration)) : 0;
    return `lyrics_plus_track_${encodeURIComponent(cleanA)}_${encodeURIComponent(cleanT)}_${dur}`;
  }

  /**
   * Generate stable cache key for lyrics
   * Prefer ISRC, then artist + title + duration
   */
  function getCacheKey(meta) {
    if (meta.isrc && meta.isrc.trim()) {
      return `lyrics_plus_isrc_${meta.isrc.trim().toUpperCase()}`;
    }
    return getFallbackCacheKey(meta);
  }

  /**
   * Convert arbitrary time in ms or seconds to normalized seconds
   */
  function toSeconds(val, isDuration = false, isMsContext = false) {
    if (typeof val !== 'number') {
      val = parseFloat(val) || 0;
    }
    if (isMsContext) {
      return val / 1000;
    }
    if (isDuration) {
      // In lyrics APIs, durations in ms can be very small (e.g. 15ms, 27ms for short syllables)
      // Any duration >= 10 is in milliseconds. Values < 10 are already seconds.
      return val >= 10 ? val / 1000 : val;
    }
    return val >= 500 ? val / 1000 : val;
  }

  function getTimestampEntry(item) {
    if (!item || typeof item !== 'object') return null;
    for (const key of ['timeMs', 'startTimeMs', 'offsetMs']) {
      if (item[key] !== undefined && item[key] !== null) return { value: item[key], isMs: true };
    }
    for (const key of ['time', 'start', 'timestamp', 'offset', 't']) {
      if (item[key] !== undefined && item[key] !== null) return { value: item[key], isMs: false };
    }
    return null;
  }

  function getDurationEntry(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.durationMs !== undefined && item.durationMs !== null) return { value: item.durationMs, isMs: true };
    if (item.duration !== undefined && item.duration !== null) return { value: item.duration, isMs: false };
    return null;
  }

  function canonicalTrackText(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
      .replace(/\s*[-–—]\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|radio edit|single version|official audio|lyrics?)\b.*$/i, ' ')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function featuredArtistFromTitle(value) {
    const text = String(value || '');
    const marker = /\b(?:feat(?:uring)?|ft)\.?\s+/i.exec(text);
    if (!marker) return '';
    const credit = text.slice(marker.index + marker[0].length).replace(/[)\]}].*$/, '').split(/\s+(?:-|—|from)\s+/i)[0];
    return canonicalTrackText(credit);
  }

  function featuredArtistFromArtist(value) {
    const text = String(value || '');
    const marker = /\b(?:feat(?:uring)?|ft)\.?\s+/i.exec(text);
    if (!marker) return '';
    const credit = text.slice(marker.index + marker[0].length).replace(/[)\]}].*$/, '').split(/\s*[,&/]\s*|\s+(?:-|—|from)\s+/i)[0];
    return canonicalTrackText(credit);
  }

  function extractTrackVersion(rawTitle) {
    const title = String(rawTitle || '').trim();
    if (!title) return null;
    const versionClauseRegex = /(?:[\(\[\{]([^\)\]\}]+)[\)\]\}]|\s+(?:-|–|—|\/)\s+([^\-–—\/]+)$)/g;
    let match;
    const clauses = [];
    while ((match = versionClauseRegex.exec(title)) !== null) {
      const clause = (match[1] || match[2] || '').trim();
      if (clause) clauses.push(clause);
    }

    const standaloneMatch = /\b(mmxxiii|mmxxiv|mmxxv|taylor['’]s version)\b/i.exec(title);
    if (standaloneMatch) {
      clauses.push(standaloneMatch[1]);
    }

    const versionPatterns = [
      { type: 'remix', regex: /\b(?:remix|re-mix|rmx|vip mix|club mix|extended mix|dub mix|radio mix|dance mix|dance remix|house mix|synthwave remix|mixed|dj mix)\b/i },
      { type: 'live', regex: /\b(?:live|unplugged|in concert|live at|live from|tour)\b/i },
      { type: 'acoustic', regex: /\b(?:acoustic|stripped|piano version|acoustic version|orchestral|symphonic|strings)\b/i },
      { type: 'instrumental', regex: /\b(?:instrumental|karaoke|backing track)\b/i },
      { type: 'slowed_sped', regex: /\b(?:slowed|sped up|speed up|nightcore|reverb)\b/i },
      { type: 'demo', regex: /\b(?:demo|early version|alternate take|alt take)\b/i },
      { type: 'rerecord', regex: /\b(?:mmxxiii|mmxxiv|mmxxv|taylor['’]s version|re-recorded|rerecorded|20\d\d version)\b/i },
      { type: 'tribute', regex: /\b(?:tribute|tribute to|cover)\b/i }
    ];

    for (const clause of clauses) {
      if (/^\s*(?:feat(?:uring)?|ft)\.?\s+/i.test(clause)) continue;
      if (/^\s*(?:\d{4}\s*)?remaster(?:ed)?(?:\s*\d{4})?\s*$/i.test(clause)) continue;
      if (/^\s*(?:bonus track|original mix|single version|album version)\s*$/i.test(clause)) continue;

      for (const p of versionPatterns) {
        if (p.regex.test(clause)) {
          return {
            type: p.type,
            clause: clause.toLowerCase(),
            remixer: p.type === 'remix'
              ? clause.toLowerCase().replace(/\b(?:remix|re-mix|rmx|mix|mixed|edit|version)\b/g, '').trim()
              : null
          };
        }
      }
    }
    return null;
  }

  function areTrackVersionsCompatible(reqTitle, candTitle) {
    const reqVer = extractTrackVersion(reqTitle);
    const candVer = extractTrackVersion(candTitle);

    if (!reqVer && !candVer) return true;
    if (!reqVer && candVer) return false;
    if (reqVer && !candVer) return false;
    if (reqVer.type !== candVer.type) return false;

    if (reqVer.type === 'remix') {
      if (reqVer.remixer && candVer.remixer) {
        return reqVer.remixer.includes(candVer.remixer) || candVer.remixer.includes(reqVer.remixer);
      }
    }

    return true;
  }

  function responseMatchesRequestedTrack(data, requested) {
    const selected = data.selectedSongMetadata || data.metadata || data.song || {};
    const title = selected.title || selected.trackName || selected.track_name || selected.name || data.title;
    const rawArtist = selected.artist || selected.artistName || selected.artist_name || selected.artists || data.artist;
    const artist = Array.isArray(rawArtist)
      ? rawArtist.map(item => typeof item === 'string' ? item : item?.name || '').filter(Boolean).join(' ')
      : rawArtist;
    const requestedMeta = normalizeMetadata(requested);
    const selectedIsrc = selected.isrc || selected.external_ids?.isrc;
    if (requestedMeta.isrc && selectedIsrc && requestedMeta.isrc.toUpperCase() === String(selectedIsrc).toUpperCase()) {
      const selectedDuration = normalizeMetadata({
        duration: Number(selected.duration) > 10000 ? undefined : selected.duration,
        duration_ms: selected.duration_ms || selected.durationMs || (Number(selected.duration) > 10000 ? selected.duration : undefined)
      }).duration;
      return !(requestedMeta.duration && selectedDuration && Math.abs(requestedMeta.duration - selectedDuration) > 12);
    }

    if (!title || !artist) return true;

    // Incompatible recording versions (remix vs original, live vs studio, acoustic vs studio, re-recordings)
    // must not be mixed together as their audio sync and vocal takes differ completely.
    if (!areTrackVersionsCompatible(requested.title, title)) {
      return false;
    }

    const requestedFeature = featuredArtistFromTitle(requested.title) || featuredArtistFromArtist(requested.artist);
    const selectedFeature = featuredArtistFromTitle(title) || featuredArtistFromArtist(artist);
    const wantedArtist = canonicalTrackText(requested.artist);
    const foundArtist = canonicalTrackText(artist);

    // Apple responses often omit selected-track fields; keep those usable and
    // reject a concrete base-title match for an explicitly featured request.
    if (requestedFeature && !selectedFeature && !foundArtist.includes(requestedFeature)) return false;

    const wantedTitle = canonicalTrackText(requested.title);
    const foundTitle = canonicalTrackText(title);
    const titleMatches = wantedTitle === foundTitle || wantedTitle.startsWith(`${foundTitle} `) || foundTitle.startsWith(`${wantedTitle} `);
    const artistMatches = wantedArtist === foundArtist || wantedArtist.includes(foundArtist) || foundArtist.includes(wantedArtist);
    if (!titleMatches || !artistMatches) return false;

    // Search indexes should not silently map a featured request to the base
    // recording. The explicit selected title above must carry that credit.
    if (selectedFeature && !requestedFeature && !wantedArtist.includes(selectedFeature)) return false;
    if (requestedFeature && selectedFeature && requestedFeature !== selectedFeature && !foundArtist.includes(requestedFeature)) return false;

    const selectedMeta = normalizeMetadata({
      ...selected,
      title,
      artist,
      isrc: selected.isrc || selected.external_ids?.isrc,
      duration: Number(selected.duration) > 10000 ? undefined : selected.duration,
      duration_ms: selected.duration_ms || selected.durationMs || (Number(selected.duration) > 10000 ? selected.duration : undefined)
    });
    if (requestedMeta.isrc && selectedMeta.isrc && requestedMeta.isrc.toUpperCase() !== selectedMeta.isrc.toUpperCase()) {
      return false;
    }
    if (requestedMeta.duration && selectedMeta.duration && Math.abs(requestedMeta.duration - selectedMeta.duration) > 12) {
      return false;
    }
    return true;
  }

  /**
   * Dedicated LyricsPlus service handling requests, responses, normalization and caching
   */
  class LyricsPlusService {
    constructor(options = {}) {
      const configuredEndpoints = Array.isArray(options.endpoints) && options.endpoints.length
        ? options.endpoints
        : options.endpoint
          ? [options.endpoint, ...API_ENDPOINTS.filter(endpoint => endpoint !== options.endpoint)]
          : API_ENDPOINTS;
      this.endpoints = [...new Set(configuredEndpoints.filter(endpoint => typeof endpoint === 'string' && endpoint.trim()))];
      this.endpoint = this.endpoints[0] || API_ENDPOINTS[0];
      // The qApple scraper can exceed 2.5s on a cold cache. Keep the default
      // aligned with the renderer's preferred-provider request window.
      this.timeoutMs = options.timeoutMs || 8500;
    }

    /**
     * Build the safe, URL-encoded request URL
     */
    buildRequestUrl(metadata, endpoint = this.endpoint, options = {}) {
      const meta = normalizeMetadata(metadata);
      if (!meta.title || !meta.artist) {
        throw new Error('LyricsPlus requires at least track title and artist');
      }

      const params = new URLSearchParams();
      params.set('title', meta.title);
      params.set('artist', options.preferQApple ? (meta.primaryArtist || meta.artist) : meta.artist);

      if (!options.preferQApple) {
        if (meta.album) params.set('album', meta.album);
        if (meta.duration && meta.duration > 0) params.set('duration', String(meta.duration));
        if (meta.isrc) params.set('isrc', meta.isrc);
        // A local SMTC identifier is not a provider track ID. Passing it can
        // prevent LyricsPlus from matching by title, artist, ISRC, and duration.
        const syntheticLocalId = meta.source?.toLowerCase() === 'local' || /^(local|smtc|unknown)[_:-]/i.test(meta.platformId || '');
        if (meta.platformId && !syntheticLocalId) params.set('platformId', meta.platformId);
      }
      // The API's `source` parameter names lyric databases, not the music app
      // currently playing. qApple can be requested alone for strict priority.
      params.set('source', options.preferQApple ? 'apple' : API_SOURCE_ORDER);
      if (options.forceRefresh && !options.preferQApple) params.set('forceReload', 'true');

      const normalizedEndpoint = String(endpoint || this.endpoint).replace(/\?+$/, '');
      return `${normalizedEndpoint}?${params.toString().replace(/\+/g, '%20')}`;
    }

    /**
     * Retrieve normalized lyrics from cache if available
     */
    getCached(metadata) {
      const meta = normalizeMetadata(metadata);
      const key = getCacheKey(meta);
      try {
        if (typeof localStorage !== 'undefined') {
          let raw = localStorage.getItem(key);
          if (!raw && meta.isrc) {
            const fallbackKey = getFallbackCacheKey(meta);
            raw = localStorage.getItem(fallbackKey);
          }
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
              if (isQAppleLyrics(parsed) && (parsed.qappleTimeNormalizationVersion !== 2 ||
                  parsed.qappleTrackValidationVersion !== 4)) {
                localStorage.removeItem(key);
                if (meta.isrc) localStorage.removeItem(getFallbackCacheKey(meta));
                devLog('[lyrics] discarded qApple cache created with outdated track or version validation');
                return null;
              }
              devLog(`[lyrics] cache hit: ${meta.artist} - ${meta.title}`);
              return parsed;
            }
          }
        }
      } catch (_) {}
      return null;
    }

    /**
     * Save normalized lyrics to persistent storage
     */
    setCached(metadata, lyrics) {
      if (!lyrics || !Array.isArray(lyrics.lines) || lyrics.lines.length === 0) return;
      const meta = normalizeMetadata(metadata);
      const key = getCacheKey(meta);
      const fallbackKey = getFallbackCacheKey(meta);
      try {
        const cacheEntry = isQAppleLyrics(lyrics)
          ? { ...lyrics, qappleTimeNormalizationVersion: 2, qappleTrackValidationVersion: 4 }
          : lyrics;
        const payload = JSON.stringify(cacheEntry);
        if (typeof window !== 'undefined' && typeof window.safeStorageSet === 'function') {
          window.safeStorageSet(key, payload);
          if (meta.isrc && fallbackKey !== key) {
            window.safeStorageSet(fallbackKey, payload);
          }
        } else if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, payload);
          if (meta.isrc && fallbackKey !== key) {
            localStorage.setItem(fallbackKey, payload);
          }
        }
      } catch (err) {
        devLog('[lyrics] cache write error:', err);
      }
    }

    /**
     * Invalidate cached lyrics for a track
     */
    invalidateCache(metadata) {
      const meta = normalizeMetadata(metadata);
      const key = getCacheKey(meta);
      const fallbackKey = getFallbackCacheKey(meta);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          if (fallbackKey !== key) {
            localStorage.removeItem(fallbackKey);
          }
        }
      } catch (_) {}
    }

    /**
     * Fetch lyrics from LyricsPlus API
     * @param {object} metadata
     * @param {object} [options]
     * @param {AbortSignal} [options.signal]
     * @param {boolean} [options.forceRefresh]
     * @returns {Promise<object|null>}
     */
    async fetch(metadata, options = {}) {
      const meta = normalizeMetadata(metadata);
      if (!meta.title || !meta.artist) {
        devLog('[lyrics] lyrics unavailable: missing title or artist');
        return null;
      }

      // Check cache first if not forced refresh
      if (!options.forceRefresh) {
        const cached = this.getCached(meta);
        if (cached && cached.type !== 'UNSYNCED' &&
            (!options.preferQApple || isQAppleLyrics(cached))) return cached;
        if (cached && options.preferQApple && !isQAppleLyrics(cached)) {
          devLog('[lyrics] ignoring non-qApple cache while qApple is preferred');
        }
      }

      if (options.signal?.aborted) return null;

      const primary = await this.fetchEndpoint(this.endpoint, meta, options);
      if (primary) return this.cacheAndReturn(meta, primary);
      if (options.signal?.aborted) return null;

      if (options.preferQApple) {
        const lrcRedCandidate = await this.fetchLrcRed(meta, options.signal);
        if (lrcRedCandidate) return this.cacheAndReturn(meta, lrcRedCandidate);
      }

      const fallbackEndpoints = this.endpoints.filter(endpoint => endpoint !== this.endpoint);
      if (!fallbackEndpoints.length) return null;

      devLog(`[lyrics] primary LyricsPlus endpoint unavailable; trying ${fallbackEndpoints.length} mirrors`);
      const controllers = fallbackEndpoints.map(() => new AbortController());
      const abortFromParent = () => controllers.forEach(controller => controller.abort());
      options.signal?.addEventListener('abort', abortFromParent, { once: true });
      const mirrorTimeout = Math.min(2500, options.timeoutMs || this.timeoutMs);
      const timeoutId = setTimeout(abortFromParent, mirrorTimeout);
      try {
        const attempts = fallbackEndpoints.map((endpoint, index) =>
          this.fetchEndpoint(endpoint, meta, { ...options, signal: controllers[index].signal })
            .then(result => {
              if (!result) throw new Error(`No LyricsPlus result from ${endpoint}`);
              return { result, endpoint };
            })
        );
        const winner = await Promise.any(attempts);
        devLog(`[lyrics] LyricsPlus mirror succeeded: ${winner.endpoint}`);
        return this.cacheAndReturn(meta, winner.result);
      } catch (_) {
        if (options.signal?.aborted) devLog('[lyrics] request cancelled');
        else devLog('[lyrics] all LyricsPlus endpoints returned no usable lyrics');
        return null;
      } finally {
        clearTimeout(timeoutId);
        options.signal?.removeEventListener('abort', abortFromParent);
        controllers.forEach(controller => controller.abort());
      }

    }

    cacheAndReturn(metadata, normalized) {
      if (normalized.type === 'WORD') {
        devLog(`[lyrics] found WORD lyrics (${normalized.lines.length} lines) from ${normalized.source}`);
      } else {
        devLog(`[lyrics] found LINE lyrics (${normalized.lines.length} lines) from ${normalized.source}`);
      }
      this.setCached(metadata, normalized);
      return normalized;
    }

    async fetchLrcRed(metadata, signal) {
      const cleanTitle = (metadata.title || '').trim();
      const cleanArtist = (metadata.primaryArtist || metadata.artist || '').trim();
      if (!cleanTitle) return null;

      if (signal?.aborted) return null;
      const controller = new AbortController();
      const abortFromParent = () => controller.abort();
      signal?.addEventListener('abort', abortFromParent, { once: true });
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const reqTitle = String(metadata?.title || cleanTitle || '');
        const featArtist = featuredArtistFromTitle(reqTitle);
        const baseTitle = reqTitle
          .replace(/\s*[\(\[\{]\s*(?:feat(?:uring)?|ft)\.?\s+[^\)\]\}]+[\)\]\}]/gi, '')
          .replace(/\s+\b(?:feat(?:uring)?|ft)\.?\s+.*$/gi, '')
          .trim() || cleanTitle;
        const primaryArtist = String(metadata?.primaryArtist || cleanArtist || '').trim();

        const searchQueries = [];
        if (featArtist) {
          searchQueries.push(`${baseTitle} ${primaryArtist} ${featArtist}`.replace(/\s+/g, ' ').trim());
        }
        searchQueries.push(`${baseTitle} ${primaryArtist}`.replace(/\s+/g, ' ').trim());

        let hits = [];
        for (const queryStr of searchQueries) {
          const query = encodeURIComponent(queryStr);
          const searchUrl = `https://lrc.red/search.json?q=${query}`;
          const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'LyricFlow/1.44 (https://github.com/badghost/lyricflow-tauri; contact@lyricflow.app)' },
            signal: controller.signal
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData?.hits) && searchData.hits.length > 0) {
              hits = searchData.hits;
              break;
            }
          }
        }
        if (!hits.length) return null;

        const requested = normalizeMetadata(metadata);
        const exactIsrcHits = requested.isrc
          ? hits.filter(hit => String(hit?.isrc || '').toUpperCase() === requested.isrc.toUpperCase())
          : [];
        const searchHits = exactIsrcHits.length ? exactIsrcHits : hits;
        const candidates = searchHits.filter(hit => {
          if (!hit?.isrc || !hit.title || !hit.artist) return false;
          const candidate = normalizeMetadata(hit);
          const exactIsrc = requested.isrc && candidate.isrc?.toUpperCase() === requested.isrc.toUpperCase();
          if (!exactIsrc && !responseMatchesRequestedTrack({ metadata: hit }, requested)) return false;
          if (requested.duration && candidate.duration && Math.abs(requested.duration - candidate.duration) > 12) return false;
          return true;
        });
        if (!candidates.length) return null;

        candidates.sort((a, b) => {
          const aMeta = normalizeMetadata(a);
          const bMeta = normalizeMetadata(b);
          const aIsrcMatch = requested.isrc && aMeta.isrc?.toUpperCase() === requested.isrc.toUpperCase() ? 0 : 1;
          const bIsrcMatch = requested.isrc && bMeta.isrc?.toUpperCase() === requested.isrc.toUpperCase() ? 0 : 1;
          if (aIsrcMatch !== bIsrcMatch) return aIsrcMatch - bIsrcMatch;
          const requestedFeature = featuredArtistFromTitle(requested.title) || featuredArtistFromArtist(requested.artist);
          const aFeature = featuredArtistFromTitle(a.title) || featuredArtistFromArtist(a.artist);
          const bFeature = featuredArtistFromTitle(b.title) || featuredArtistFromArtist(b.artist);
          if (requestedFeature) {
            const aFeatureMatch = aFeature === requestedFeature ? 0 : 1;
            const bFeatureMatch = bFeature === requestedFeature ? 0 : 1;
            if (aFeatureMatch !== bFeatureMatch) return aFeatureMatch - bFeatureMatch;
          } else {
            const aHasFeature = Boolean(aFeature || /\b(?:feat(?:uring)?|ft)\.?\s/i.test(a.title || '')) ? 1 : 0;
            const bHasFeature = Boolean(bFeature || /\b(?:feat(?:uring)?|ft)\.?\s/i.test(b.title || '')) ? 1 : 0;
            if (aHasFeature !== bHasFeature) return aHasFeature - bHasFeature;
          }
          const wantedCanonical = canonicalTrackText(requested.title);
          const aCanonical = canonicalTrackText(a.title);
          const bCanonical = canonicalTrackText(b.title);
          const aExactTitle = aCanonical === wantedCanonical ? 0 : 1;
          const bExactTitle = bCanonical === wantedCanonical ? 0 : 1;
          if (aExactTitle !== bExactTitle) return aExactTitle - bExactTitle;
          const aDurationDiff = requested.duration && aMeta.duration ? Math.abs(requested.duration - aMeta.duration) : Number.POSITIVE_INFINITY;
          const bDurationDiff = requested.duration && bMeta.duration ? Math.abs(requested.duration - bMeta.duration) : Number.POSITIVE_INFINITY;
          if (aDurationDiff !== bDurationDiff) return aDurationDiff - bDurationDiff;
          const requestedAlbum = String(requested.album || '').toLowerCase();
          const aAlbumMatch = requestedAlbum && String(a.album || a.albumName || '').toLowerCase() === requestedAlbum ? 0 : 1;
          const bAlbumMatch = requestedAlbum && String(b.album || b.albumName || '').toLowerCase() === requestedAlbum ? 0 : 1;
          return aAlbumMatch - bAlbumMatch;
        });

        const selected = candidates[0];
        const isrc = selected.isrc;
        if (!isrc) return null;

        const [lrcRes, ttmlRes] = await Promise.allSettled([
          fetch(`https://lrc.red/s/${isrc}.lrc`, {
            headers: { 'User-Agent': 'LyricFlow/1.44 (https://github.com/badghost/lyricflow-tauri; contact@lyricflow.app)' },
            signal: controller.signal
          }),
          fetch(`https://lrc.red/s/${isrc}.ttml`, {
            headers: { 'User-Agent': 'LyricFlow/1.44 (https://github.com/badghost/lyricflow-tauri; contact@lyricflow.app)' },
            signal: controller.signal
          })
        ]);

        const rawLrc = (lrcRes.status === 'fulfilled' && lrcRes.value.ok) ? await lrcRes.value.text() : null;
        if (!rawLrc || !rawLrc.trim()) return null;

        const ttmlStr = (ttmlRes.status === 'fulfilled' && ttmlRes.value.ok) ? await ttmlRes.value.text() : '';
        const pAgents = [];
        if (ttmlStr) {
          const pRegex = /<p\b[^>]*\bttm:agent="([^"]+)"/g;
          let m;
          while ((m = pRegex.exec(ttmlStr)) !== null) {
            pAgents.push(m[1]);
          }
        }

        const rawLines = [];
        const lines = rawLrc.split('\n');
        const sylRegex = /<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('[')) continue;
          const closeIdx = trimmed.indexOf(']');
          if (closeIdx === -1) continue;
          const tag = trimmed.substring(1, closeIdx);
          const parts = tag.split(':');
          if (parts.length < 2) continue;
          const min = parseInt(parts[0], 10);
          const secParts = parts[1].split(/[.:]/);
          if (isNaN(min) || isNaN(parseInt(secParts[0], 10))) continue;
          const sec = parseInt(secParts[0], 10);
          const cs = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
          const timeMs = min * 60000 + sec * 1000 + cs;
          const content = trimmed.substring(closeIdx + 1).trim();
          if (!content) continue;

          const sylPositions = [];
          sylRegex.lastIndex = 0;
          let sm;
          while ((sm = sylRegex.exec(content)) !== null) {
            const sMin = parseInt(sm[1], 10);
            const sSec = parseInt(sm[2], 10);
            const sMs = sm[3] ? parseInt(sm[3].padEnd(3, '0').slice(0, 3), 10) : 0;
            sylPositions.push({
              startIdx: sm.index,
              endIdx: sylRegex.lastIndex,
              timeMs: sMin * 60000 + sSec * 1000 + sMs
            });
          }

          const syllables = [];
          for (let si = 0; si < sylPositions.length; si++) {
            const curS = sylPositions[si];
            const nextS = sylPositions[si + 1];
            const textEnd = nextS ? nextS.startIdx : content.length;
            const wText = content.substring(curS.endIdx, textEnd).trim();
            if (wText) {
              const wDur = nextS ? Math.max(50, nextS.timeMs - curS.timeMs) : 500;
              syllables.push({
                text: wText,
                time: curS.timeMs,
                duration: wDur
              });
            }
          }

          const plainText = content.replace(/<[^>]+>/g, '').trim();
          rawLines.push({
            time: timeMs,
            text: plainText,
            syllabus: syllables.length > 0 ? syllables : undefined
          });
        }

        if (rawLines.length === 0) return null;

        const rawArtist = cleanArtist;
        const splitArtists = typeof splitTrackArtists === 'function' ? splitTrackArtists(rawArtist) : rawArtist.split(/\s*[,&/]\s*/);
        for (let i = 0; i < rawLines.length; i++) {
          const ag = pAgents[i];
          if (ag === 'v1') {
            rawLines[i].element = { singer: splitArtists[0] || 'Vocal 1' };
          } else if (ag === 'v2') {
            rawLines[i].element = { singer: splitArtists[1] || 'Vocal 2' };
          } else if (ag === 'v1000' || ag === 'v2000') {
            rawLines[i].element = { singer: 'Both' };
          }
        }

        const normalized = this.normalizeResponse({
          type: 'Word',
          metadata: { source: 'qApple', isrc, title: selected.title, artist: selected.artist },
          lyrics: rawLines
        }, metadata);

        if (normalized) {
          normalized.source = 'LyricsPlus (qApple)';
          normalized.winnerSource = 'qApple';
        }
        return normalized;
      } catch (_) {
        return null;
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortFromParent);
      }
    }

    async fetchEndpoint(endpoint, metadata, options = {}) {
      let url = this.buildRequestUrl(metadata, endpoint, options);
      const isLyricsPlusV2 = typeof endpoint === 'string' && /\/v2\/lyrics\/get(?:\?|$)/.test(endpoint);
      if (isLyricsPlusV2) {
        // Request Apple explicitly. Multi-source queries and forceReload can
        // trip upstream rate limits; a single source=apple query stays narrow.
        // Keep an explicit single-source Apple request; stripping `source` here
        // lets a changed upstream default silently route away from qApple.
        // The qApple scraper rejects extra catalog qualifiers; send its stable
        // title/primary-artist/source query and keep identity checks local.
        try {
          const stripped = new URL(url);
          stripped.searchParams.delete('forceReload');
          stripped.searchParams.delete('platformId');
          stripped.searchParams.delete('album');
          stripped.searchParams.delete('duration');
          stripped.searchParams.delete('isrc');
          url = stripped.toString().replace(/\+/g, '%20');
        } catch (_) {}
      }
      devLog(`[lyrics] fetching LyricsPlus: ${url}`);
      const controller = new AbortController();
      const parentSignal = options.signal;
      if (parentSignal?.aborted) return null;
      const onExternalAbort = parentSignal ? () => controller.abort() : null;
      if (onExternalAbort) parentSignal.addEventListener('abort', onExternalAbort, { once: true });
      const effectiveTimeout = options.timeoutMs || (isLyricsPlusV2 ? 4200 : this.timeoutMs);
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, effectiveTimeout);

      try {
        let response = null;
        let retryUrl = null;
        try {
          const strippedUrl = new URL(url);
          let modified = false;
          const retryParams = ['source', 'forceReload', 'album', 'isrc', 'platformId', 'duration'];
          for (const param of retryParams) {
            if (strippedUrl.searchParams.has(param)) {
              strippedUrl.searchParams.delete(param);
              modified = true;
            }
          }
          if (modified || isLyricsPlusV2) {
            retryUrl = strippedUrl.toString().replace(/\+/g, '%20');
          }
        } catch (_) {}

        const hasAppleSourceConstraint = isLyricsPlusV2 && /(?:^|[?&])source=apple(?:&|$)/.test(url);
        let appleRetryUrl = null;
        if (hasAppleSourceConstraint && retryUrl) {
          try {
            const constrainedRetry = new URL(retryUrl);
            constrainedRetry.searchParams.set('source', 'apple');
            appleRetryUrl = constrainedRetry.toString().replace(/\+/g, '%20');
          } catch (_) {}
        }
        if (hasAppleSourceConstraint) {
          // Allow upstream Apple scraper sufficient time to query and return cold cache results
          const probeController = new AbortController();
          const onParentAbort = () => probeController.abort();
          controller.signal.addEventListener('abort', onParentAbort, { once: true });
          const probeTimeoutId = setTimeout(() => probeController.abort(), 6000);
          try {
            const probeRes = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'LyricFlow/1.44'
              },
              signal: probeController.signal
            });
            if (probeRes.ok) {
              response = probeRes;
            }
          } catch (probeErr) {
            if (controller.signal.aborted) throw probeErr;
            devLog(`[lyrics] initial Apple scraper probe timed out or failed; falling back to clean query`);
          } finally {
            clearTimeout(probeTimeoutId);
            controller.signal.removeEventListener('abort', onParentAbort);
          }
        }

        if (!response) {
          const targetUrl = (hasAppleSourceConstraint && appleRetryUrl) ? appleRetryUrl : url;
          response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'LyricFlow/1.44'
            },
            signal: controller.signal
          });
        }
        if (!response.ok && (response.status === 404 || response.status === 400 || response.status === 429)) {
          const safeRetryUrl = retryUrl;
          if (safeRetryUrl && safeRetryUrl !== url) {
            try {
              const retryRes = await fetch(safeRetryUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'LyricFlow/1.44'
                },
                signal: controller.signal
              });
              if (retryRes.ok) {
                response = retryRes;
              }
            } catch (_) {}
          }
          if (!response.ok) {
            const rawTitle = metadata.title || '';
            const unaccented = rawTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (unaccented && unaccented !== rawTitle) {
              try {
                const unaccentedMeta = { ...metadata, title: unaccented };
                let unaccentedUrl = this.buildRequestUrl(unaccentedMeta, endpoint, options);
                if (isLyricsPlusV2) {
                  try {
                    const stripped = new URL(unaccentedUrl);
                    stripped.searchParams.delete('forceReload');
                    stripped.searchParams.delete('platformId');
                    stripped.searchParams.delete('album');
                    stripped.searchParams.delete('duration');
                    stripped.searchParams.delete('isrc');
                    unaccentedUrl = stripped.toString().replace(/\+/g, '%20');
                  } catch (_) {}
                }
                const unaccentedRes = await fetch(unaccentedUrl, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'LyricFlow/1.44'
                  },
                  signal: controller.signal
                });
                if (unaccentedRes.ok) {
                  response = unaccentedRes;
                }
              } catch (_) {}
            }
          }
        }
        if (!response.ok) {
          devLog(`[lyrics] ${endpoint} returned HTTP ${response.status}`);
          return null;
        }
        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          devLog(`[lyrics] malformed JSON from ${endpoint}`, jsonErr);
          return null;
        }
        const reportedSource = String(
          data.processingTime?.winnerSource ||
          data.selectedSongMetadata?.source ||
          data.metadata?.source ||
          data.source ||
          ''
        );
        if (/\blrclib\b/i.test(reportedSource)) {
          devLog('[lyrics] skipping LyricsPlus LRCLIB result; the native LRCLIB provider handles this source');
          return null;
        }
        const normalized = this.normalizeResponse(data, metadata);
        if (normalized && options.preferQApple) {
          // Trust an explicit upstream winner. An unlabeled response is accepted
          // only because every request and retry in this path retains source=apple.
          const isApple = /apple|qapple|^am$|itunes/i.test(reportedSource) ||
            (isLyricsPlusV2 && (!reportedSource || /^lyricsplus$/i.test(reportedSource)));
          if (isApple && normalized.type !== 'UNSYNCED') {
            normalized.source = 'LyricsPlus (qApple)';
            normalized.winnerSource = 'qApple';
          } else if (isLyricsPlusV2 && reportedSource && !/apple|qapple|^am$|itunes|^lyricsplus$/i.test(reportedSource)) {
            devLog(`[lyrics] ignoring non-qApple Binimum winner while qApple is preferred: ${reportedSource}`);
            return null;
          }
        }
        return normalized;
      } catch (err) {
        if (!options.signal?.aborted && err.name !== 'AbortError') {
          devLog(`[lyrics] ${endpoint} fetch error:`, err.message || err);
        }
        return null;
      } finally {
        clearTimeout(timeoutId);
        if (onExternalAbort) parentSignal.removeEventListener('abort', onExternalAbort);
      }
    }

    /**
     * Normalize the raw LyricsPlus v2 JSON response into the NormalizedLyrics model.
     * Handles:
     * - Word-level synchronization (type: "Word") with syllables/words
     * - Line-level synchronization (type: "Line") without faking word timings
     * - Timestamp conversion to seconds
     * - Durations and line bounding
     */
    normalizeResponse(data, meta = {}) {
      if (!data || typeof data !== 'object') return null;

      // Handle explicit error responses
      if (data.error) {
        return null;
      }
      if (!responseMatchesRequestedTrack(data, meta)) {
        devLog('[lyrics] rejected LyricsPlus response whose selected track metadata does not match the request');
        return null;
      }

      // Check lines array
      let rawLines = [];
      if (Array.isArray(data.lyrics)) {
        rawLines = data.lyrics;
      } else if (Array.isArray(data.lines)) {
        rawLines = data.lines;
      } else if (Array.isArray(data.data)) {
        rawLines = data.data;
      }

      const rawLrcString = typeof data.rawLRC === 'string' ? data.rawLRC : (typeof data.syncedLyrics === 'string' ? data.syncedLyrics : (typeof data.lrc === 'string' ? data.lrc : null));

      if ((!Array.isArray(rawLines) || rawLines.length === 0) && rawLrcString) {
        const lrcRegex = /^\[(\d{1,2}):(\d{1,2}(?:\.\d+)?)\](.*)$/;
        const splitLrc = rawLrcString.split('\n');
        for (let i = 0; i < splitLrc.length; i++) {
          const trimmed = splitLrc[i].trim();
          if (!trimmed) continue;
          const match = trimmed.match(lrcRegex);
          if (!match) continue;
          const min = parseInt(match[1], 10);
          const sec = parseFloat(match[2]);
          const lineStartSec = min * 60 + sec;
          const lineText = match[3].trim();
          if (!lineText) continue;
          rawLines.push({
            time: Math.round(lineStartSec * 1000),
            text: lineText
          });
        }
      }

      if (!Array.isArray(rawLines) || rawLines.length === 0) {
        return null;
      }

      const winnerSource = data.processingTime?.winnerSource || data.selectedSongMetadata?.source || data.metadata?.source || data.source || 'LyricsPlus';
      const sourceLabel = `LyricsPlus (${winnerSource})`;

      const rawType = String(data.type || '').toLowerCase();
      const isWordType = rawType === 'word';
      const isNoneType = rawType === 'none' || rawType === 'unsynced' || rawType === 'static';
      const allLinesZero = rawLines.length > 0 && rawLines.every(l => {
        const timestamp = getTimestampEntry(l);
        return !timestamp || Number(timestamp.value) === 0;
      });
      const isActuallyUnsynced = isNoneType || allLinesZero;

      if (isActuallyUnsynced) {
        const parsedLines = [];
        for (let i = 0; i < rawLines.length; i++) {
          const item = rawLines[i];
          if (!item || typeof item !== 'object') continue;
          const lineText = String(item.text || item.words || '').trim();
          if (!lineText) continue;
          parsedLines.push({
            text: lineText,
            start: 9999.999,
            end: 9999.999,
            timeMs: 9999999
          });
        }
        if (parsedLines.length === 0) return null;
        return createNormalizedLyrics("UNSYNCED", parsedLines, sourceLabel, {
          winnerSource,
          metadata: data.selectedSongMetadata || meta
        });
      }

      const parsedLines = [];
      const timeUnit = String(data.startTimeUnit || data.metadata?.timeUnit || '').toLowerCase();
      const metadataDuration = Number(meta.duration || data.selectedSongMetadata?.duration || data.metadata?.duration || 0);
      const trackDurationSec = metadataDuration > 10000 ? metadataDuration / 1000 : metadataDuration;
      const maxUnmarkedTimestamp = rawLines.reduce((maxTime, line) => {
        const timestamp = getTimestampEntry(line);
        if (!timestamp || timestamp.isMs) return maxTime;
        const value = Number(timestamp.value);
        return Number.isFinite(value) ? Math.max(maxTime, value) : maxTime;
      }, 0);
      // Seconds-based timestamps naturally exceed 200 on longer songs. Infer
      // milliseconds only when the values exceed the known track timeline (or
      // the legacy 500-unit threshold when duration metadata is unavailable).
      const inferredMsContext = Boolean(data.KpoeTools) || /^(ms|millisecond|milliseconds)$/.test(timeUnit)
        || maxUnmarkedTimestamp > Math.max(500, trackDurationSec > 0 ? trackDurationSec * 1.5 : 0);

      for (let i = 0; i < rawLines.length; i++) {
        const item = rawLines[i];
        if (!item || typeof item !== 'object') continue;

        // Line start and duration
        const lineTimestamp = getTimestampEntry(item);
        const lineStartSec = lineTimestamp
          ? toSeconds(lineTimestamp.value, false, lineTimestamp.isMs || inferredMsContext)
          : 0;
        const lineDuration = getDurationEntry(item);
        let lineDurSec = lineDuration
          ? toSeconds(lineDuration.value, true, lineDuration.isMs || inferredMsContext)
          : 0;

        // If line duration is not explicitly provided, estimate from next line
        if (lineDurSec <= 0) {
          const nextTimestamp = i < rawLines.length - 1 ? getTimestampEntry(rawLines[i + 1]) : null;
          if (nextTimestamp) {
            const nextStart = toSeconds(nextTimestamp.value, false, nextTimestamp.isMs || inferredMsContext);
            lineDurSec = Math.max(0.5, Math.min(nextStart - lineStartSec, 8.0));
          } else {
            lineDurSec = 4.0;
          }
        }

        const lineEndSec = lineStartSec + lineDurSec;
        const nextLineTimestamp = i < rawLines.length - 1 ? getTimestampEntry(rawLines[i + 1]) : null;
        const nextLineStartSec = nextLineTimestamp
          ? toSeconds(nextLineTimestamp.value, false, nextLineTimestamp.isMs || inferredMsContext)
          : (lineEndSec + 4.0);
        const lineText = String(item.text || item.words || '').trim();
        if (!lineText) continue;

        // Process word-level timing if this is a word-synced response
        let words = undefined;
        const rawWords = Array.isArray(item.syllabus) ? item.syllabus : (Array.isArray(item.words) ? item.words : (Array.isArray(item.syllables) ? item.syllables : null));

        if (isWordType && Array.isArray(rawWords) && rawWords.length > 0) {
          const parsedWords = [];
          for (let wi = 0; wi < rawWords.length; wi++) {
            const w = rawWords[wi];
            if (!w || typeof w !== 'object') continue;

            const wText = String(w.text || w.word || '').trim();
            if (!wText) continue;

            const wordTimestamp = getTimestampEntry(w);
            const wStart = wordTimestamp
              ? toSeconds(wordTimestamp.value, false, wordTimestamp.isMs || inferredMsContext)
              : lineStartSec;
            const wordDuration = getDurationEntry(w);
            let wDur = wordDuration
              ? toSeconds(wordDuration.value, true, wordDuration.isMs || inferredMsContext)
              : 0;

            if (wDur <= 0) {
              const nextWordTimestamp = wi < rawWords.length - 1 ? getTimestampEntry(rawWords[wi + 1]) : null;
              if (nextWordTimestamp) {
                const nextWStart = toSeconds(nextWordTimestamp.value, false, nextWordTimestamp.isMs || inferredMsContext);
                wDur = Math.max(0.05, nextWStart - wStart);
              } else {
                wDur = Math.max(0.05, lineEndSec - wStart);
              }
            }

            // Defensive boundary check: a word cannot extend past the end of the line
            // or past the next line's onset by more than a reasonable vocal tail (0.4s)
            const maxWordEnd = Math.min(lineEndSec + 0.4, nextLineStartSec);
            const wEnd = Math.min(wStart + wDur, Math.max(wStart + 0.05, maxWordEnd));
            parsedWords.push(createLyricWord(wText, wStart, wEnd));
          }

          if (parsedWords.length > 0) {
            words = parsedWords;
          }
        }

        const rawSinger = item.singer || item.agent || item.vocalist || item.voice || item.element?.singer || item.element?.agent || undefined;
        let lineSinger = rawSinger;
        if (rawSinger && data.metadata?.agents && data.metadata.agents[rawSinger]?.name) {
          lineSinger = data.metadata.agents[rawSinger].name;
        }
        parsedLines.push(createLyricLine(lineText, lineStartSec, lineEndSec, words, undefined, lineSinger));
      }

      if (parsedLines.length === 0) return null;

      // Determine overall normalized type:
      // If marked as WORD and has actual word timings -> "WORD"
      // Otherwise -> "LINE"
      const hasActualWordTimings = parsedLines.some(l => Array.isArray(l.words) && l.words.length > 0);
      const finalType = (hasActualWordTimings || isWordType) ? (hasActualWordTimings ? "WORD" : "LINE") : (isActuallyUnsynced ? "UNSYNCED" : "LINE");

      return createNormalizedLyrics(finalType, parsedLines, sourceLabel, {
        winnerSource,
        metadata: data.selectedSongMetadata || meta
      });
    }
  }

  /**
   * LyricsPlusProvider implementing the LyricsProvider contract
   */
  class LyricsPlusProvider extends LyricsProvider {
    constructor(options = {}) {
      super('LyricsPlus');
      this.service = new LyricsPlusService(options);
    }

    async getLyrics(trackMetadata, options = {}) {
      return await this.service.fetch(trackMetadata, options);
    }
  }

  return {
    LyricsPlusService,
    LyricsPlusProvider,
    normalizeMetadata,
    getCacheKey,
    toSeconds,
    responseMatchesRequestedTrack,
    isQAppleLyrics,
    extractTrackVersion,
    areTrackVersionsCompatible
  };
});
