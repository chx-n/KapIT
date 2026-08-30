import { PHRASE_REPLACEMENTS, TYPO_REPLACEMENTS } from './chatbotIntents';

const REPEATED_PUNCTUATION_PATTERN = /([!?.,])\1+/g;
const REPEATED_LETTER_PATTERN = /([a-z])\1{2,}/g;
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9\s']/g;
const LETTER_OR_DIGIT_PATTERN = /[a-z0-9]/i;
const DIGITS_ONLY_PATTERN = /^\d+$/;

/**
 * Calculates string similarity using Gestalt pattern matching (equivalent to Python difflib SequenceMatcher).
 */
export function similarity(left: string, right: string): number {
  if (left === right) return 1.0;
  if (!left || !right) return 0.0;

  function getMatchingChars(
    s1: string,
    s2: string,
    alo: number,
    ahi: number,
    blo: number,
    bhi: number,
  ): number {
    let bestI = alo;
    let bestJ = blo;
    let bestSize = 0;

    for (let i = alo; i < ahi; i++) {
      for (let j = blo; j < bhi; j++) {
        let k = 0;
        while (i + k < ahi && j + k < bhi && s1.charAt(i + k) === s2.charAt(j + k)) {
          k++;
        }
        if (k > bestSize) {
          bestI = i;
          bestJ = j;
          bestSize = k;
        }
      }
    }

    if (bestSize === 0) return 0;

    let total = bestSize;
    if (alo < bestI && blo < bestJ) {
      total += getMatchingChars(s1, s2, alo, bestI, blo, bestJ);
    }
    if (bestI + bestSize < ahi && bestJ + bestSize < bhi) {
      total += getMatchingChars(s1, s2, bestI + bestSize, ahi, bestJ + bestSize, bhi);
    }
    return total;
  }

  const matchingChars = getMatchingChars(left, right, 0, left.length, 0, right.length);
  return (2.0 * matchingChars) / (left.length + right.length);
}

function normalizeTokens(text: string): string[] {
  const cleaned = text.replace(NON_ALPHANUMERIC_PATTERN, ' ');
  const tokens = cleaned.split(' ').filter(Boolean);
  return tokens.map((token) => TYPO_REPLACEMENTS[token] || token);
}

export function normalizeMessage(rawMessage: string): string {
  let lowered = String(rawMessage || '').toLowerCase().trim();
  lowered = lowered.replace(REPEATED_PUNCTUATION_PATTERN, '$1');
  lowered = lowered.replace(REPEATED_LETTER_PATTERN, '$1$1');
  lowered = lowered.replace(/\s+/g, ' ');

  for (const [source, target] of Object.entries(PHRASE_REPLACEMENTS)) {
    lowered = lowered.split(source).join(target);
  }

  const tokens = normalizeTokens(lowered);
  return tokens.join(' ').trim();
}

export function isNonsenseInput(rawMessage: string, normalizedMessage: string): boolean {
  const raw = String(rawMessage || '').trim();
  if (!raw) return false;

  if (!LETTER_OR_DIGIT_PATTERN.test(raw)) {
    return true;
  }

  const tokens = normalizedMessage.split(' ').filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }

  if (tokens.every((token) => DIGITS_ONLY_PATTERN.test(token))) {
    return true;
  }

  if (tokens.length >= 4 && new Set(tokens).size === 1) {
    return true;
  }

  const merged = tokens.join('');
  if (merged.length >= 6 && !/[aeiou]/i.test(merged)) {
    return true;
  }

  return false;
}

export function scoreKeyword(normalizedMessage: string, messageTokens: string[], keyword: string): number {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase();
  if (!normalizedKeyword) return 0.0;

  const keywordTokens = normalizedKeyword.split(' ').filter(Boolean);
  if (!keywordTokens.length || !messageTokens.length) return 0.0;

  // Exact phrase check
  const windowSize = keywordTokens.length;
  if (windowSize === 1 && messageTokens.includes(keywordTokens[0])) {
    return 1.0;
  }
  for (let i = 0; i <= messageTokens.length - windowSize; i++) {
    let match = true;
    for (let k = 0; k < windowSize; k++) {
      if (messageTokens[i + k] !== keywordTokens[k]) {
        match = false;
        break;
      }
    }
    if (match) return 1.0;
  }

  let total = 0.0;
  for (const keywordToken of keywordTokens) {
    let bestScore = 0.0;
    for (const messageToken of messageTokens) {
      if (messageToken === keywordToken) {
        bestScore = 1.0;
        break;
      }
      let tokenScore = similarity(messageToken, keywordToken);
      if (keywordToken.length <= 3 && tokenScore < 0.9) {
        tokenScore = 0.0;
      } else if (keywordToken.length === 4 && tokenScore < 0.84) {
        tokenScore = 0.0;
      }
      bestScore = Math.max(bestScore, tokenScore);
    }
    total += bestScore;
  }

  return total / keywordTokens.length;
}
