# Ticket QR and check-in review

Scope: member ticket dialog, PNG export, admin scanner, server one-use check-in and migration fields. Anti Slop active during implementation, following the user's session choice.

Design read: keep the existing Radius member/admin workspaces. The QR is the focal point for attendees; event selection and scanner feedback are the focal points for staff. ENERGY 2 / RHYTHM 2 / MOTION 1. Magenta marks the primary action; black/white QR with a quiet zone prioritizes decoding. Space Grotesk, warm paper and native dialogs retain the established Radius identity. No decorative cards, charts or new navigation. The QR is the functional asset explicitly requested by the user, not invented artwork.

## Verification

- `npm test`: both backend suites pass, including concurrent scans yielding exactly one 200 and one 409, rejected status resets and replay rejection after restart.
- `checks/ticket-qr.playwright.js`: 52 checks pass on isolated port 4177.
- `checks/account-dashboard.playwright.js`: all 59 existing account checks pass on a clean fixture.
- `checks/admin.playwright.js`: all 93 admin checks pass, including the updated consumed-ticket detail.
- Presentation port 4176: Peter's real QR displayed and PNG downloaded; the original presentation ticket was not consumed by testing.
- Physical camera hardware is not tested. The camera decoder was exercised using an emulated video stream. Permission denial, track cleanup and next-scan behavior were exercised in the browser.
- One-use writes are serialized within one Node process. Multi-instance hosting requires a database conditional update/transaction. JSON is not claimed to coordinate multiple processes.

## Recorded click-through

- Member Detail tiket: authenticated owned ticket opens; actual QR loads.
- Download tiket (PNG): actual PNG downloads with ticket-code filename; ZXing decodes that exact download.
- Cetak tiket: existing account regression verifies browser print is invoked.
- Ticket dialog close / Escape: closes and restores opener focus; checked at 320/390/768/1440px.
- QR failure: inline error and Muat ulang tiket; retry loads the QR.
- Scan barcode: opens independent admin dialog.
- Event select: required before camera; wrong-event QR rejected without consuming ticket.
- Mulai kamera: emulated camera stream decodes the real QR and submits check-in.
- Hentikan kamera: releases active preview and video tracks.
- Scan peserta berikutnya: enables an intentional next scan after result.
- Baca dari gambar QR: downloaded PNG checks in its participant; same PNG replay rejected.
- Image without QR: useful decoding error, no admission.
- Kode tiket / Check-in dengan kode: admission succeeds once; second submission rejected.
- Cancelled PNG: previously downloaded ticket rejected after cancellation.
- Tutup scanner / Escape: closes, stops active tracks, restores focus.
- Permission denial: explains image/code alternatives without browser exceptions.
- Consumed-ticket detail: no QR/download and no status-reset control; backend also rejects resets.
- Existing account/admin controls: recorded individually in the runnable regression checks and previous review reports.

## Anti Slop delivery gate

Each PASS applies to this change, retaining the existing dashboard direction.

### Hard gate

- PASS R-02: new interface text contains no em dashes; concrete Indonesian task copy.
- PASS R-03: ticket/scanner fit 320, 390, 768 and 1440px with no document/dialog horizontal overflow; 200% text reflows.
- PASS R-17: no invented statistics; admission state and timestamp come from server data.
- PASS R-18: no testimonials or invented people added.
- PASS R-23: functional QR/download explicitly requested; existing logo/navigation retained.
- PASS R-24: existing account/admin routes retained; no ghost navigation added.
- PASS R-25: black/white QR 21:1; magenta #D10568 on white approximately 5.3:1; error #A30550 on #FFF0F5 approximately 7:1. Existing muted body text retained on white/paper.
- PASS R-26: new buttons, event select, file input and manual form produce the recorded actions above.
- PASS R-27: QR loading/error/retry, used/cancelled states, scanner loading/success/duplicate/permission and no-active-event states are implemented.
- PASS R-28: no FAQ or unrelated content added.
- PASS R-32: native dialog keyboard behavior, Escape, visible focus styles, labeled controls and live feedback retained; opener focus verified.
- PASS R-33: source edits made directly through apply_patch; no external source-rewrite script.
- PASS R-34: no theme toggle introduced; existing light workspace retained.
- PASS R-35: running local server, 204 browser checks and backend suites; click-through recorded above.
- PASS R-36: one-use and concurrency claims tested; single-process limitation and physical-camera test boundary explicitly stated.
- PASS R-37: existing Radius brand/dashboard direction declared before building, with the user's during-mode preference.
- PASS R-38: no fabricated feature or statistic; demo seed content is identified as fixture data in README.

### Purpose gate

- PASS R-01: no gradients/glows added to operational screens.
- PASS R-04: no generic decorative icons added; native close control retained.
- PASS R-06: Space Grotesk inherited to keep Radius typography; no display monospace or tracked headings added.
- PASS R-07: no decorative grid/dot background; QR modules encode the requested token.
- PASS R-08: no decorative arrows added to controls.
- PASS R-09: ticket status badge communicates actual VALID/ATTENDED/CANCELLED state, not promotion.
- PASS R-10: no glass effects added.
- PASS R-12: only existing dialog elevation; no blanket component shadows.
- PASS R-13: no glow added.
- PASS R-14: QR area, metadata and scanner form have task-specific layouts, not repeated feature cards.
- PASS R-19: no template animations; camera starts only when requested.
- PASS R-22: no generic illustrations added.

### Liveliness

- PASS dials: ENERGY 2 / RHYTHM 2 / MOTION 1 explicitly declared above.
- PASS consistency: restrained action color, distinct QR/form/metadata hierarchy, no automatic animation.
- PASS focal point: large QR for participant; event and admission feedback for staff.
- PASS whitespace: QR quiet zone and separated input groups serve scanning and reading.
- PASS accent: Radius magenta is the deliberate action/status accent.
- PASS identity: same Radius type, paper and magenta date/status motifs as the workspaces.
- PASS design read: existing Radius dashboard direction stated before generation.

### Craftsmanship and quality locks

- PASS C-1: QR quiet zone, action accent, native dialog and spacing each have the functional reasons above.
- PASS C-2: every new control exercised; server rejects replay independently of UI.
- PASS C-3: only ticket presentation, export, admission and fallback sections added.
- PASS C-4: mobile, text resize, loading/error/retry, invalid images, keyboard close and camera-permission states exercised.
- PASS C-5: no fabricated customer/security claims; limitations stated explicitly.
- PASS R-05: task-specific ticket/scanner UI, not hero/cards or decorative metrics.
- PASS R-11: existing radius scale retained; inputs/buttons/dialog are not uniformly pill-shaped.
- PASS R-15: task labels such as Download tiket, Mulai kamera and Check-in dengan kode name the action.
- PASS R-16: no AI marketing buzzwords in new interface text.
- PASS R-20: Radius magenta, typography and ticket motif retained; no replacement dashboard template.
- PASS R-21: existing light workspace remains; no forced dark theme or deferred requested toggle.
- PASS R-29: inherited paper/ink/magenta palette; plain white QR improves decoding.
- PASS R-30: no imitation of an unrelated SaaS dashboard.
- PASS R-31: major visual decisions and their one-line reasons are recorded in the design read.

## Public repository boundary

Runtime accounts, password hashes, ticket tokens, uploads, environment files and local browser screenshots are ignored by Git. The public seed contains only the existing presentation fixture without tokens. `npm run setup` creates fresh local hashes and preserves existing runtime JSON. Known demo credentials in README/setup are intentionally local-only, not production secrets. Publishing source does not deploy a public live server.
