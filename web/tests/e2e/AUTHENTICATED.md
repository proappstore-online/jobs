# Authenticated deployed smoke test

Run `pnpm --filter @jobs/web test:e2e` with `E2E_BASE_URL` set to the deployed HTTPS origin and a legitimately provisioned `E2E_SESSION_TOKEN` (or `PAS_E2E_SESSION_TOKEN` fallback). The reusable deploy workflow supplies these after the platform grant is provisioned.

Global setup installs the real token as the platform's secure HttpOnly `__Host-pas_session` cookie, verifies `/.pas/auth/me`, and saves temporary storage state outside the checkout. Only `authenticated.spec.ts` loads that state. Setup removes it after the run, including on validation failures. Traces, video and screenshots are disabled for the authenticated test to avoid capturing credentials or private saved listings.

The test reads the real saved-jobs action and verifies authenticated navigation before and after reload, without route mocks or test-created vacancies/applications. Existing mocked specs remain isolated. Without a token the authenticated test is skipped; a supplied but invalid token or missing HTTPS deployment target fails setup.

This adds code infrastructure for issue #9. It does not provision the platform grant or establish a live pass. Full deployed marketplace and role acceptance in DEPLOYED_ACCEPTANCE.md remains required.
