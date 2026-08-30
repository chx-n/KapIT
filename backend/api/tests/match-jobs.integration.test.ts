const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ensureBaseTestEnv } = require('./testEnv.ts');

ensureBaseTestEnv();

const { createApp } = require('../app');

const getAccessToken = () =>
  jwt.sign(
    {
      id: 'fcbe1983-6809-4b03-8321-f2b40c3cb4c0',
      userType: 'employee',
      accountType: 'developer',
      role: 'employee',
    },
    process.env.JWT_SECRET,
    { expiresIn: '20m' },
  );

test('POST /api/match-jobs returns normalized matches from local engine', async () => {
  const app = createApp();
  const response = await request(app)
    .post('/api/match-jobs')
    .set('Authorization', `Bearer ${getAccessToken()}`)
    .send({
      skills: ['React', 'JavaScript'],
      experience: 'junior',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(Array.isArray(response.body.matches), true);
});

test('POST /api/match-jobs rejects invalid request body', async () => {
  const app = createApp();
  const response = await request(app)
    .post('/api/match-jobs')
    .set('Authorization', `Bearer ${getAccessToken()}`)
    .send({
      skills: [],
      experience: 'unknown-level',
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, 'validation error');
});
