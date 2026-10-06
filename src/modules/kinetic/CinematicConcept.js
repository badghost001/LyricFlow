/**
 * LyricFlow - Cinematic Concept Engine
 * Semantic analysis layer that transforms lyric text and phrases into art-directed concepts.
 * 
 * Pipeline:
 *   LYRIC -> KEYWORDS / PHRASES -> CONCEPT -> STRENGTH & EMPHASIS -> TONAL TINT
 * 
 * Abstractions:
 *   - CinematicConcept: Semantic recognition, phrase matching, strength scoring, and word emphasis.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CinematicConcept = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Curated semantic concept definitions with multi-word phrases, keywords,
   * tonal tints, and aesthetic parameters.
   */
  const CONCEPTS = {
    love: {
      id: 'love',
      name: 'Love & Romance',
      phrases: [
        'falling for you', 'fall in love', "can't help loving", 'head over heels',
        'my whole heart', 'kiss me softly', 'be my baby', 'hold me close',
        'love of my life', 'hold my hand', 'sweet darling', 'adore you',
        'in your arms', 'only you', 'me and you', 'you and me'
      ],
      keywords: [
        'love', 'heart', 'baby', 'darling', 'sweetheart', 'kiss', 'adore',
        'cherish', 'romance', 'beloved', 'affection', 'passion', 'lover',
        'embrace', 'tender', 'forever yours', 'sweet'
      ],
      tonalTint: {
        type: 'warm',
        name: 'Warm Rose Amber',
        r: 255, g: 140, b: 160,
        warmth: 0.12,
        bgOffset: { r: 18, g: 6, b: 10 }
      },
      preferredCompositions: ['behind', 'offset_right', 'cropped_large', 'below']
    },
    night: {
      id: 'night',
      name: 'Night & Celestial',
      phrases: [
        'in the dark', 'under the stars', 'midnight sky', 'late at night',
        'middle of the night', 'stars are shining', 'moonlight shadow',
        'all night long', 'into the night', 'dark of night', 'chasing stars',
        'starry night', 'endless night'
      ],
      keywords: [
        'night', 'midnight', 'moon', 'star', 'stars', 'dark', 'darkness',
        'dusk', 'twilight', 'evening', 'shadow', 'shadows', 'nocturnal',
        'celestial', 'starlight', 'astral'
      ],
      tonalTint: {
        type: 'dark',
        name: 'Deep Obsidian Indigo',
        r: 130, g: 160, b: 255,
        warmth: -0.08,
        bgOffset: { r: 4, g: 6, b: 18 }
      },
      preferredCompositions: ['above', 'distant_small', 'cropped_large', 'behind']
    },
    lonely: {
      id: 'lonely',
      name: 'Solitude & Longing',
      phrases: [
        'all alone', 'nobody else', 'on my own', 'by myself', 'empty room',
        'standing alone', 'no one here', 'left alone', 'lost without you',
        "can't let go", 'broken inside', 'nobody hears', 'empty space',
        'silence speaks', 'fade away'
      ],
      keywords: [
        'lonely', 'alone', 'nobody', 'empty', 'isolated', 'solitude',
        'hollow', 'abandoned', 'distant', 'silence', 'nowhere', 'quiet',
        'missing', 'longing', 'apart', 'ghost'
      ],
      tonalTint: {
        type: 'cool',
        name: 'Slate Solitude',
        r: 140, g: 185, b: 210,
        warmth: -0.12,
        bgOffset: { r: 4, g: 12, b: 16 }
      },
      preferredCompositions: ['offset_left', 'distant_small', 'behind']
    },
    memory: {
      id: 'memory',
      name: 'Memory & Nostalgia',
      phrases: [
        'missing you', "can't forget", 'remember when', 'used to be',
        'years ago', 'back in time', 'photograph of you', 'echoes of',
        'ghost of you', 'picture on the wall', 'old photograph',
        'flashback', 'days gone by', 'turn back time'
      ],
      keywords: [
        'memory', 'memories', 'remember', 'yesterday', 'photograph',
        'polaroid', 'picture', 'past', 'ghost', 'echo', 'echoes',
        'nostalgia', 'forgotten', 'reminisce', 'faded', 'traces'
      ],
      tonalTint: {
        type: 'sepia_subtle',
        name: 'Vintage Nostalgia',
        r: 220, g: 195, b: 165,
        warmth: 0.08,
        bgOffset: { r: 16, g: 12, b: 8 }
      },
      preferredCompositions: ['offset_left', 'behind', 'distant_small']
    },
    time: {
      id: 'time',
      name: 'Time & Eternity',
      phrases: [
        'running out of time', 'watch the clock', 'time goes by', 'tick tock',
        'frozen in time', 'waiting forever', 'moments pass', 'hourglass',
        'out of time', 'stop the clock', 'another minute', 'counting hours'
      ],
      keywords: [
        'time', 'clock', 'hour', 'hours', 'seconds', 'minute', 'minutes',
        'forever', 'waiting', 'eternity', 'tick', 'ticking', 'tempo',
        'chrono', 'timeless', 'watches'
      ],
      tonalTint: {
        type: 'neutral',
        name: 'Editorial Monochrome',
        r: 235, g: 235, b: 240,
        warmth: 0.0,
        bgOffset: { r: 10, g: 10, b: 12 }
      },
      preferredCompositions: ['above', 'distant_small', 'behind']
    },
    fire: {
      id: 'fire',
      name: 'Fire & Passion',
      phrases: [
        'burn inside', 'set on fire', 'playing with fire', 'ashes to ashes',
        'smoke and mirrors', 'spark a flame', 'burn down', 'wildfire',
        'burning bright', 'caught on fire', 'flames arise', 'blazing high'
      ],
      keywords: [
        'fire', 'flame', 'flames', 'burn', 'burning', 'blaze', 'spark',
        'sparks', 'ashes', 'smoke', 'ignite', 'fever', 'heat', 'warmth',
        'embers', 'glow'
      ],
      tonalTint: {
        type: 'warm_amber',
        name: 'Ember Glow',
        r: 255, g: 175, b: 110,
        warmth: 0.16,
        bgOffset: { r: 20, g: 10, b: 4 }
      },
      preferredCompositions: ['below', 'behind', 'cropped_large']
    },
    rain: {
      id: 'rain',
      name: 'Rain & Melancholy',
      phrases: [
        'crying in the rain', 'tears fall', 'washed away', 'under the rain',
        'storm clouds', 'pour down', 'ocean of tears', 'drowning in',
        'rain keeps falling', 'drops of rain', 'heavy storm', 'thunder and lightning'
      ],
      keywords: [
        'rain', 'raining', 'storm', 'tear', 'tears', 'drown', 'drowning',
        'water', 'river', 'ocean', 'pour', 'pouring', 'flood', 'weep',
        'droplets', 'mist'
      ],
      tonalTint: {
        type: 'cool',
        name: 'Storm Slate',
        r: 150, g: 190, b: 225,
        warmth: -0.10,
        bgOffset: { r: 6, g: 12, b: 20 }
      },
      preferredCompositions: ['below', 'behind', 'offset_left']
    },
    road: {
      id: 'road',
      name: 'Road & Horizon',
      phrases: [
        'on the road', 'highway drive', 'down this path', 'endless road',
        'runaway car', 'hit the highway', 'lost on the road', 'drive away',
        'open road', 'cross the line', 'long journey', 'horizon line'
      ],
      keywords: [
        'road', 'highway', 'drive', 'driving', 'path', 'street', 'journey',
        'horizon', 'runaway', 'tracks', 'travel', 'lane', 'miles', 'wheels'
      ],
      tonalTint: {
        type: 'dusty_warm',
        name: 'Vanishing Horizon',
        r: 215, g: 195, b: 175,
        warmth: 0.05,
        bgOffset: { r: 14, g: 12, b: 10 }
      },
      preferredCompositions: ['below', 'behind', 'cropped_large']
    },
    home: {
      id: 'home',
      name: 'Home & Sanctuary',
      phrases: [
        'coming home', 'safe and sound', 'open door', 'roof over my head',
        'welcome home', 'back to my roots', 'sanctuary', 'warm bed',
        'find my way home', 'back home', 'stay inside'
      ],
      keywords: [
        'home', 'house', 'window', 'door', 'room', 'shelter', 'bed',
        'sanctuary', 'haven', 'hearth', 'threshold', 'walls', 'roof'
      ],
      tonalTint: {
        type: 'warm',
        name: 'Hearth Glow',
        r: 250, g: 200, b: 150,
        warmth: 0.10,
        bgOffset: { r: 16, g: 10, b: 6 }
      },
      preferredCompositions: ['offset_right', 'behind', 'distant_small']
    },
    dream: {
      id: 'dream',
      name: 'Dream & Surrealism',
      phrases: [
        'in my dreams', 'lost in my head', 'lucid dream', 'wake me up',
        'floating away', 'walking on clouds', 'on top of the world',
        'out of this world', 'in the clouds', 'sweet dreams',
        'daydreaming', 'eyes wide shut'
      ],
      keywords: [
        'dream', 'dreams', 'dreaming', 'floating', 'cloud', 'clouds',
        'sky', 'sleep', 'awake', 'surreal', 'fantasy', 'illusion',
        'vision', 'weightless', 'ethereal', 'high'
      ],
      tonalTint: {
        type: 'ethereal',
        name: 'Lucid Iridescence',
        r: 210, g: 175, b: 245,
        warmth: 0.02,
        bgOffset: { r: 12, g: 8, b: 18 }
      },
      preferredCompositions: ['above', 'offset_left', 'behind', 'cropped_large']
    }
  };

  const CONCEPT_KEYS = Object.keys(CONCEPTS);

  /**
   * Words to ignore for punch emphasis because they are structural/articles/auxiliaries.
   */
  const COMMON_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'so', 'to', 'of', 'in', 'on',
    'at', 'by', 'for', 'with', 'from', 'up', 'down', 'is', 'am', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'can', 'could', 'shall', 'should', 'will', 'would', 'may', 'might', 'must',
    'that', 'this', 'these', 'those', 'it', 'its', 'my', 'your', 'his', 'her',
    'our', 'their', 'we', 'they', 'you', 'me', 'him', 'us', 'them'
  ]);

  /**
   * Deterministic 32-bit FNV-1a string hash.
   */
  function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
  }

  /**
   * Cleans punctuation and lowercase text for semantic scanning.
   */
  function normalizeText(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detects semantic concept from text and words.
   * Returns:
   * {
   *   concept: 'love' | 'night' | ... | null,
   *   strength: 'strong' | 'weak' | 'none',
   *   matchedPhrase: string | null,
   *   matchedKeyword: string | null,
   *   tonalTint: object | null,
   *   emphasizedWord: string | null,
   *   emphasizedWordIndex: number
   * }
   */
  function analyzeLyric(text, words = [], options = {}) {
    const raw = (text || '').trim();
    const normalized = normalizeText(raw);
    const tokens = words && words.length
      ? words.map((w) => (typeof w === 'string' ? w : (w.text || '')).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim())
      : raw.split(/\s+/).map((w) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim()).filter(Boolean);

    let detectedConcept = null;
    let detectedStrength = 'none';
    let matchedPhrase = null;
    let matchedKeyword = null;

    // 1. First priority: Multi-word phrase matching (Produces 'strong' concept)
    for (const key of CONCEPT_KEYS) {
      const def = CONCEPTS[key];
      for (const phrase of def.phrases) {
        if (normalized.includes(phrase)) {
          detectedConcept = key;
          detectedStrength = 'strong';
          matchedPhrase = phrase;
          break;
        }
      }
      if (detectedConcept) break;
    }

    // 2. Second priority: Keyword scanning
    if (!detectedConcept) {
      const lowerTokens = tokens.map((t) => t.toLowerCase());
      for (const key of CONCEPT_KEYS) {
        const def = CONCEPTS[key];
        for (const kw of def.keywords) {
          const tokenIdx = lowerTokens.indexOf(kw);
          if (tokenIdx !== -1) {
            detectedConcept = key;
            matchedKeyword = kw;
            // Short lines (<= 4 words) where keyword appears give 'strong' concept;
            // longer lines give 'weak' supporting concept.
            detectedStrength = (tokens.length <= 4) ? 'strong' : 'weak';
            break;
          }
        }
        if (detectedConcept) break;
      }
    }

    // 3. Intentional Word Emphasis (e.g. "I don't want nobody else" -> "NOBODY")
    // Rule: Do NOT emphasize every keyword. Only emphasize when:
    // - Line has 3 to 8 words
    // - Line is not marked skipEmphasis
    // - The word is emotional / conceptual / punchy and not a common stop word
    let emphasizedWord = null;
    let emphasizedWordIndex = -1;

    const allowEmphasis = options.allowEmphasis !== false && tokens.length >= 3 && tokens.length <= 8;
    if (allowEmphasis) {
      // Find candidate word: highest priority is a matched keyword or punchy contrast word
      let bestScore = 0;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const lower = token.toLowerCase();
        if (COMMON_WORDS.has(lower) || token.length < 3) continue;

        let score = token.length;
        if (matchedKeyword && lower === matchedKeyword) {
          score += 15;
        } else if (matchedPhrase && matchedPhrase.includes(lower)) {
          score += 10;
        } else if (['nobody', 'nothing', 'forever', 'never', 'alone', 'broken', 'burn', 'dream', 'tonight', 'always'].includes(lower)) {
          score += 12;
        }

        if (score > bestScore) {
          bestScore = score;
          emphasizedWord = token.toUpperCase();
          emphasizedWordIndex = i;
        }
      }

      // If highest candidate score is too low, keep words balanced (no artificial hero)
      if (bestScore < 9) {
        emphasizedWord = null;
        emphasizedWordIndex = -1;
      }
    }

    const tonalTint = detectedConcept ? CONCEPTS[detectedConcept].tonalTint : null;

    return {
      concept: detectedConcept,
      strength: detectedStrength,
      matchedPhrase,
      matchedKeyword,
      tonalTint,
      emphasizedWord,
      emphasizedWordIndex
    };
  }

  return {
    CONCEPTS,
    CONCEPT_KEYS,
    COMMON_WORDS,
    hashString,
    normalizeText,
    analyzeLyric
  };
});
