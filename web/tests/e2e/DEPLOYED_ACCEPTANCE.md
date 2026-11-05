# Deployed acceptance scenario specification

These human/owner scenarios cover platform-owned behavior that the mocked Playwright specs cannot prove. They are not executable tests and do not contribute to pass counts. The separate `test:release` command provides unmocked read-only public checks.

Prerequisites: record full pushed SHA/environment; platform admin restores the keyless QA session grant; use authorized owner, granted moderator, ordinary user, candidate A/B and employer A/B sessions. App roles and company ownership are distinct. Use only approved real vacancies through normal employer posting. Obtain approval for applications, status changes, closure and cleanup. Missing access, approval or supply means BLOCKED, not PASS. Never copy session tokens or fabricate production vacancies. Redact contact data in evidence.

Run each applicable journey on desktop (1280px) and mobile (390px), recording actual results, timestamp, actor role, workflow links and redacted readback.

## Deployment, schema and assets

1. Record successful deploy and E2E workflow URLs and full SHA. Compare `/release.json` to that SHA; reject `local` or another revision. Session minting alone is not a browser pass.
2. In the authorized owner session verify migration `0005_application_contact` and registered actions/roles/operator_view match the committed manifest; confirm legacy contact remains null.
3. Run `test:release` with the approved active listing inputs in `docs/RELEASE_CHECKLIST.md`. Retain desktop/mobile results and failure traces. Verify built-asset tests from the same release also passed.

## Signed-out discovery and edge states

1. In a fresh signed-out context search the approved vacancy by keyword/location and exercise work-mode/employment filters. Open exact job and company. Confirm public responses/UI contain no candidate contact, application notes, owner IDs or private applications.
2. Search nonexistent keyword/location for the empty state. Open an approved closed/missing job for unavailable state and no Apply controls.
3. In controlled QA or using browser request blocking, verify read-error/retry UI for discovery, job/company detail, employer and application reads. Record simulated transport failures as UI evidence, not production backend failure evidence. Never disrupt production to create errors.

## Real sign-in, candidate application and privacy

1. Signed out, select Save on the intended real job. Complete actual PAS sign-in; verify return, saved state and Saved Jobs readback. Repeat Apply intent in a fresh context: return opens review without submitting automatically.
2. Candidate A supplies approved name/contact/message and submits once. Verify persisted details and applied status. Repeat via an authorized registered-action call: expect zero application/notification inserts, exactly one application and one employer notification on readback.
3. Candidate B requests application status/list in B's own session: no A contact/message/private row. Confirm B cannot withdraw A's application. Client-supplied identity is not authentication.
4. After employer changes status, A sees it and original contact/message. Withdraw with confirmation; verify absence in candidate/employer readback. Complete duplicate/count checks before withdrawal.
5. For an approved external vacancy, signed-out Apply requires auth; authenticated Apply opens the verified source URL without a native application or success claim.

## Employer lifecycle and isolation

1. Employer A registers/edits an approved real company, posts/edits a real vacancy and reloads to verify persistence. Exercise required fields, salary bounds and optional clearing without publishing invalid data.
2. A reviews contact/message and changes status; verify candidate readback. Employer B requests A's private listing/applicants and attempts company/job/status mutations in B's session: expect denial/empty rows or zero changes, no persisted mutation and no private data.
3. With approval, A closes the vacancy. Verify dashboard closed status, public exclusion, and retained applicant review. Candidate B submits to the closed job: neither application nor notification inserted. Recheck the earlier counts before withdrawal/cleanup.

## Operator admission, close and audit

1. Owner and explicitly granted moderator each open Jobs in PAS Creator Console. Verify search/paging/detail for companies/jobs and absence of candidate contact/message/private identities.
2. Ordinary user attempts admission and every `op_*` action directly: platform authorization denial, no mutation. A hidden tab alone is insufficient evidence.
3. On a vacancy approved for closure, close with `from_status: active`: one changed row, persisted closed status and public exclusion. Replay and send stale/missing-target requests: zero changes, no unrelated mutation.
4. Read platform audit records under the authorized session; verify actor/action/target/result/time for permitted, denied and stale attempts according to platform audit semantics. SQL tests do not prove audit emission.

## Supply and sign-off

For each vacancy attach source, owner approval/date, job/company IDs, active status and external-link check/time when applicable. Verify active supply remains after testing any closes. If unavailable, launch stays BLOCKED. Record every scenario's evidence or blocker in the checklist. Administrative closure of #8 is not launch approval.
