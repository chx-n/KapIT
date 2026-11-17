import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  collectSkillRegistry,
  prepareRuntimeFileContents,
  syncSkillRouters,
} from '../sync-skills.ts';

const createFixture = () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kapit-sync-skills-'));
  const writeSkill = (relativePath: string) => {
    const skillFile = path.join(repoRoot, relativePath);
    fs.mkdirSync(path.dirname(skillFile), { recursive: true });
    fs.writeFileSync(skillFile, '# Fixture skill\n', 'utf8');
    return skillFile;
  };

  fs.mkdirSync(path.join(repoRoot, '.agents', 'skills'), { recursive: true });
  return { repoRoot, writeSkill };
};

test('collectSkillRegistry combines standard and custom skills in command order', () => {
  const { repoRoot, writeSkill } = createFixture();

  try {
    writeSkill('.agents/skills/planning/zeta/SKILL.md');
    writeSkill('.agents/skills/testing/alpha/SKILL.md');
    writeSkill('custom/extra/SKILL.md');
    fs.writeFileSync(
      path.join(repoRoot, '.agents', 'skills.json'),
      JSON.stringify({ skills: [{ command: 'extra', path: 'custom/extra/SKILL.md' }] }),
      'utf8'
    );

    const registry = collectSkillRegistry(repoRoot);

    assert.deepEqual(
      registry.map(({ command, source, runtimePath }) => ({ command, source, runtimePath })),
      [
        { command: 'alpha', source: 'standard', runtimePath: '.agents/skills/testing/alpha/SKILL.md' },
        { command: 'extra', source: 'custom', runtimePath: 'custom/extra/SKILL.md' },
        { command: 'zeta', source: 'standard', runtimePath: '.agents/skills/planning/zeta/SKILL.md' },
      ]
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('collectSkillRegistry accepts the category-entry registry used by this repository', () => {
  const { repoRoot, writeSkill } = createFixture();

  try {
    writeSkill('.agents/skills/frontend-design/impeccable-polish/SKILL.md');
    fs.writeFileSync(
      path.join(repoRoot, '.agents', 'skills.json'),
      JSON.stringify({ entries: [{ path: '.agents/skills/frontend-design' }] }),
      'utf8'
    );

    const registry = collectSkillRegistry(repoRoot);

    assert.deepEqual(
      registry.map(({ command, runtimePath }) => ({ command, runtimePath })),
      [{ command: 'impeccable-polish', runtimePath: '.agents/skills/frontend-design/impeccable-polish/SKILL.md' }]
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('collectSkillRegistry skips support folders marked with SKILL_REFERENCE.md', () => {
  const { repoRoot, writeSkill } = createFixture();

  try {
    writeSkill('.agents/skills/frontend-design/impeccable-shape/SKILL.md');
    const guidePath = path.join(repoRoot, '.agents', 'skills', 'frontend-design', 'impeccable', 'SKILL_REFERENCE.md');
    fs.mkdirSync(path.dirname(guidePath), { recursive: true });
    fs.writeFileSync(guidePath, '# Shared skill guide\n', 'utf8');
    fs.writeFileSync(
      path.join(repoRoot, '.agents', 'skills.json'),
      JSON.stringify({ entries: [{ path: '.agents/skills/frontend-design' }] }),
      'utf8'
    );

    const registry = collectSkillRegistry(repoRoot);

    assert.deepEqual(
      registry.map(({ command }) => command),
      ['impeccable-shape']
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('collectSkillRegistry rejects duplicate commands', () => {
  const { repoRoot, writeSkill } = createFixture();

  try {
    writeSkill('.agents/skills/planning/write-plan/SKILL.md');
    writeSkill('custom/write-plan/SKILL.md');
    fs.writeFileSync(
      path.join(repoRoot, '.agents', 'skills.json'),
      JSON.stringify({ skills: [{ command: 'write-plan', path: 'custom/write-plan/SKILL.md' }] }),
      'utf8'
    );

    assert.throws(() => collectSkillRegistry(repoRoot), /Duplicate skill command "write-plan"/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('prepareRuntimeFileContents replaces generated text and preserves manual notes', () => {
  const current = [
    'Manual note above.',
    '<!-- BEGIN GENERATED SKILL ROUTER -->',
    'old generated text',
    '<!-- END GENERATED SKILL ROUTER -->',
    'Manual note below.',
  ].join('\n');

  const updated = prepareRuntimeFileContents(
    current,
    'new generated text',
    'fallback that should not replace existing manual notes'
  );

  assert.match(updated, /Manual note above\./);
  assert.match(updated, /new generated text/);
  assert.match(updated, /Manual note below\./);
  assert.doesNotMatch(updated, /old generated text/);
  assert.doesNotMatch(updated, /fallback that should not replace/);
});

test('syncSkillRouters creates all runtime files with generated routes', () => {
  const { repoRoot, writeSkill } = createFixture();

  try {
    writeSkill('.agents/skills/testing/run-checks/SKILL.md');
    writeSkill('custom/ship/SKILL.md');
    fs.writeFileSync(
      path.join(repoRoot, '.agents', 'skills.json'),
      JSON.stringify({ skills: [{ command: 'ship', path: 'custom/ship/SKILL.md' }] }),
      'utf8'
    );

    const registry = syncSkillRouters(repoRoot);
    const runtimeFiles = [
      'CLAUDE.md',
      '.agents/AGENTS.md',
      '.agents/gemini-skills/gemini-master-skill.md',
    ];

    assert.equal(registry.length, 2);
    for (const relativePath of runtimeFiles) {
      const contents = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
      assert.match(contents, /<!-- BEGIN GENERATED SKILL ROUTER -->/);
      assert.match(contents, /<!-- END GENERATED SKILL ROUTER -->/);
      assert.match(contents, /`\/run-checks` ->/);
      assert.match(contents, /`\/ship` -> `custom\/ship\/SKILL\.md`/);
    }
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
