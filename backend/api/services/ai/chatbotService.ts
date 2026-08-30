import {
  EMPLOYER_FALLBACK_RESPONSES,
  EMPLOYER_INTENT_DEFINITIONS,
  EMPLOYER_NAVIGATION_ACTIONS_BY_INTENT,
  EMPLOYER_NONSENSE_RESPONSES,
  FALLBACK_RESPONSES,
  FOLLOW_UP_NAVIGATION_PHRASES,
  INTENT_DEFINITIONS,
  IntentDefinition,
  NAVIGATION_ACTIONS_BY_INTENT,
  NavigationAction,
  NONSENSE_RESPONSES,
} from './chatbotIntents';
import { isNonsenseInput, normalizeMessage, scoreKeyword, similarity } from './textUtils';

const QUESTION_PUNCTUATION_ONLY_PATTERN = /^[\s?!.,]+$/;
const SHORT_FOLLOW_UP_TOKENS = new Set(['where', 'what', 'which', 'page', 'link', 'huh', 'again', 'sorry']);

const INTENT_LEXICON: string[] = Array.from(
  new Set(
    INTENT_DEFINITIONS.flatMap((intent) =>
      intent.keywords.flatMap((keyword) =>
        normalizeMessage(keyword).split(' ').filter(Boolean),
      ),
    ),
  ),
);

function containsExactKeywordTokens(messageTokens: string[], keywordTokens: string[]): boolean {
  if (!messageTokens.length || !keywordTokens.length) {
    return false;
  }
  if (keywordTokens.length === 1) {
    return messageTokens.includes(keywordTokens[0]);
  }

  const windowSize = keywordTokens.length;
  for (let i = 0; i <= messageTokens.length - windowSize; i++) {
    let matches = true;
    for (let k = 0; k < windowSize; k++) {
      if (messageTokens[i + k] !== keywordTokens[k]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function pickResponse(options: readonly string[], seedSource: string): string {
  if (!options.length) {
    return '';
  }
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) {
    seed += seedSource.charCodeAt(i);
  }
  return options[seed % options.length];
}

function resolveIntentScore(
  normalizedMessage: string,
  messageTokens: string[],
  keywords: readonly string[],
): number {
  let bestScore = 0.0;
  for (const keyword of keywords) {
    bestScore = Math.max(bestScore, scoreKeyword(normalizedMessage, messageTokens, normalizeMessage(keyword)));
  }
  return bestScore;
}

function resolveExactKeywordStrength(messageTokens: string[], keywords: readonly string[]): number {
  let bestStrength = 0;
  for (const keyword of keywords) {
    const keywordTokens = normalizeMessage(keyword).split(' ').filter(Boolean);
    if (containsExactKeywordTokens(messageTokens, keywordTokens)) {
      bestStrength = Math.max(bestStrength, keywordTokens.length);
    }
  }
  return bestStrength;
}

function resolveLexicalCoverage(messageTokens: string[]): [number, number, number] {
  if (!messageTokens.length) {
    return [0.0, 0.0, 0];
  }

  let hits = 0;
  let strongestSimilarity = 0.0;
  for (const token of messageTokens) {
    let tokenBest = 0.0;
    for (const lexiconToken of INTENT_LEXICON) {
      tokenBest = Math.max(tokenBest, similarity(token, lexiconToken));
      if (tokenBest === 1.0) {
        break;
      }
    }
    if (tokenBest >= 0.82) {
      hits += 1;
    }
    strongestSimilarity = Math.max(strongestSimilarity, tokenBest);
  }

  return [hits / messageTokens.length, strongestSimilarity, hits];
}

function buildActions(intentId: string): NavigationAction[] {
  const actions = NAVIGATION_ACTIONS_BY_INTENT[intentId];
  return actions ? [...actions] : [];
}

function isNavigationFollowUp(normalizedMessage: string, messageTokens: string[]): boolean {
  if (FOLLOW_UP_NAVIGATION_PHRASES.some((phrase) => normalizedMessage.includes(phrase))) {
    return true;
  }

  const tokenSet = new Set(messageTokens);
  if (messageTokens.length <= 2 && Array.from(SHORT_FOLLOW_UP_TOKENS).some((tok) => tokenSet.has(tok))) {
    return true;
  }
  if (tokenSet.size === 1 && tokenSet.has('huh')) {
    return true;
  }
  if (tokenSet.has('where') && ['that', 'it', 'this', 'page', 'link', 'find'].some((t) => tokenSet.has(t))) {
    return true;
  }
  if (tokenSet.has('what') && ['that', 'it', 'this', 'page', 'link'].some((t) => tokenSet.has(t))) {
    return true;
  }
  if (tokenSet.has('link') && ['where', 'page', 'that', 'it'].some((t) => tokenSet.has(t))) {
    return true;
  }
  return false;
}

function buildNavigationFollowUpReply(intentId: string, actions: NavigationAction[]): string {
  if (!actions.length) {
    return pickResponse(FALLBACK_RESPONSES, intentId);
  }

  const primary = actions[0];
  const label = String(primary?.label || 'this page').trim();
  return `You can find it here: ${label}. Tap the button below and I will open it.`;
}

export interface ChatbotProcessResult {
  reply: string;
  intent: string;
  confidence: number;
  actions: NavigationAction[];
}

function processEmployerMessage(message: string, lastIntent?: string | null): ChatbotProcessResult {
  const rawMessage = String(message || '');
  const normalized = normalizeMessage(rawMessage);
  const normalizedLastIntent = String(lastIntent || '').trim().toLowerCase();

  if (!normalized) {
    return {
      reply: pickResponse(EMPLOYER_NONSENSE_RESPONSES, rawMessage),
      intent: 'fallback',
      confidence: 0.0,
      actions: [],
    };
  }

  for (const intent of EMPLOYER_INTENT_DEFINITIONS) {
    if (intent.keywords.some((keyword) => normalized.includes(keyword))) {
      const actions = EMPLOYER_NAVIGATION_ACTIONS_BY_INTENT[intent.intent_id]
        ? [...EMPLOYER_NAVIGATION_ACTIONS_BY_INTENT[intent.intent_id]]
        : [];
      return {
        reply: pickResponse(intent.responses, normalized),
        intent: intent.intent_id,
        confidence: 0.9,
        actions,
      };
    }
  }

  if (
    normalizedLastIntent &&
    normalized.split(' ').some((token) => ['where', 'which', 'link', 'page'].includes(token))
  ) {
    const actions = EMPLOYER_NAVIGATION_ACTIONS_BY_INTENT[normalizedLastIntent]
      ? [...EMPLOYER_NAVIGATION_ACTIONS_BY_INTENT[normalizedLastIntent]]
      : [];
    if (actions.length) {
      return {
        reply: buildNavigationFollowUpReply(normalizedLastIntent, actions),
        intent: normalizedLastIntent,
        confidence: 0.88,
        actions,
      };
    }
  }

  return {
    reply: pickResponse(EMPLOYER_FALLBACK_RESPONSES, normalized),
    intent: 'fallback',
    confidence: 0.0,
    actions: [],
  };
}

export function processMessage(
  message: string,
  lastIntent?: string | null,
  audience: string = 'general',
): ChatbotProcessResult {
  if (audience === 'employer') {
    return processEmployerMessage(message, lastIntent);
  }

  const rawMessage = String(message || '');
  const normalized = normalizeMessage(rawMessage);
  const normalizedLastIntent = String(lastIntent || '').trim().toLowerCase();
  const rawTrimmed = rawMessage.trim();
  const followUpActions = normalizedLastIntent ? buildActions(normalizedLastIntent) : [];

  if (normalizedLastIntent && followUpActions.length && QUESTION_PUNCTUATION_ONLY_PATTERN.test(rawTrimmed)) {
    return {
      reply: buildNavigationFollowUpReply(normalizedLastIntent, followUpActions),
      intent: normalizedLastIntent,
      confidence: 0.88,
      actions: followUpActions,
    };
  }

  if (!normalized) {
    if (rawTrimmed) {
      return {
        reply: pickResponse(NONSENSE_RESPONSES, rawMessage),
        intent: 'fallback',
        confidence: 0.0,
        actions: [],
      };
    }
    return {
      reply: pickResponse(FALLBACK_RESPONSES, ''),
      intent: 'fallback',
      confidence: 0.0,
      actions: [],
    };
  }

  if (isNonsenseInput(rawMessage, normalized)) {
    return {
      reply: pickResponse(NONSENSE_RESPONSES, normalized),
      intent: 'fallback',
      confidence: 0.0,
      actions: [],
    };
  }

  const messageTokens = normalized.split(' ').filter(Boolean);
  if (normalizedLastIntent && followUpActions.length && isNavigationFollowUp(normalized, messageTokens)) {
    return {
      reply: buildNavigationFollowUpReply(normalizedLastIntent, followUpActions),
      intent: normalizedLastIntent,
      confidence: 0.9,
      actions: followUpActions,
    };
  }

  const [lexicalCoverage, , lexiconHits] = resolveLexicalCoverage(messageTokens);
  if (lexiconHits === 0) {
    return {
      reply: pickResponse(FALLBACK_RESPONSES, normalized),
      intent: 'fallback',
      confidence: 0.0,
      actions: [],
    };
  }

  interface ScoredIntent {
    intent: IntentDefinition;
    exactStrength: number;
    score: number;
  }

  const scoredIntents: ScoredIntent[] = [];
  for (const intent of INTENT_DEFINITIONS) {
    const exactStrength = resolveExactKeywordStrength(messageTokens, intent.keywords);
    const score = resolveIntentScore(normalized, messageTokens, intent.keywords);
    scoredIntents.push({ intent, exactStrength, score });
  }

  scoredIntents.sort((a, b) => {
    if (b.exactStrength !== a.exactStrength) {
      return b.exactStrength - a.exactStrength;
    }
    return b.score - a.score;
  });

  const topScored = scoredIntents[0];
  if (!topScored) {
    return {
      reply: pickResponse(FALLBACK_RESPONSES, normalized),
      intent: 'fallback',
      confidence: 0.0,
      actions: [],
    };
  }

  const { intent: bestIntent, exactStrength, score: topScore } = topScored;

  if (exactStrength > 0 && topScore >= 0.5) {
    return {
      reply: pickResponse(bestIntent.responses, normalized),
      intent: bestIntent.intent_id,
      confidence: Number(Math.max(topScore, 0.75).toFixed(3)),
      actions: buildActions(bestIntent.intent_id),
    };
  }

  const minimumConfidence = lexicalCoverage > 0.5 ? 0.52 : 0.62;
  if (topScore < minimumConfidence) {
    return {
      reply: pickResponse(FALLBACK_RESPONSES, normalized),
      intent: 'fallback',
      confidence: 0.0,
      actions: [],
    };
  }

  return {
    reply: pickResponse(bestIntent.responses, normalized),
    intent: bestIntent.intent_id,
    confidence: Number(topScore.toFixed(3)),
    actions: buildActions(bestIntent.intent_id),
  };
}
