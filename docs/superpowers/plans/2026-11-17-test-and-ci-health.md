# Test and CI Health Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans` to implement this plan task by task. Keep each task independently reviewable.

**Goal:** Make KapIT's root test command run every existing test suite, fix current typecheck blockers, and make CI verify tests, types, build, lint, and production dependency audits.

**Architecture:** Keep the current React/Vite frontend, Express backend, Node test runner, and three independent pnpm installs. Use the already-installed `tsx` runtime through its public CLI for TypeScript scripts. Keep browser automation out of this change; add a separate browser-test plan if product-flow coverage is required.

**Tech Stack:** Node.js 22, pnpm 11.0.0, `tsx` 4.22.4, TypeScript 6.0.3, Node test runner, ESLint, GitHub Actions.

## Global Constraints

- Preserve current product behavior and route behavior.
- Keep `frontend`, `backend`, and root package installs frozen in CI.
- Use public `tsx` CLI entrypoints; do not depend on `tsx/dist/*` internal paths.
- Do not add Playwright or browser dependencies in this plan.
- Treat sandbox `listen EPERM` as an environment limit; require a socket-capable CI/host result before marking backend tests complete.
- Do not add `supportedArchitectures` to work around copied `node_modules`; install dependencies on each target OS.

---

## Senior Review

**Altitude diagnosis:** The first draft was mixed: it found real local failures, but used a private tsx loader path, did not wire existing frontend/skill tests into CI, and treated a sandbox-blocked backend run as though a later run would pass.

### Major findings corrected

- Root scripts use `node --require ./backend/node_modules/tsx/dist/cjs/index.cjs`, while root package declares ESM. That path failed on root `.ts` entrypoints with `ERR_UNKNOWN_FILE_EXTENSION`. Root scripts should use `tsx` CLI, made available as a root dev dependency, instead of an internal tsx file path. The tsx maintainers document the CLI and `node --import tsx` as supported ways to run TypeScript. [tsx Node CLI docs](https://github.com/privatenumber/tsx/blob/master/docs/dev-api/node-cli.md)
- Root `pnpm test` currently runs backend tests only. CI does not run the 19 frontend source tests or the advertised `sync-skills:test`; it also skips TypeScript checks. The revised plan makes the root test command aggregate all three suites and adds frontend/backend typechecks to CI.
- CI runs bare `pnpm audit` at root, but the root package already has an `audit` script that audits backend and frontend manifests. CI must call `pnpm run audit` to cover both production dependency sets.
- Backend Supertest integration failures included `listen EPERM` under this sandbox. The plan does not change test behavior to avoid sockets; completion requires the full suite to pass on the GitHub Actions runner or another environment that permits loopback sockets.

### Confirmed findings retained

- TypeScript 6.0.3 rejects frontend `baseUrl` with `TS5101`. The path mappings already use `./` paths. TypeScript 6.0 says `paths` no longer requires `baseUrl` and recommends removing it. [TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html), [module resolution reference](https://www.typescriptlang.org/docs/handbook/modules/reference)
- Backend typecheck fails because `company.analytics.test.ts` inserts an incomplete object into `require.cache`; current `@types/node` expects a full `Module`.
- `sync-skills:test` points at `scripts/tests/sync-skills.test.ts`, which does not exist.
- Lint currently reports four warnings in three components. These are bounded cleanup items; they are not confirmed user-facing defects.
- `node_modules` copied from Windows caused native package errors in this Linux workspace. Frozen pnpm install selected working Linux packages. pnpm documents that native optional dependencies are platform-specific and that `node_modules` should not be copied between operating systems. [pnpm dependency resolution settings](https://github.com/pnpm/pnpm/blob/main/pnpm/docs/settings/dependency-resolution.md)

### What the first draft got right

- Kept app behavior out of scope.
- Kept backend API test files and their CJS loader unchanged until a separate reproduction demonstrates a problem there.
- Treated cross-platform `node_modules` and sandbox socket restrictions as environment issues instead of app defects.
- Deferred browser tests rather than introducing a new framework before the existing test commands work.

## Root Cause Summary

| Finding | Evidence | Planned response |
|---|---|---|
| CI Node version cannot run pinned pnpm | `pnpm@11.0.0` requires Node 22.13+; `pnpm --version` under Node 20.20.2 fails with `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` | Use Node 22 in CI and local verification |
| Production dependency audit fails | Backend audit found 10 high and 1 critical advisory before remediation | Refresh affected backend packages and the pinned `qs` override; verify the high-severity audit gate |
| Payment E2E can reach the configured email provider | The test imported the real email service while local `.env` supplied a provider key | Stub the receipt email service in the test and assert exactly one intended receipt across retry |
| Root TypeScript commands use a CJS loader for root ESM `.ts` entrypoints | `package.json:8-30`; `pnpm test` raised `ERR_UNKNOWN_FILE_EXTENSION` for `scripts/run-tests.ts` | Add root `tsx` CLI dependency; invoke root TypeScript scripts through `tsx` |
| Root test command omits frontend tests and skill-sync tests | `package.json:25,28`; `frontend/package.json` has no `test` script | Add frontend test script and aggregate frontend, backend, and skill-sync suites at root |
| Advertised skill-sync test file is absent | `package.json:28`; no files under `scripts/tests/` | Add focused tests for the exported sync functions |
| Frontend typecheck stops at deprecated `baseUrl` | `frontend/tsconfig.json`; TypeScript 6.0.3 reports TS5101 | Remove `baseUrl`; keep existing relative `paths` mappings |
| Backend typecheck rejects a fake cache module | `backend/api/tests/company.analytics.test.ts:28` | Construct a real Node `Module` in the test helper |
| CI skips typechecks and frontend tests | `.github/workflows/ci.yml:47-59` | Run all tests and typechecks in CI |
| CI audit covers root manifest only | CI runs `pnpm audit`; root `audit` script explicitly audits backend and frontend | Change CI to `pnpm run audit` |
| Four lint warnings remain | `CompanyManageJobsPage.jsx:107-121`; `CompanyProfileOnboardingPage.jsx:231-239`; `UserHomeProfileSidebar.jsx:4-11` | Remove stale dependencies/locals and stabilize static icon mapping |
| Backend integration tests cannot bind sockets in this sandbox | `listen EPERM` from Supertest; 123/138 cases passed in the sandbox run | Re-run full suite in CI or another socket-capable host; do not infer app failures from sandbox-only bind errors |

## File Map

- `package.json`: root `tsx` development dependency, root TypeScript script launchers, frontend/backend/skill-sync test aggregation.
- `pnpm-lock.yaml`: root lock entry for `tsx` 4.22.4.
- `backend/package.json`: backend test command through its local `tsx` CLI.
- `backend/pnpm-workspace.yaml` and `backend/pnpm-lock.yaml`: update the vulnerable `qs` override and backend dependency resolutions.
- `backend/api/tests/payments.e2e.idempotency.test.ts`: record receipt email calls within the test instead of reaching the provider.
- `frontend/package.json`: `node --test` script for existing `.mjs` source tests.
- `scripts/tests/sync-skills.test.ts`: missing unit tests for skill discovery and generated router updates.
- `frontend/tsconfig.json`: remove deprecated `baseUrl` while preserving alias maps.
- `backend/api/tests/company.analytics.test.ts`: use a complete `Module` instance in the mock cache helper.
- `frontend/modules/company/pages/CompanyManageJobsPage.jsx`: move static status icons out of component render.
- `frontend/modules/shared/pages/onboarding/CompanyProfileOnboardingPage.jsx`: remove dependency entries already represented by derived values.
- `frontend/modules/user/components/UserHomeProfileSidebar.jsx` and `frontend/modules/user/components/UserLeftSidebar.jsx`: remove unused prop and dead progress calculation.
- `.github/workflows/ci.yml`: run all checks and audit backend/frontend production dependencies.

## Implementation Tasks

### Task 1: Make TypeScript script launchers use the supported CLI

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `backend/package.json`

**Interfaces:**

- Root package scripts execute TypeScript files from repository root.
- Backend `test` executes `../scripts/run-tests.ts` from `backend/`, preserving the current working directory expected by that runner.
- Keep API-local `node --require tsx/cjs` commands and child test loader in `scripts/run-tests.ts`; those were not the failing boundary.

- [ ] Add exact root dev dependency `tsx: 4.22.4` and update only root `pnpm-lock.yaml` with `pnpm add --save-dev --save-exact tsx@4.22.4`.
- [ ] Change root scripts to public CLI calls: `tsx scripts/start-dev.ts`, `tsx scripts/install-githooks.ts`, `tsx scripts/security-guard.ts`, `tsx scripts/sync-skills.ts`, and `tsx scripts/apply-db-migrations.ts` with their existing arguments preserved.
- [ ] Change root `sync-skills:test` to `tsx --test scripts/tests/sync-skills.test.ts`.
- [ ] Change `backend/package.json` test script from `node --require tsx/cjs ../scripts/run-tests.ts` to `tsx ../scripts/run-tests.ts`.
- [ ] In a clean checkout using Node 22 and pnpm 11, run `pnpm install --frozen-lockfile`. Confirm root `prepare` finishes before nested backend/frontend installs.
- [ ] Run `pnpm run security:guard`. Expected: exit 0, no `ERR_UNKNOWN_FILE_EXTENSION`.

### Task 2: Add missing test suites to the root test command

**Files:**

- Modify: `frontend/package.json`
- Modify: `package.json`
- Create: `scripts/tests/sync-skills.test.ts`

**Interfaces:**

- Use existing exports from `scripts/sync-skills.ts`: `collectSkillRegistry(repoRoot)`, `prepareRuntimeFileContents(currentContents, generatedBlock, fallbackContents)`, `renderGeneratedRouterBlock({ runtimeLabel, registry })`, and `syncSkillRouters(repoRoot)`.
- Each test fixture creates a temporary repo and deletes only that fixture in `finally`.

- [ ] Add frontend script `"test": "node --test"`.
- [ ] Add four skill-sync tests with these exact behaviors:
  - `collectSkillRegistry combines standard and custom skills in command order`: standard and custom entries appear sorted, with correct source values.
  - `collectSkillRegistry rejects duplicate commands`: a standard/custom name collision throws an error naming the duplicate.
  - `prepareRuntimeFileContents replaces the generated block and preserves manual notes`: updated generated text replaces old content while text above and below markers remains.
  - `syncSkillRouters creates all runtime files`: `CLAUDE.md`, `.agents/AGENTS.md`, and `.agents/gemini-skills/gemini-master-skill.md` each contain generated markers and the expected routes.
- [ ] Run `pnpm run sync-skills:test` from root. Expected: 4 tests pass.
- [ ] Run `pnpm --dir frontend run test` on Node 22. Expected: all 19 existing tests pass with the same runtime used in CI.
- [ ] Change root `test` script to run, in order, `pnpm --dir frontend run test`, `pnpm --dir backend run test`, and `pnpm run sync-skills:test`, joined with `&&` so the first failure stops the command.

### Task 3: Clear both TypeScript errors

**Files:**

- Modify: `frontend/tsconfig.json`
- Modify: `backend/api/tests/company.analytics.test.ts`

- [ ] Remove `baseUrl` from `frontend/tsconfig.json`; preserve every existing `paths` entry because each target already starts with `./`.
- [ ] In `mockServerModule`, import the `Module` constructor from `node:module`, construct `new Module(modulePath)`, set `loaded = true` and `exports = exportsValue`, then assign that instance to `require.cache[modulePath]`.
- [ ] Run `pnpm --dir frontend run typecheck`. Expected: no TS5101 deprecation error and exit 0.
- [ ] Run `pnpm --dir backend run typecheck`. Expected: no TS2740 error in `company.analytics.test.ts` and exit 0.
- [ ] Run `pnpm --dir backend run typecheck:strict`. Expected: exit 0.
- [ ] Run `pnpm --dir frontend run build`. Expected: production build succeeds with existing Vite alias resolution intact.

### Task 4: Clear the four lint warnings without changing UI output

**Files:**

- Modify: `frontend/modules/company/pages/CompanyManageJobsPage.jsx`
- Modify: `frontend/modules/shared/pages/onboarding/CompanyProfileOnboardingPage.jsx`
- Modify: `frontend/modules/user/components/UserHomeProfileSidebar.jsx`
- Modify: `frontend/modules/user/components/UserLeftSidebar.jsx`

- [ ] Move `STATUS_ICONS` to module scope so `statusMetrics` no longer closes over a new object on each render.
- [ ] Remove redundant `form.country`, `form.customIndustry`, `form.industry`, and `form.location` entries from the `missing` memo dependencies; `isPhilippines`, `finalIndustry`, and `submittedLocation` already represent those source values.
- [ ] Remove unused `userType` from `UserHomeProfileSidebar` props and its call site.
- [ ] Remove unused `completedSegmentCount` and `PROGRESS_SEGMENTS`.
- [ ] Run `pnpm --dir frontend run lint`. Expected: 0 errors and 0 warnings.
- [ ] Run `pnpm --dir frontend run build`. Expected: same route chunks and no build errors.

### Task 5: Make CI run the complete repository gates

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] After install and lint, add `pnpm --dir frontend run typecheck`, `pnpm --dir backend run typecheck`, and `pnpm --dir backend run typecheck:strict` as separate steps so the first compiler error is easy to identify.
- [ ] Keep the build step.
- [ ] Keep `pnpm test`; it now runs frontend, backend, and skill-sync suites.
- [ ] Change the audit step from `pnpm audit --prod --audit-level=high` to `pnpm run audit`; that existing root script audits backend and frontend production manifests.
- [ ] Set CI to Node 22 and keep pnpm 11. The repo pins pnpm 11.0.0, which requires Node 22.13 or newer; Node 20.20.2 fails before pnpm can run.
- [ ] Run `pnpm/action-setup@v4` with exact version `11.0.0` before `actions/setup-node@v5` so pnpm caching can resolve the pnpm store path.

### Task 6: Verify from a clean, socket-capable environment

**Files:**

- No new files. Use the new CI workflow as the final gate.

- [ ] In a clean checkout, run the same three frozen installs as CI: `pnpm install --frozen-lockfile`, `pnpm --dir backend install --frozen-lockfile`, and `pnpm --dir frontend install --frozen-lockfile`.
- [ ] Run `pnpm run security:guard`, `pnpm run sync-skills:test`, frontend typecheck/build/lint, backend standard/strict typechecks, `pnpm test`, and `pnpm run audit`.
- [ ] Confirm the full backend suite passes in GitHub Actions or another host that permits Supertest loopback binds. If `listen EPERM` still appears, record that run as environment-blocked and do not call the backend suite green.
- [ ] Confirm CI reports zero failed tests, zero type errors, zero lint warnings, successful build, and successful backend/frontend high-severity audits.
- [ ] Confirm root and backend lockfile changes match their manifest and override updates; keep the frontend lockfile unchanged.

### Task 7: Clear the production audit blocker discovered during implementation

**Files:** `backend/package.json`, `backend/pnpm-workspace.yaml`, `backend/pnpm-lock.yaml`

- [ ] Refresh the affected backend dependency resolutions and raise the `qs` override to a patched version.
- [ ] Run backend standard and strict typechecks, a frozen install, the full backend suite, and `pnpm run audit` after the lockfile update.
- [ ] Keep frontend's three moderate advisories visible as a later dependency upgrade; the current CI gate rejects high and critical advisories.

### Task 8: Isolate payment test email delivery

**File:** `backend/api/tests/payments.e2e.idempotency.test.ts`

- [ ] Replace the email service with a call-recording test stub before app import.
- [ ] Assert one receipt call with expected recipient, job, amount, and provider across a capture retry.
- [ ] Run the focused payment test and full backend suite without provider delivery attempts.

## Explicit Follow-up Gap

The frontend suite uses source-structure tests; it does not execute the app in a browser. This plan does not add Playwright. After these repository gates are green, decide whether to create a separate browser-smoke plan for public landing, job browsing, and mobile navigation.

## Local Verification Record (2026-11-17)

- Node 22.23.4 and pnpm 11.0.0: root frozen install, `prepare`, and security guard passed.
- `pnpm test`: 71 frontend assertions, 138 backend tests, and 4 skill-sync tests passed; zero failures.
- Frontend lint, typecheck, and production build passed. Backend standard and strict typechecks passed.
- `pnpm run audit` exited 0: backend has zero known advisories; frontend has three moderate advisories below the configured high-severity gate.
- Independent code review found no blocking issue. GitHub Actions itself was not run from this workspace.

## Sources

- TypeScript 6.0 release notes, accessed 2026-11-17: <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>
- TypeScript module-resolution reference, accessed 2026-11-17: <https://www.typescriptlang.org/docs/handbook/modules/reference>
- tsx Node CLI, accessed 2026-11-17: <https://github.com/privatenumber/tsx/blob/master/docs/dev-api/node-cli.md>
- pnpm platform-specific dependency guidance, accessed 2026-11-17: <https://github.com/pnpm/pnpm/blob/main/pnpm/docs/settings/dependency-resolution.md>
