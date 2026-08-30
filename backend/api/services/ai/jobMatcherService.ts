import { computeMatch, normalizeSkill } from './scoringService';

const EXPERIENCE_YEARS_BY_LEVEL: Record<string, number> = {
  intern: 0,
  junior: 2,
  mid: 4,
  senior: 7,
};

function normalizeSkills(skills?: string[] | null): string[] {
  if (!skills) return [];
  const normalized = skills.map(normalizeSkill).filter(Boolean);
  return Array.from(new Set(normalized)).sort();
}

function normalizeExperienceLevel(experience?: string | null): string {
  const normalized = normalizeSkill(experience || '');
  if (normalized in EXPERIENCE_YEARS_BY_LEVEL) {
    return normalized;
  }
  return 'junior';
}

function coerceCandidateProfile(candidateProfile?: Record<string, any> | null): Record<string, any> {
  return candidateProfile && typeof candidateProfile === 'object' ? candidateProfile : {};
}

function buildCandidatePayload(params: {
  skills: string[];
  experience: string;
  candidateProfile?: Record<string, any> | null;
}): Record<string, any> {
  const { skills, experience, candidateProfile } = params;
  const normalizedProfile = coerceCandidateProfile(candidateProfile);
  const normalizedSkills = normalizeSkills(skills);
  const profileSkills = normalizeSkills(
    Array.isArray(normalizedProfile.skills) ? normalizedProfile.skills : [],
  );
  const mergedSkills = Array.from(new Set([...normalizedSkills, ...profileSkills])).sort().slice(0, 80);

  const level = normalizeExperienceLevel(experience);
  const fallbackYears = EXPERIENCE_YEARS_BY_LEVEL[level] ?? 2;
  const experienceYearsRaw = normalizedProfile.experience_years;
  let experienceYears = fallbackYears;
  if (experienceYearsRaw != null) {
    const parsed = parseInt(String(experienceYearsRaw), 10);
    if (!isNaN(parsed)) {
      experienceYears = parsed;
    }
  }

  return {
    id: normalizedProfile.id || '',
    name: normalizedProfile.name || normalizedProfile.username || '',
    desired_role: normalizedProfile.desired_role || normalizedProfile.preferred_role || '',
    summary: normalizedProfile.summary || '',
    resume_text: normalizedProfile.resume_text || '',
    skills: mergedSkills,
    location: normalizedProfile.location || '',
    preferred_type: normalizedProfile.preferred_type || '',
    experience_years: experienceYears,
    account_type: normalizedProfile.account_type || '',
    education: normalizedProfile.education || '',
    certifications: normalizedProfile.certifications || '',
    projects: normalizedProfile.projects || [],
    preferred_categories: normalizedProfile.preferred_categories || [],
    tech_stack: normalizedProfile.tech_stack || [],
  };
}

export function buildJobMatches(
  skills: string[],
  experience: string,
  jobs: Array<Record<string, any>>,
  candidateProfile?: Record<string, any> | null,
): Array<Record<string, any>> {
  const candidatePayload = buildCandidatePayload({
    skills,
    experience,
    candidateProfile,
  });

  const matches: Array<Record<string, any>> = [];
  for (const job of jobs) {
    const score = computeMatch(candidatePayload, job);
    const fit = Number(score.fit_score || score.match_percentage || 0);
    matches.push({
      id: job.id != null ? Number(job.id) : null,
      title: String(job.title || 'Untitled job'),
      match: fit,
      fit_score: fit,
      fit_label: score.fit_label || 'Partial Match',
      confidence_score: Number(score.confidence_score || 0),
      confidence_label: score.confidence_label || 'Low',
      role_relevance: Number(score.role_relevance || 0),
      reasoning_summary: score.reasoning_summary || '',
      matched_skills: score.matched_skills || [],
      missing_skills: score.missing_skills || [],
      strengths: score.strengths || [],
      concerns: score.concerns || [],
      keyword_overlap: score.keyword_overlap || [],
      data_gaps: score.data_gaps || [],
      source: 'ai',
      insufficient_data: Boolean(score.insufficient_data),
    });
  }

  matches.sort((a, b) => b.match - a.match);
  return matches;
}
