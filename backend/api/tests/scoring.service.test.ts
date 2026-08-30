const test = require('node:test');
const assert = require('node:assert/strict');

const { computeMatch, analyzeResume } = require('../services/ai/scoringService');
const { buildJobMatches } = require('../services/ai/jobMatcherService');

test('scoringService: computeMatch scores strong skill and role matches', () => {
  const candidate = {
    id: 'user-1',
    desired_role: 'Fullstack Developer',
    summary: 'Experienced web developer building React and Node applications with TypeScript for 4 years.',
    resume_text: 'Built production web apps using PostgreSQL, Express, React, and TypeScript with automated CI/CD pipelines.',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    experience_years: 4,
    education: 'BS Computer Science',
    certifications: 'AWS Certified Developer',
    projects: ['E-commerce web app', 'Analytics dashboard'],
  };

  const job = {
    id: 101,
    title: 'Fullstack TypeScript Developer',
    description: 'Looking for a developer with React, Node, and SQL database experience.',
    skills: ['React', 'Node.js', 'TypeScript', 'SQL'],
    seniority: 'Mid-Level',
    required_years: 3,
  };

  const match = computeMatch(candidate, job);
  assert.ok(match.fit_score >= 70, `Expected fit_score >= 70, got ${match.fit_score}`);
  assert.equal(match.fit_label, 'Strong Match');
  assert.ok(match.matched_skills.includes('react'));
  assert.ok(match.matched_skills.includes('typescript'));
  assert.ok(match.confidence_score >= 60);
  assert.equal(match.insufficient_data, false);
});

test('scoringService: computeMatch detects missing critical skills', () => {
  const candidate = {
    id: 'user-2',
    desired_role: 'Graphic Designer',
    skills: ['Photoshop', 'Figma', 'Illustrator'],
    experience_years: 2,
  };

  const job = {
    id: 102,
    title: 'Cybersecurity SOC Analyst',
    description: 'Must have SIEM, incident response, and threat detection experience.',
    skills: ['SIEM', 'SOC', 'Incident Response', 'Threat Detection'],
  };

  const match = computeMatch(candidate, job);
  assert.ok(match.fit_score < 40, `Expected fit_score < 40, got ${match.fit_score}`);
  assert.ok(match.missing_skills.length > 0);
});

test('scoringService: analyzeResume produces ATS scoring and improvements', () => {
  const sparseCandidate = {
    skills: ['JavaScript'],
    summary: 'Short',
    resume_text: '',
  };

  const analysis = analyzeResume(sparseCandidate);
  assert.ok(analysis.ats_score < 50);
  assert.ok(analysis.improvements.length >= 2);

  const completeCandidate = {
    skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Docker', 'AWS'],
    summary: 'Led software engineering projects delivering high-impact scalable services across 5 enterprise clients.',
    resume_text: 'Developed microservices and managed cloud deployments with 99.9% uptime for cloud applications.',
    education: 'BS Information Technology',
    certifications: 'AWS Cloud Practitioner',
    projects: ['Fintech API', 'Realtime Chat'],
    desired_role: 'Senior Software Engineer',
    experience_years: 6,
  };

  const completeAnalysis = analyzeResume(completeCandidate);
  assert.ok(completeAnalysis.ats_score >= 75);
});

test('jobMatcherService: buildJobMatches sorts jobs by match score descending', () => {
  const candidate = {
    id: 'user-3',
    skills: ['Python', 'Django'],
    experience_years: 3,
  };

  const jobs = [
    { id: 1, title: 'PHP WordPress Developer', skills: ['PHP', 'WordPress'] },
    { id: 2, title: 'Python Backend Engineer', skills: ['Python', 'Django', 'PostgreSQL'] },
  ];

  const matches = buildJobMatches(['Python', 'Django'], 'mid', jobs, candidate);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].id, 2);
  assert.ok(matches[0].match > matches[1].match);
});
