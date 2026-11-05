# Public discovery

Issue #5 uses the existing PAS public-query contract, verified against the
[current action documentation](https://docs.proappstore.online/mcp-app-tools/)
and installed SDK on 2026-11-06. Public actions declare `requires_auth: false`,
use query operations, named output columns and a literal limit at most 500,
and have no caller identity placeholders or role metadata. The SDK's
`app.actions.callPublic` sends these requests without invoking the authenticated
fetch or redirect-on-401 path. Platform-cookie authentication uses the host's
`/.pas/auth` endpoints for personal actions; public discovery needs no session
or browser-side migration.

The platform's `approved_unscoped` review policy applies to authenticated,
caller-unscoped actions open to every signed-in user. It explicitly excludes
public actions. The nine existing discovery actions already declare the public
contract. Their SQL and location column names remain unchanged; no reviewer
approvals are asserted. `pas check` reports no open unscoped actions.

`jobs.location`, `jobs.location_type`, and `companies.location` describe an
advertised workplace or company's published location, not a candidate's home
or current position. Employers should enter only information intended for the
public listing. Public projections exclude `posted_by`, `owner_user_id`,
application notes, candidate names, email addresses, notifications and saves.
Owner editing reads and all candidate actions still require authentication and
SQL ownership/caller checks. This distinction is specific to these listing
fields and does not permit exposing user location data.

Browse, job and company pages work signed out. Save and apply initiate PAS
sign-in and retain the job/action in session storage. After authentication,
save resumes and apply opens a review form without submitting it. External
applications require sign-in too, then offer an explicit Apply click to open
the employer site. Malformed intents are discarded. Unavailable or failed job
reads remove application controls, including after navigating from an open job.

Validation: SQL tests enforce public projections and private action boundaries;
Playwright tests exercise mobile/desktop discovery, empty/error/unavailable
states, OAuth requests and return intents, and private routes with mocked PAS
responses. These browser tests do not prove live identity-provider consent or
production registration; deployment results must be checked separately.
