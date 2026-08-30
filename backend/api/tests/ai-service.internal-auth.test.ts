const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { ensureBaseTestEnv } = require('./testEnv.ts');

ensureBaseTestEnv();

const aiService = require('../services/aiService');
const pool = require('../config/database');
const { createApp } = require('../app');

test('aiService: getChatbotReply returns response in-process', async () => {
  const response = await aiService.getChatbotReply({ message: 'hello' });
  assert.equal(response.intent, 'greeting');
  assert.ok(response.confidence >= 0.75);
  assert.ok(response.reply.length > 0);
});

test('aiService: matchJobsForCandidate computes match scores', async () => {
  const candidate = {
    skills: ['React', 'Node.js'],
    experience_years: 3,
  };
  const jobs = [
    { id: 1, title: 'React Engineer', skills: ['React'] },
  ];

  const result = await aiService.matchJobsForCandidate({ candidate, jobs });
  assert.equal(result.success, true);
  assert.equal(result.matches.length, 1);
  assert.ok(result.matches[0].match_percentage > 50);
});

test('aiService: rankCandidatesForJob ranks candidate profiles', async () => {
  const job = {
    id: 1,
    title: 'TypeScript Developer',
    skills: ['TypeScript', 'Node.js'],
  };
  const candidates = [
    { id: 'c1', name: 'Alice', skills: ['TypeScript', 'Node.js'] },
    { id: 'c2', name: 'Bob', skills: ['Java'] },
  ];

  const result = await aiService.rankCandidatesForJob({ job, candidates });
  assert.equal(result.success, true);
  assert.equal(result.rankings.length, 2);
  assert.equal(result.rankings[0].candidate_id, 'c1');
});

test('aiService: analyzeResumeProfile generates ATS analysis', async () => {
  const candidate = {
    skills: ['React', 'TypeScript', 'PostgreSQL'],
    summary: 'Senior full-stack engineer with 5 years experience building web apps.',
  };

  const result = await aiService.analyzeResumeProfile(candidate);
  assert.equal(result.success, true);
  assert.ok(result.analysis.ats_score > 0);
});

test('aiService: matchJobsBySkills loads open jobs from database when jobs are omitted', async () => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql: String(sql), params });
    return {
      rows: [{ id: 1, title: 'React Engineer', description: 'Build React applications', skills: ['React'] }],
    };
  };

  try {
    const matches = await aiService.matchJobsBySkills({ skills: ['React'], experience: 'mid' });

    assert.equal(queries.length, 1);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 1);
  } finally {
    pool.query = originalQuery;
  }
});

test('POST /api/public/chatbot/message returns chatbot response directly from backend', async () => {
  const app = createApp();
  const response = await request(app)
    .post('/api/public/chatbot/message')
    .send({ message: 'hello' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.intent, 'greeting');
  assert.ok(response.body.reply.length > 0);
});
