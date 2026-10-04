# Radius DB-only delivery gate

Checked 5 October 2026 WIB. User requested PostgreSQL for every backend interaction and removal of JSON data. Anti Slop during kept the existing Radius account/admin design (ENERGY 2 / RHYTHM 2 / MOTION 1). UI/Human required visible save/failure feedback; Ponytail removed file storage rather than keeping a second backend.

## Evidence

- `npm run build`: Prisma generation and migration deploy succeed against configured Neon. Existing migration remains applied; seed preserves data.
- `RADIUS_TEST_DATABASE_URL=... npm test`: 4 tests pass, 0 skipped. Authentication/admin/cross-instance suites use isolated local PostgreSQL schemas. Missing-DB test verifies startup cannot fall back to files.
- Playwright: account 65 checks, admin 93 checks, QR 52 checks, all pass. Profile/renewal failure paths and fresh-browser persistence are included; no browser exceptions.
- Neon smoke test without JSON data files: member/admin login and dashboard return 200; catalog returns 200 with 4 products, 3 events and 3 membership plans. Smoke test signs out without changing tickets or orders.
- Before/after seed digests confirm existing accounts and operations unchanged. Membership configuration is added only if missing. Cross-instance test changes a plan price in the test DB and verifies both public catalog and member API reflect it; seed preserves that custom price.
- Profile name/WhatsApp and renewal preference persist across server restart and separate browser context. Invalid/unauthenticated updates reject; profile updates cannot change email or grant admin role; free members cannot cancel a paid renewal.
- Existing concurrent quota/check-in tests still accept exactly one request and reject the duplicate. Uploaded image bytes and sessions survive restart; password reset/signout revoke access across instances.
- `npm audit --omit=dev`: 0 vulnerabilities. `git diff --check`: clean.
- Seven data JSON files removed: local accounts/operations, operations seed, customer fixture, public events/products/membership. Backup: `/tmp/radius-json-backup-VtHmrW`. Initial DB/test records now use JS seed modules; runtime requests never load seed modules. Package/config JSON and HTTP JSON encoding are not data-file storage.

## Hard gate

- PASS R-02: New documentation and membership seed contain no em dash; source search checked.
- PASS R-03: Account, admin and QR regressions cover narrow/mobile/desktop layouts and 200% text; CSS unchanged.
- PASS R-17: Counts derive from DB records, not fixture counters in the removed customer file.
- PASS R-18: No testimonials or portraits added.
- PASS R-23: No assets or navigation created; test uploads reuse existing logo in an isolated schema.
- PASS R-24: Existing account/admin routes and landing links retained; browser route checks pass.
- PASS R-25: No color/style changes; previous dashboard/admin contrast measurements still apply to status messages and controls.
- PASS R-26: Profile and renewal now await DB response before success; admin forms, upload, download and scan tests pass.
- PASS R-27: Profile/renewal save failure gives retry feedback without changing DB; loading, empty, API error and retry checks pass.
- PASS R-28: No FAQ added.
- PASS R-32: Native controls and dialogs retained; Escape, opener focus, mobile menu and visible focus checks pass.
- PASS R-33: Source edits use apply_patch; no UI source-rewrite helper script introduced.
- PASS R-34: No theme changes.
- PASS R-35: Build, 4 tests, 210 browser checks and Neon read/login smoke test executed; click-through recorded below.
- PASS R-36: README explicitly states JSONB is a DB column, normalized CRUD remains future work, and billing is not connected.
- PASS R-37: Existing Radius magenta/paper/type direction retained; no redesign.
- PASS R-38: JS records remain documented initial demo seeds, not claimed real purchases or attendees.

## Purpose gate

- PASS R-01: No gradient/glow changes.
- PASS R-04: Existing view icons retained; no new icon set.
- PASS R-06: Existing Space Grotesk retained for Radius continuity and compact account information.
- PASS R-07: No background patterns added.
- PASS R-08: No decorative arrows added.
- PASS R-09: Status badges still identify DB-derived state; no promotional badges.
- PASS R-10: No glass/blur changes.
- PASS R-12: Existing dialog elevation retained; no new shadows.
- PASS R-13: No glow added.
- PASS R-14: Nearest-ticket focus and admin operational lists retain their different task priorities.
- PASS R-19: No animation added; scanner camera cleanup still passes.
- PASS R-22: No illustrations added.

## Liveliness

- PASS Dials: ENERGY 2 / RHYTHM 2 / MOTION 1 retained.
- PASS Consistency: Existing magenta actions, operational hierarchy and steady interaction remain; no CSS changes.
- PASS Focal point: Nearest ticket for members and work queue for admins unchanged.
- PASS Whitespace: Existing responsive composition retained; overflow checks pass.
- PASS Accent: Radius magenta unchanged.
- PASS Motif: Existing logo, paper surfaces and Space Grotesk unchanged.
- PASS Design read: Scope was persistence and behavior, preserving the user-directed account/admin interface.

## Craftsmanship and quality locks

- PASS C-1: A single DB path eliminates divergent file/session/upload behavior.
- PASS C-2: Save buttons await DB writes; failure permits retry and does not announce success.
- PASS C-3: No sections added solely for decoration.
- PASS C-4: Save failure, empty/error/retry, mobile, text resize and dialog focus checks pass.
- PASS C-5: Counts cite executed checks; physical camera and real billing limitations remain explicit.
- PASS R-05: Existing task hierarchy retained, no generic dashboard template added.
- PASS R-11: Existing control/modal/logo radius variation retained.
- PASS R-15: Existing save, ticket, scan and retry actions remain specific and work.
- PASS R-16: Documentation describes storage behavior without marketing claims.
- PASS R-20: Radius roster/ticket/merch tasks and identity retained.
- PASS R-21: No theme changes.
- PASS R-29: Palette unchanged.
- PASS R-30: No external layout/component library added.
- PASS R-31: Existing visual rationale retained; DB-only purpose and storage ceiling documented.

## Recorded click-through

- Login/signup: guest redirect; wrong password and duplicate email errors; correct member/admin routes; logout revokes access; fabricated localStorage session rejects.
- Account: ticket/order dialogs, print invocation, ticket filters, mobile menu, API retry and empty-state links work. Profile blank-name validation works; successful save survives reload and another browser context. Failed save shows feedback, keeps DB unchanged and enables retry.
- Membership: cancelling confirmation changes nothing; confirming saves DB preference; overview reflects it; another browser context reads it. Failed save keeps confirmation open and DB preference unchanged.
- Admin: product create/edit/archive/restore/search/CSV; image invalid-format/preview/remove/save; event poster and ticket types; user create/edit/duplicate feedback; roster, issuance and quota feedback; order lines/total/tracking; member sees corresponding tickets/orders; error/retry and logout work.
- QR: actual PNG download decodes; correct participant uses the current DB name; wrong event/cancelled/reused QR rejects; manual fallback works; original admission timestamp persists; used ticket loses active QR. Simulated video scan and camera stop/close/permission-denial alternatives pass.

No physical camera test or real payment/subscription processing. Initial seed modules still exist for first DB setup and tests, not serving runtime data. Old browser-local profile/renewal values are no longer authoritative or read. Public push/deployment remains pending the earlier credential-publication choice; local and Neon checks are not a Vercel availability claim.
