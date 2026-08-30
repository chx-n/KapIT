const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeMessage, isNonsenseInput, similarity, scoreKeyword } = require('../services/ai/textUtils');
const { processMessage } = require('../services/ai/chatbotService');

test('textUtils: normalizeMessage handles typos, repeated letters, and phrases', () => {
  assert.equal(normalizeMessage('helo world'), 'hello world');
  assert.equal(normalizeMessage('heyyyy'), 'hey');
  assert.equal(normalizeMessage('gud morning!'), 'good morning');
  assert.equal(normalizeMessage('suport???'), 'support');
  assert.equal(normalizeMessage('ehy'), 'hey');
});

test('textUtils: isNonsenseInput detects gibberish and symbols', () => {
  assert.equal(isNonsenseInput('???', '???'), true);
  assert.equal(isNonsenseInput('1234567', '1234567'), true);
  assert.equal(isNonsenseInput('aaaa aaaa aaaa aaaa', 'aaaa aaaa aaaa aaaa'), true);
  assert.equal(isNonsenseInput('bcdfghjk', 'bcdfghjk'), true);
  assert.equal(isNonsenseInput('How do I apply?', 'how do i apply'), false);
});

test('textUtils: similarity returns correct ratios', () => {
  assert.equal(similarity('hello', 'hello'), 1.0);
  assert.equal(similarity('', 'hello'), 0.0);
  assert.ok(similarity('helo', 'hello') > 0.85);
});

test('chatbotService: general greeting and help intents', () => {
  const greeting = processMessage('hello');
  assert.equal(greeting.intent, 'greeting');
  assert.ok(greeting.confidence >= 0.75);
  assert.ok(greeting.reply.length > 0);

  const help = processMessage('i need help');
  assert.equal(help.intent, 'help');
  assert.ok(help.actions.length > 0);
  assert.equal(help.actions[0].type, 'navigate');
});

test('chatbotService: job application and auth intents', () => {
  const job = processMessage('how do i apply for a job');
  assert.equal(job.intent, 'job');
  assert.ok(job.actions.some((a) => a.href === '/jobs'));

  const auth = processMessage('i forgot my password');
  assert.equal(auth.intent, 'auth');
  assert.ok(auth.actions.some((a) => a.href === '/forgot-password'));
});

test('chatbotService: follow-up navigation intent resolution', () => {
  const followUp = processMessage('where is that?', 'job');
  assert.equal(followUp.intent, 'job');
  assert.ok(followUp.reply.includes('Open Jobs'));
  assert.ok(followUp.actions.length > 0);

  const questionMarkFollowUp = processMessage('???', 'pricing');
  assert.equal(questionMarkFollowUp.intent, 'pricing');
  assert.ok(questionMarkFollowUp.reply.includes('Open Pricing'));
});

test('chatbotService: employer audience routing', () => {
  const employerPost = processMessage('how to post a job', null, 'employer');
  assert.equal(employerPost.intent, 'post-job');
  assert.ok(employerPost.reply.includes('employer workspace'));
  assert.ok(employerPost.actions.length > 0);

  const employerFollowUp = processMessage('where is the link', 'post-job', 'employer');
  assert.equal(employerFollowUp.intent, 'post-job');
});

test('chatbotService: nonsense and fallback handling', () => {
  const nonsense = processMessage('zxczxczxc');
  assert.equal(nonsense.intent, 'fallback');
  assert.equal(nonsense.confidence, 0.0);
});
