const pool = require('../config/database');
import { processMessage } from './ai/chatbotService';
import { buildJobMatches } from './ai/jobMatcherService';
import { analyzeResume, computeMatch } from './ai/scoringService';

type LooseRecord = Record<string, unknown>;
type FastApiJson = LooseRecord & {
  reply?: unknown;
  intent?: unknown;
  confidence?: unknown;
  actions?: unknown;
  message?: unknown;
  error?: unknown;
  detail?: unknown;
  success?: boolean;
  matches?: unknown[];
  rankings?: unknown[];
  analysis?: unknown;
};

type StringListOptions = {
  max?: number;
};

type CandidateProfileInput = LooseRecord | null | undefined;
type JobInput = LooseRecord | null | undefined;

type MatchJobsForCandidateInput = {
  candidate: CandidateProfileInput;
  jobs?: unknown;
};

type RankCandidatesForJobInput = {
  job: JobInput;
  candidates?: unknown;
};

type MatchJobsBySkillsInput = {
  skills?: unknown;
  experience?: unknown;
  candidate?: CandidateProfileInput;
  jobs?: Array<Record<string, unknown>>;
};

type ChatbotReplyInput = {
  message?: unknown;
  lastIntent?: unknown;
  audience?: unknown;
};

const isAiConfigured = (): boolean => true;

const toTrimmedStringList = (value: unknown, { max = 60 }: StringListOptions = {}): string[] => {
  if (!value) return [];
  const rawItems = Array.isArray(value)
    ? value
    : String(value)
        .split(/[\n,;/]+/g)
        .map((item) => item.trim());
  return Array.from(
    new Set(
      rawItems
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, max),
    ),
  );
};

const buildCandidateProfilePayload = (profile: CandidateProfileInput): LooseRecord => ({
  id: profile?.id || profile?.userId || '',
  name: profile?.fullName || profile?.username || profile?.name || '',
  desired_role: profile?.preferredRole || profile?.desiredJob || profile?.jobTitle || '',
  summary: profile?.aboutMe || profile?.bio || profile?.summary || '',
  resume_text: profile?.resumeText || profile?.resume_text || '',
  skills: toTrimmedStringList(profile?.skills),
  location: profile?.location || profile?.address || '',
  preferred_type: profile?.preferredType || profile?.workPreference || profile?.preferred_type || '',
  experience_years:
    profile?.yearsOfExperience != null
      ? Number(profile.yearsOfExperience)
      : profile?.experienceYears != null
        ? Number(profile.experienceYears)
        : profile?.experience_years != null
          ? Number(profile.experience_years)
          : null,
  account_type: profile?.accountType || profile?.account_type || '',
  certifications: Array.isArray(profile?.certifications)
    ? profile.certifications.join(', ')
    : String(profile?.certifications || '').trim(),
  education: String(profile?.education || '').trim(),
  projects: toTrimmedStringList(profile?.projects, { max: 80 }),
  preferred_categories: toTrimmedStringList(profile?.preferredCategories || profile?.preferred_categories),
  tech_stack: toTrimmedStringList(profile?.techStack || profile?.tech_stack),
  profile_completeness: Number.isFinite(Number(profile?.profileCompleteness ?? profile?.profile_completeness))
    ? Number(profile?.profileCompleteness ?? profile?.profile_completeness)
    : null,
  profile_completed:
    typeof profile?.profileCompleted === 'boolean'
      ? profile.profileCompleted
      : typeof profile?.profile_completed === 'boolean'
        ? profile.profile_completed
        : null,
});

const buildJobPayload = (job: JobInput): LooseRecord => ({
  id: job?.id,
  title: job?.title || '',
  description: job?.description || '',
  location: job?.location || '',
  type: job?.type || '',
  skills: toTrimmedStringList(job?.skills),
  technologies: toTrimmedStringList(job?.technologies),
  keywords: toTrimmedStringList(job?.keywords),
  certifications: toTrimmedStringList(job?.certifications),
  seniority: String(job?.seniority || job?.experienceLevel || '').trim(),
  required_years: Number.isFinite(Number(job?.requiredYears ?? job?.required_years))
    ? Number(job?.requiredYears ?? job?.required_years)
    : null,
  industry: String(job?.industry || '').trim(),
  category: String(job?.category || '').trim(),
  tags: toTrimmedStringList(job?.tags),
});

const matchJobsForCandidate = async ({ candidate, jobs }: MatchJobsForCandidateInput): Promise<FastApiJson> => {
  const candidatePayload = buildCandidateProfilePayload(candidate);
  const jobList = Array.isArray(jobs) ? jobs : [];
  const matches: Array<Record<string, unknown>> = [];

  for (const job of jobList) {
    const jobPayload = buildJobPayload(job as JobInput);
    const score = computeMatch(candidatePayload, jobPayload);
    matches.push({
      job_id: jobPayload.id,
      ...score,
    });
  }

  matches.sort((a, b) => Number(b.match_percentage || 0) - Number(a.match_percentage || 0));
  return {
    success: true,
    matches,
  };
};

const rankCandidatesForJob = async ({ job, candidates }: RankCandidatesForJobInput): Promise<FastApiJson> => {
  const jobPayload = buildJobPayload(job);
  const candidateList = Array.isArray(candidates) ? candidates : [];
  const rankings: Array<Record<string, unknown>> = [];

  for (const candidate of candidateList) {
    const candidatePayload = buildCandidateProfilePayload(candidate as CandidateProfileInput);
    const score = computeMatch(candidatePayload, jobPayload);
    rankings.push({
      candidate_id: candidatePayload.id,
      candidate_name:
        candidatePayload.name || candidatePayload.desired_role || 'Candidate',
      ...score,
    });
  }

  rankings.sort((a, b) => Number(b.match_percentage || 0) - Number(a.match_percentage || 0));
  return {
    success: true,
    rankings,
  };
};

const analyzeResumeProfile = async (candidate: CandidateProfileInput): Promise<FastApiJson> => {
  const candidatePayload = buildCandidateProfilePayload(candidate);
  const analysis = analyzeResume(candidatePayload);
  return {
    success: true,
    analysis,
  };
};

const fetchOpenJobsFromDb = async (limit = 120): Promise<Array<Record<string, unknown>>> => {
  try {
    const result = await pool.query(
      `SELECT
         j.id,
         j.title,
         COALESCE(j.description, '') AS description,
         COALESCE(j.location, '') AS location,
         COALESCE(j.type, '') AS type,
         COALESCE(j.skills, ARRAY[]::text[]) AS skills
       FROM jobs j
       WHERE j.status = 'open'
       ORDER BY j.created_at DESC
       LIMIT $1`,
      [Math.max(1, limit)],
    );
    return result?.rows || [];
  } catch {
    return [];
  }
};

const matchJobsBySkills = async ({
  skills,
  experience,
  candidate,
  jobs,
}: MatchJobsBySkillsInput): Promise<Array<Record<string, unknown>>> => {
  const skillList = toTrimmedStringList(skills);
  const expLevel = String(experience || '').trim().toLowerCase();
  const candidateProfile = candidate ? buildCandidateProfilePayload(candidate) : null;
  const targetJobs = Array.isArray(jobs) && jobs.length ? jobs : await fetchOpenJobsFromDb(120);

  return buildJobMatches(skillList, expLevel, targetJobs, candidateProfile);
};

const getChatbotReply = async ({ message, lastIntent, audience }: ChatbotReplyInput): Promise<FastApiJson> => {
  const rawMessage = String(message || '').trim();
  const rawLastIntent = String(lastIntent || '').trim().toLowerCase() || undefined;
  const rawAudience = audience === 'employer' ? 'employer' : 'general';

  const result = processMessage(rawMessage, rawLastIntent, rawAudience);
  return {
    reply: result.reply,
    intent: result.intent,
    confidence: result.confidence,
    actions: result.actions,
  };
};

module.exports = {
  isAiConfigured,
  matchJobsForCandidate,
  rankCandidatesForJob,
  analyzeResumeProfile,
  matchJobsBySkills,
  getChatbotReply,
};
