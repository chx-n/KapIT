import {
  CRITICAL_HINT_PATTERN,
  EXPERIENCE_TARGETS,
  PROGRAMMING_MARKERS,
  ROLE_GROUPS,
  SKILL_ALIASES,
  SPECIALIZATION_FOCUS,
  STOP_WORDS,
  TOKEN_PATTERN,
  YEARS_PATTERN,
} from './scoringConstants';
import { similarity } from './textUtils';

export function normalizeSkill(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function tokenize(text: string): string[] {
  const matches = String(text || '').match(TOKEN_PATTERN);
  if (!matches) return [];
  return matches.map((token) => token.toLowerCase());
}

export function asTextList(value: unknown, splitCommas = true): string[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value) || value instanceof Set) {
    const result: string[] = [];
    for (const item of value) {
      result.push(...asTextList(item, splitCommas));
    }
    return result;
  }

  const raw = String(value).trim();
  if (!raw) {
    return [];
  }
  if (splitCommas) {
    const parts = raw.split(/[,\n;/]+/);
    return parts.map((part) => part.trim()).filter(Boolean);
  }
  return [raw];
}

export function buildCandidateText(candidate: Record<string, any>): string {
  const parts = [
    candidate.desired_role || '',
    candidate.summary || '',
    candidate.resume_text || '',
    candidate.education || '',
    candidate.certifications || '',
    asTextList(candidate.skills).join(' '),
    asTextList(candidate.projects).join(' '),
    asTextList(candidate.preferred_categories).join(' '),
    asTextList(candidate.tech_stack).join(' '),
    candidate.location || '',
  ];
  return parts.filter(Boolean).map(String).join(' ').trim();
}

export function buildJobText(job: Record<string, any>): string {
  const parts = [
    job.title || '',
    job.description || '',
    asTextList(job.skills).join(' '),
    asTextList(job.technologies).join(' '),
    asTextList(job.keywords).join(' '),
    asTextList(job.tags).join(' '),
    job.industry || '',
    job.category || '',
    job.seniority || '',
    job.location || '',
    job.type || '',
  ];
  return parts.filter(Boolean).map(String).join(' ').trim();
}

export function extractKeywords(text: string, limit = 25): string[] {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();

  for (const token of tokens) {
    if (!STOP_WORDS.has(token) && token.length > 2) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, limit).map(([word]) => word);
}

function expandWithSkillAliases(skills: Set<string>): Set<string> {
  const expanded = new Set(skills);
  for (const skill of Array.from(skills)) {
    const aliases = SKILL_ALIASES[skill];
    if (aliases) {
      for (const alias of aliases) {
        expanded.add(alias);
      }
    }
  }
  return expanded;
}

function detectRoleGroups(tokens: Set<string>): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const [groupName, aliases] of Object.entries(ROLE_GROUPS)) {
    let overlapCount = 0;
    for (const token of tokens) {
      if (aliases.has(token)) {
        overlapCount++;
      }
    }
    if (overlapCount > 0) {
      weights[groupName] = overlapCount / Math.max(aliases.size, 1);
    }
  }
  return weights;
}

function ratioOverlap(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) {
    return 0.0;
  }
  let overlapCount = 0;
  for (const item of left) {
    if (right.has(item)) overlapCount++;
  }
  return overlapCount / Math.max(right.size, 1);
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) {
    return 0.0;
  }
  const union = new Set([...left, ...right]);
  if (!union.size) return 0.0;
  let overlapCount = 0;
  for (const item of left) {
    if (right.has(item)) overlapCount++;
  }
  return overlapCount / union.size;
}

function parseJobSkillSets(job: Record<string, any>): [Set<string>, Set<string>, Set<string>] {
  const requiredList = [
    ...asTextList(job.skills),
    ...asTextList(job.technologies),
    ...asTextList(job.required_skills),
  ];
  const requiredSkills = new Set(requiredList.map(normalizeSkill).filter(Boolean));

  const preferredList = [
    ...asTextList(job.preferred_skills),
    ...asTextList(job.keywords),
    ...asTextList(job.tags),
  ];
  const preferredSkills = new Set(
    preferredList.map(normalizeSkill).filter((item) => item && !requiredSkills.has(item)),
  );

  const titleTokens = new Set(tokenize(job.title || ''));
  const descriptionText = normalizeSkill(job.description || '');
  const hasCriticalHint = CRITICAL_HINT_PATTERN.test(descriptionText);

  const criticalSkills = new Set<string>();
  for (const skill of requiredSkills) {
    const skillTokens = tokenize(skill);
    if (skillTokens.some((tok) => titleTokens.has(tok))) {
      criticalSkills.add(skill);
    }
  }

  if (hasCriticalHint) {
    for (const skill of requiredSkills) {
      if (descriptionText.includes(skill)) {
        criticalSkills.add(skill);
      }
    }
  }

  return [requiredSkills, preferredSkills, criticalSkills];
}

function scoreSkillFit(
  candidate: Record<string, any>,
  job: Record<string, any>,
): [number, string[], string[], string[], number, Record<string, number>] {
  const candidateList = [
    ...asTextList(candidate.skills),
    ...asTextList(candidate.tech_stack),
  ];
  const candidateSkills = new Set(candidateList.map(normalizeSkill).filter(Boolean));
  const [requiredSkills, preferredSkills, criticalSkills] = parseJobSkillSets(job);

  if (!requiredSkills.size) {
    const candidateKeywords = new Set(extractKeywords(buildCandidateText(candidate), 35));
    const jobKeywords = new Set(extractKeywords(buildJobText(job), 35));
    const overlap: string[] = [];
    for (const kw of candidateKeywords) {
      if (jobKeywords.has(kw)) overlap.push(kw);
    }
    const score = !jobKeywords.size
      ? 32
      : Math.min(84, Math.round(30 + (overlap.length / Math.max(jobKeywords.size, 1)) * 54));
    return [
      score,
      overlap.sort().slice(0, 12),
      [],
      [],
      0.35,
      { required_coverage: 0.0, preferred_coverage: 0.0, stack_similarity: 0.0 },
    ];
  }

  const expandedCandidate = expandWithSkillAliases(candidateSkills);
  const direct = new Set<string>();
  for (const s of requiredSkills) {
    if (candidateSkills.has(s)) direct.add(s);
  }

  const semantic = new Set<string>();
  for (const s of requiredSkills) {
    if (!direct.has(s) && expandedCandidate.has(s)) semantic.add(s);
  }

  let requiredCoverage = (direct.size + semantic.size * 0.55) / Math.max(requiredSkills.size, 1);

  let candidateMarkerCount = 0;
  for (const s of candidateSkills) if (PROGRAMMING_MARKERS.has(s)) candidateMarkerCount++;
  let requiredMarkerCount = 0;
  for (const s of requiredSkills) if (PROGRAMMING_MARKERS.has(s)) requiredMarkerCount++;

  let transferableProgrammingCoverage = 0.0;
  if (requiredCoverage < 0.35 && candidateMarkerCount >= 2 && requiredMarkerCount >= 2) {
    transferableProgrammingCoverage = Math.min(
      0.26,
      0.1 + Math.min(candidateMarkerCount, requiredMarkerCount) * 0.04,
    );
    requiredCoverage = Math.max(requiredCoverage, transferableProgrammingCoverage);
  }

  const preferredDirect = new Set<string>();
  for (const s of preferredSkills) if (candidateSkills.has(s)) preferredDirect.add(s);

  const preferredSemantic = new Set<string>();
  for (const s of preferredSkills) {
    if (!preferredDirect.has(s) && expandedCandidate.has(s)) preferredSemantic.add(s);
  }

  const preferredCoverage = preferredSkills.size
    ? (preferredDirect.size + preferredSemantic.size * 0.35) / Math.max(preferredSkills.size, 1)
    : 0.0;

  const stackSimilarity = jaccardSimilarity(
    expandedCandidate,
    new Set([...requiredSkills, ...preferredSkills]),
  );

  const rawSkillScore =
    requiredCoverage * 0.78 + preferredCoverage * 0.14 + stackSimilarity * 0.08;
  const score = Math.min(100, Math.round(Math.max(0.0, rawSkillScore) * 100));

  const matched = Array.from(
    new Set([...direct, ...semantic, ...preferredDirect, ...preferredSemantic]),
  ).sort();
  const directAndSemantic = new Set([...direct, ...semantic]);
  const missing = Array.from(requiredSkills).filter((s) => !directAndSemantic.has(s)).sort();
  const missingCritical = missing.filter((s) => criticalSkills.has(s)).sort();

  const confidenceSignal = Math.min(
    1.0,
    0.22 +
      requiredCoverage * 0.6 +
      preferredCoverage * 0.12 +
      (direct.size >= 2 ? 0.12 : 0),
  );

  return [
    score,
    matched,
    missing,
    missingCritical,
    confidenceSignal,
    {
      required_coverage: requiredCoverage,
      preferred_coverage: preferredCoverage,
      stack_similarity: stackSimilarity,
      transferable_programming_coverage: transferableProgrammingCoverage,
    },
  ];
}

function scoreRoleFit(
  candidate: Record<string, any>,
  job: Record<string, any>,
): [number, number, Record<string, number>, Set<string>] {
  const candidateRole = normalizeSkill(candidate.desired_role || '');
  const candidateRoleTokens = new Set(tokenize(candidateRole));
  const jobRoleText = normalizeSkill(
    `${job.title || ''} ${job.description || ''} ${job.category || ''} ${job.industry || ''} ${job.tags || ''}`,
  );
  const jobRoleTokens = new Set(tokenize(jobRoleText));

  if (!candidateRoleTokens.size) {
    return [
      0,
      0,
      {
        direct_overlap: 0.0,
        group_alignment: 0.0,
        category_alignment: 0.0,
        industry_alignment: 0.0,
        title_similarity: 0.0,
      },
      new Set(),
    ];
  }

  let directOverlapCount = 0;
  for (const t of candidateRoleTokens) if (jobRoleTokens.has(t)) directOverlapCount++;
  const directOverlap = directOverlapCount / Math.max(candidateRoleTokens.size, 1);

  const candidateGroupTokens = new Set(
    tokenize(
      [
        candidate.desired_role || '',
        candidate.summary || '',
        asTextList(candidate.skills).join(' '),
        asTextList(candidate.tech_stack).join(' '),
        asTextList(candidate.preferred_categories).join(' '),
      ].join(' '),
    ),
  );

  const jobGroupTokens = new Set(
    tokenize(
      [
        job.title || '',
        job.description || '',
        asTextList(job.skills).join(' '),
        asTextList(job.technologies).join(' '),
        job.category || '',
        job.industry || '',
        asTextList(job.tags).join(' '),
      ].join(' '),
    ),
  );

  const candidateGroups = detectRoleGroups(candidateGroupTokens);
  const jobGroups = detectRoleGroups(jobGroupTokens);
  const sharedGroups = new Set(
    Object.keys(candidateGroups).filter((g) => g in jobGroups),
  );

  let groupAlignment = 0.0;
  if (sharedGroups.size) {
    let sumAlignment = 0.0;
    for (const group of sharedGroups) {
      sumAlignment += Math.min(candidateGroups[group] || 0, jobGroups[group] || 0);
    }
    groupAlignment = Math.min(1.0, sumAlignment * 2.8);
  }

  const categoryTokens = new Set(tokenize(asTextList(candidate.preferred_categories).join(' ')));
  const jobCategoryTokens = new Set(
    tokenize(`${job.category || ''} ${job.tags || ''} ${job.title || ''}`),
  );
  const categoryAlignment = categoryTokens.size
    ? ratioOverlap(categoryTokens, jobCategoryTokens)
    : ratioOverlap(candidateRoleTokens, jobCategoryTokens);

  const candidateContextTokens = new Set(tokenize(buildCandidateText(candidate)));
  const industryTokens = new Set(tokenize(job.industry || ''));
  const industryAlignment = industryTokens.size
    ? ratioOverlap(candidateContextTokens, industryTokens)
    : 0.0;

  const titleSimilarity = similarity(candidateRole, normalizeSkill(job.title || ''));

  const roleScore = Math.min(
    100,
    Math.round(
      100 *
        (directOverlap * 0.32 +
          groupAlignment * 0.38 +
          categoryAlignment * 0.12 +
          industryAlignment * 0.08 +
          titleSimilarity * 0.1),
    ),
  );

  const roleRelevance = Math.min(
    100,
    Math.round(
      100 *
        (directOverlap * 0.3 +
          groupAlignment * 0.42 +
          categoryAlignment * 0.12 +
          industryAlignment * 0.1 +
          titleSimilarity * 0.06),
    ),
  );

  return [
    roleScore,
    roleRelevance,
    {
      direct_overlap: directOverlap,
      group_alignment: groupAlignment,
      category_alignment: categoryAlignment,
      industry_alignment: industryAlignment,
      title_similarity: titleSimilarity,
    },
    sharedGroups,
  ];
}

function scoreSpecializationFit(
  candidate: Record<string, any>,
  job: Record<string, any>,
): [number, number, Record<string, number>] {
  const candidateText = [
    candidate.desired_role || '',
    candidate.summary || '',
    asTextList(candidate.skills).join(' '),
    asTextList(candidate.tech_stack).join(' '),
    asTextList(candidate.projects).join(' '),
  ].join(' ').trim();

  const jobText = [
    job.title || '',
    job.description || '',
    asTextList(job.skills).join(' '),
    asTextList(job.technologies).join(' '),
    asTextList(job.keywords).join(' '),
    job.category || '',
  ].join(' ').trim();

  const candidateTokens = new Set(tokenize(candidateText));
  const jobTokens = new Set(tokenize(jobText));

  if (!jobTokens.size) {
    return [56, 0.35, {}];
  }

  const jobFocus: Record<string, number> = {};
  const candidateFocus: Record<string, number> = {};

  for (const [name, aliases] of Object.entries(SPECIALIZATION_FOCUS)) {
    let jobOverlap = 0;
    for (const tok of jobTokens) if (aliases.has(tok)) jobOverlap++;
    if (jobOverlap > 0) {
      jobFocus[name] = jobOverlap / Math.max(aliases.size, 1);
    }

    let candOverlap = 0;
    for (const tok of candidateTokens) if (aliases.has(tok)) candOverlap++;
    if (candOverlap > 0) {
      candidateFocus[name] = candOverlap / Math.max(aliases.size, 1);
    }
  }

  if (!Object.keys(jobFocus).length) {
    return [58, 0.4, {}];
  }

  let totalJobFocus = 0;
  for (const val of Object.values(jobFocus)) totalJobFocus += val;
  if (!totalJobFocus) totalJobFocus = 1.0;

  let weightedAlignment = 0.0;
  for (const [name, jobWeight] of Object.entries(jobFocus)) {
    const normalizedJobWeight = jobWeight / totalJobFocus;
    const candidateWeight = candidateFocus[name] || 0.0;
    const dimensionAlignment = jobWeight > 0 ? Math.min(1.0, candidateWeight / jobWeight) : 0.0;
    weightedAlignment += normalizedJobWeight * dimensionAlignment;
  }

  const specializationScore = Math.min(100, Math.round(100 * weightedAlignment));
  const signal = Math.min(1.0, 0.28 + weightedAlignment * 0.68);
  return [specializationScore, signal, jobFocus];
}

function inferJobTargetExperienceYears(job: Record<string, any>): number | null {
  const text = `${job.title || ''} ${job.description || ''} ${job.seniority || ''}`;
  const match = text.match(YEARS_PATTERN);
  if (match && match[1]) {
    const value = parseInt(match[1], 10);
    return Math.max(0, Math.min(value, 20));
  }

  const normalized = normalizeSkill(text);
  for (const [keyword, years] of Object.entries(EXPERIENCE_TARGETS)) {
    if (normalized.includes(keyword)) {
      return years;
    }
  }
  return null;
}

function scoreExperienceFit(
  candidate: Record<string, any>,
  job: Record<string, any>,
): [number, number] {
  const yearsRaw = candidate.experience_years;
  const candidateYears = typeof yearsRaw === 'number' ? yearsRaw : parseFloat(String(yearsRaw));

  if (isNaN(candidateYears)) {
    return [60, 0.2];
  }

  const targetYears = inferJobTargetExperienceYears(job);
  if (targetYears == null) {
    return [candidateYears >= 1 ? 78 : 64, 0.45];
  }

  const gap = Math.abs(candidateYears - targetYears);
  if (gap === 0) return [95, 0.9];
  if (gap <= 1) return [86, 0.75];
  if (gap <= 3) return [72, 0.6];
  return [56, 0.45];
}

function scoreContextFit(
  candidate: Record<string, any>,
  job: Record<string, any>,
): [number, number] {
  const candidateTokens = new Set(extractKeywords(buildCandidateText(candidate), 35));
  const jobTokens = new Set(extractKeywords(buildJobText(job), 35));

  let keywordOverlapCount = 0;
  for (const t of candidateTokens) if (jobTokens.has(t)) keywordOverlapCount++;

  const keywordScore = !jobTokens.size
    ? 40
    : Math.min(100, Math.round(35 + (keywordOverlapCount / Math.max(jobTokens.size, 1)) * 65));

  const profileType = normalizeSkill(candidate.preferred_type || '');
  const jobType = normalizeSkill(job.type || '');
  let typeScore = 70;
  if (profileType && jobType) {
    typeScore = profileType.includes(jobType) || jobType.includes(profileType) ? 95 : 52;
  }

  const locationTokens = new Set(tokenize(candidate.location || ''));
  const jobLocationTokens = new Set(tokenize(job.location || ''));
  let locationScore = 62;
  if (locationTokens.size && jobLocationTokens.size) {
    let locOverlap = 0;
    for (const t of locationTokens) if (jobLocationTokens.has(t)) locOverlap++;
    const overlap = locOverlap / Math.max(jobLocationTokens.size, 1);
    locationScore = Math.min(100, Math.round(42 + overlap * 58));
  }

  const score = Math.round(keywordScore * 0.55 + typeScore * 0.25 + locationScore * 0.2);
  const confidenceSignal = Math.min(
    1.0,
    0.35 +
      (keywordOverlapCount ? 0.25 : 0) +
      (profileType && jobType ? 0.2 : 0),
  );
  return [score, confidenceSignal];
}

function scoreResponsibilityFit(
  candidate: Record<string, any>,
  job: Record<string, any>,
): [number, number, number] {
  const candidateKeywords = new Set(extractKeywords(buildCandidateText(candidate), 45));
  const jobKeywords = new Set(extractKeywords(buildJobText(job), 45));

  if (!jobKeywords.size) {
    return [48, 0.28, 0];
  }

  let overlapCount = 0;
  for (const t of candidateKeywords) if (jobKeywords.has(t)) overlapCount++;

  const overlapRatio = overlapCount / Math.max(jobKeywords.size, 1);
  const jaccard = jaccardSimilarity(candidateKeywords, jobKeywords);
  const semanticRatio = similarity(
    Array.from(candidateKeywords).sort().join(' '),
    Array.from(jobKeywords).sort().join(' '),
  );

  const score = Math.min(
    100,
    Math.round(100 * (overlapRatio * 0.62 + jaccard * 0.23 + semanticRatio * 0.15)),
  );
  const confidenceSignal = Math.min(
    1.0,
    0.25 + overlapRatio * 0.5 + (overlapCount >= 4 ? 0.15 : 0),
  );
  return [score, confidenceSignal, overlapCount];
}

function criticalRequirementPenalty(params: {
  missingCriticalCount: number;
  missingTotal: number;
  requiredTotal: number;
  roleRelevance: number;
  specializationScore: number;
}): number {
  const { missingCriticalCount, missingTotal, requiredTotal, roleRelevance, specializationScore } =
    params;
  if (requiredTotal <= 0) return 0;

  const missingRatio = missingTotal / Math.max(requiredTotal, 1);
  let penalty = missingCriticalCount * 6 + Math.round(missingRatio * 4);
  if (roleRelevance < 30 && specializationScore < 35) {
    penalty += 1;
  }
  return Math.max(0, Math.min(12, penalty));
}

function weightedAverage(values: Array<[number, number]>): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [score, weight] of values) {
    if (weight > 0) {
      totalWeight += weight;
      weightedSum += score * weight;
    }
  }
  if (totalWeight <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));
}

function confidenceLabel(score: number): string {
  if (score >= 70) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

function fitLabel(score: number, insufficientData: boolean): string {
  if (insufficientData) return 'Insufficient Data';
  if (score >= 75) return 'Strong Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Partial Match';
  return 'Weak Match';
}

function computeProfileCompleteness(candidate: Record<string, any>): number {
  const checks = [
    Boolean(normalizeSkill(candidate.desired_role || '')),
    Boolean(asTextList(candidate.skills).length),
    tokenize(candidate.summary || '').length >= 10,
    tokenize(candidate.resume_text || '').length >= 10,
    candidate.experience_years != null,
    Boolean(normalizeSkill(candidate.education || '')),
    Boolean(normalizeSkill(candidate.certifications || '')),
    Boolean(asTextList(candidate.projects).length),
  ];
  const okCount = checks.filter(Boolean).length;
  return Math.round((okCount / checks.length) * 100);
}

function collectProfileDataGaps(params: {
  candidate: Record<string, any>;
  candidateSkillCount: number;
  summaryTokenCount: number;
  resumeTokenCount: number;
}): string[] {
  const { candidate, candidateSkillCount, summaryTokenCount, resumeTokenCount } = params;
  const gaps: string[] = [];
  if (!normalizeSkill(candidate.desired_role || '')) {
    gaps.push('Add your desired role');
  }
  if (candidateSkillCount < 2) {
    gaps.push('Add at least 2 relevant skills');
  }
  if (summaryTokenCount < 10) {
    gaps.push('Add a profile summary (at least 10 words)');
  }
  if (resumeTokenCount < 12) {
    gaps.push('Add resume details (at least 12 words)');
  }
  if (candidate.experience_years == null) {
    gaps.push('Add your years of experience');
  }
  if (!normalizeSkill(candidate.education || '')) {
    gaps.push('Add your education background');
  }
  if (!normalizeSkill(candidate.certifications || '')) {
    gaps.push('Add certifications or training');
  }
  if (!asTextList(candidate.projects).length) {
    gaps.push('Add at least one project');
  }
  return gaps;
}

export function computeMatch(candidate: Record<string, any>, job: Record<string, any>): Record<string, any> {
  const candidateText = buildCandidateText(candidate);
  const jobText = buildJobText(job);
  const candidateKeywords = new Set(extractKeywords(candidateText, 35));
  const jobKeywords = new Set(extractKeywords(jobText, 35));
  const keywordOverlap = Array.from(candidateKeywords)
    .filter((kw) => jobKeywords.has(kw))
    .sort();

  const [
    skillScore,
    matchedSkills,
    missingSkills,
    missingCriticalSkills,
    skillConfidenceSignal,
    skillComponents,
  ] = scoreSkillFit(candidate, job);

  const [roleScore, roleRelevance, roleComponents, sharedGroups] = scoreRoleFit(candidate, job);
  const [experienceScore, experienceSignal] = scoreExperienceFit(candidate, job);
  const [contextScore, contextSignal] = scoreContextFit(candidate, job);
  const [responsibilityScore, responsibilitySignal, responsibilityOverlapCount] =
    scoreResponsibilityFit(candidate, job);
  const [specializationScore, specializationSignal, specializationFocus] = scoreSpecializationFit(
    candidate,
    job,
  );
  const [requiredSkills] = parseJobSkillSets(job);

  const roleWeight = roleScore > 0 ? 0.34 : 0.0;
  const fitRaw = weightedAverage([
    [roleScore, roleWeight],
    [skillScore, 0.3],
    [experienceScore, 0.12],
    [responsibilityScore, 0.13],
    [specializationScore, 0.11],
  ]);

  const penalty = criticalRequirementPenalty({
    missingCriticalCount: missingCriticalSkills.length,
    missingTotal: missingSkills.length,
    requiredTotal: requiredSkills.size,
    roleRelevance,
    specializationScore,
  });

  const roleFamilyBoost = Math.round((roleComponents.group_alignment || 0.0) * 11);
  const alignmentBoost = Math.round(Math.max(0, roleRelevance - 40) * 0.08);
  const contextAdjustment = Math.round((contextScore - 50) * 0.17);
  const evidenceAdjustment = Math.round(experienceScore * 0.04 + contextScore * 0.03) - 4;
  let fitScore = Math.max(
    0,
    Math.min(
      100,
      fitRaw - penalty + contextAdjustment + evidenceAdjustment + roleFamilyBoost + alignmentBoost,
    ),
  );

  const profileCompleteness = computeProfileCompleteness(candidate);
  const candidateSkillList = [
    ...asTextList(candidate.skills),
    ...asTextList(candidate.tech_stack),
  ];
  const candidateSkillCount = new Set(candidateSkillList.map(normalizeSkill).filter(Boolean)).size;
  const summaryTokenCount = tokenize(candidate.summary || '').length;
  const resumeTokenCount = tokenize(candidate.resume_text || '').length;

  const dataGaps = collectProfileDataGaps({
    candidate,
    candidateSkillCount,
    summaryTokenCount,
    resumeTokenCount,
  });

  const profileEvidenceSignal = Math.min(
    100,
    Math.round(
      (Math.min(12, candidateSkillCount) / 12) * 45 +
        (Math.min(60, summaryTokenCount) / 60) * 25 +
        (Math.min(80, resumeTokenCount) / 80) * 20 +
        profileCompleteness * 0.1,
    ),
  );

  const dataStrength = weightedAverage([
    [profileCompleteness, 0.55],
    [profileEvidenceSignal, 0.2],
    [Math.min(100, Math.round(skillConfidenceSignal * 100)), 0.15],
    [
      Math.min(
        100,
        Math.round(
          ((experienceSignal + contextSignal + responsibilitySignal + specializationSignal) / 4) *
            100,
        ),
      ),
      0.1,
    ],
  ]);

  let confidenceScore = Math.max(8, Math.min(99, dataStrength));
  const profileCompleted = Boolean(candidate.profile_completed);

  if (profileCompleted && skillScore < 45) {
    if (roleRelevance >= 62) {
      fitScore = Math.max(fitScore, 50);
    } else if (roleRelevance >= 50) {
      fitScore = Math.max(fitScore, 44);
    } else if (roleRelevance >= 42) {
      fitScore = Math.max(fitScore, 38);
    }
  }

  const lowProfileEvidence =
    candidateSkillCount < 2 && summaryTokenCount < 8 && resumeTokenCount < 12;

  const insufficientData =
    !profileCompleted &&
    (confidenceScore < 35 ||
      (profileCompleteness < 45 && lowProfileEvidence && !matchedSkills.length) ||
      (profileCompleteness < 30 && !matchedSkills.length && roleScore < 35));

  if (lowProfileEvidence) {
    confidenceScore = Math.min(confidenceScore, 42);
  }

  const confLabel = confidenceLabel(confidenceScore);
  const fLabel = fitLabel(fitScore, insufficientData);
  const atsScore = Math.min(100, Math.round(skillScore * 0.8 + keywordOverlap.length * 2.5));

  const strengths: string[] = [];
  if (matchedSkills.length) {
    strengths.push(`Matched skills: ${matchedSkills.slice(0, 6).join(', ')}`);
  }
  if (roleRelevance >= 60) {
    strengths.push('Role alignment is strong based on your profile and this job title');
  }
  if (keywordOverlap.length) {
    strengths.push(`Relevant overlap keywords: ${keywordOverlap.slice(0, 6).join(', ')}`);
  }

  const concerns: string[] = [];
  if (missingSkills.length) {
    concerns.push(`Missing requested skills: ${missingSkills.slice(0, 6).join(', ')}`);
  }
  if (missingCriticalSkills.length) {
    concerns.push(`Missing critical requirements: ${missingCriticalSkills.slice(0, 4).join(', ')}`);
  }
  if (roleRelevance < 40 && normalizeSkill(candidate.desired_role || '')) {
    concerns.push('Role alignment is limited compared with your preferred role');
  }
  if (profileCompleteness < 45) {
    concerns.push(
      !profileCompleted
        ? 'Profile data is incomplete, so confidence is lower'
        : 'Additional profile details can improve confidence',
    );
  }

  let reasoningSummary = '';
  if (insufficientData) {
    reasoningSummary =
      'Insufficient profile or job details for a reliable percentage. Complete your profile to improve accuracy.';
  } else {
    const positiveBits: string[] = [];
    if (matchedSkills.length) {
      positiveBits.push(`matched skills such as ${matchedSkills.slice(0, 4).join(', ')}`);
    }
    if (roleRelevance >= 55) {
      positiveBits.push('role alignment');
    }
    if (keywordOverlap.length) {
      positiveBits.push(`keyword overlap (${keywordOverlap.slice(0, 3).join(', ')})`);
    }

    const reductionBits: string[] = [];
    if (missingSkills.length) {
      reductionBits.push(`missing ${missingSkills.slice(0, 3).join(', ')}`);
    }
    if (missingCriticalSkills.length) {
      reductionBits.push(`critical gaps (${missingCriticalSkills.slice(0, 2).join(', ')})`);
    }
    if (confLabel === 'Low') {
      reductionBits.push('limited profile context');
    }

    const positiveText = positiveBits.length ? positiveBits.join(', ') : 'some partial relevance';
    if (reductionBits.length) {
      reasoningSummary = `Match is driven by ${positiveText}, but reduced by ${reductionBits.join(', ')}.`;
    } else {
      reasoningSummary = `Match is driven by ${positiveText}.`;
    }
  }

  return {
    match_percentage: fitScore,
    fit_score: fitScore,
    fit_label: fLabel,
    confidence_score: confidenceScore,
    confidence_label: confLabel,
    role_relevance: roleRelevance,
    ats_score: atsScore,
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    strengths,
    concerns,
    keyword_overlap: keywordOverlap.slice(0, 12),
    reasoning_summary: reasoningSummary,
    insufficient_data: insufficientData,
    data_gaps: dataGaps,
    score_breakdown: {
      dimensions: {
        role_relevance: roleScore,
        skill_overlap: skillScore,
        experience_match: experienceScore,
        responsibility_match: responsibilityScore,
        specialization_fit: specializationScore,
        context_fit: contextScore,
      },
      weights: {
        role_relevance: roleWeight,
        skill_overlap: 0.3,
        experience_match: 0.12,
        responsibility_match: 0.13,
        specialization_fit: 0.11,
      },
      adjustments: {
        critical_missing_penalty: penalty,
        context_adjustment: contextAdjustment,
        evidence_adjustment: evidenceAdjustment,
        role_family_boost: roleFamilyBoost,
        alignment_boost: alignmentBoost,
      },
      signals: {
        role_components: roleComponents,
        skill_components: skillComponents,
        shared_role_groups: Array.from(sharedGroups).sort(),
        specialization_focus: specializationFocus,
        responsibility_overlap_count: responsibilityOverlapCount,
        missing_critical_skills: missingCriticalSkills,
      },
    },
  };
}

export function analyzeResume(candidate: Record<string, any>): Record<string, any> {
  const candidateText = buildCandidateText(candidate);
  const extractedSkills = Array.from(
    new Set(asTextList(candidate.skills).map(normalizeSkill).filter(Boolean)),
  ).sort();
  const inferredKeywords = extractKeywords(candidateText, 12);
  const profileCompleteness = computeProfileCompleteness(candidate);
  const atsScore = Math.min(
    100,
    Math.round(
      extractedSkills.length * 7 + inferredKeywords.length * 2.5 + profileCompleteness * 0.35,
    ),
  );

  const improvements: string[] = [];
  if (extractedSkills.length < 4) {
    improvements.push('Add more role-specific skills to improve ATS visibility');
  }
  if (tokenize(candidate.summary || '').length < 20) {
    improvements.push('Expand your summary with measurable project outcomes');
  }
  if (tokenize(candidate.resume_text || '').length < 20) {
    improvements.push('Provide richer resume text to improve fit confidence');
  }

  return {
    ats_score: atsScore,
    extracted_skills: extractedSkills,
    keywords: inferredKeywords,
    profile_completeness: profileCompleteness,
    improvements,
  };
}
