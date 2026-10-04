# Radius admin delivery gate

Evaluated locally with Playwright on 5 October 2026 WIB. Scope: admin account, independent dashboard, JSON CRUD and image upload. Anti Slop during; ponytail kept native controls and Node standard library, with no added runtime dependencies. Design read: Radius magenta, warm paper, compact operational lists, explicit forms, no marketing top bar. ENERGY 2 / RHYTHM 2 / MOTION 1.

## Hard gate

- PASS R-02: No em dash in admin HTML/JS/CSS copy, checked with rg.
- PASS R-03: All six admin views fit 320, 390, 768, 1000, 1280 and 1440 px; product forms fit every tested width. All five editor kinds were also opened on mobile without dialog overflow.
- PASS R-17: Overview counts products, events, active users and tickets from stored records; queue uses actual pending/paid/processing orders. No revenue forecasts or fabricated deltas.
- PASS R-18: No testimonials or invented customer portraits.
- PASS R-23: Existing Radius logo reused; missing photos explicitly say “Belum ada foto.” User requested image input and admin navigation. QA image uploads use the existing logo only in temporary test data.
- PASS R-24: Six sidebar links render their respective views; website links target `/`; member fallback targets the existing account page.
- PASS R-25: Computed white/magenta 5.34:1, muted/paper 5.32:1, muted/white 6.00:1, muted/sidebar 5.70:1, nav/hover 5.52:1, error text/pink 7.06:1, status text/background 7.21:1. Input borders/white 3.43:1 and borders/paper 3.04:1; focus/paper 4.73:1. Uploaded event photos get a uniform 76% black scrim: worst white pixel becomes #3d3d3d, heading contrast 9.54:1 and secondary text at least 5.84:1.
- PASS R-26: Create/edit/archive/restore, upload/preview/remove, ticket types, roster, ticket issue/status/check-in, order items/status/detail/resi, user forms, search/filter, CSV, mobile menu, close/Escape, retry and sign out execute real behaviors. Recorded click-through below.
- PASS R-27: Initial loading names the operation; server failure offers retry; zero search results shows a useful message. Browser test intercepted admin load failure, retried successfully and exercised no-match state.
- PASS R-28: No FAQ or filler help sections added.
- PASS R-32: Native links/buttons/inputs/dialog; skip link, visible 3px focus, Escape close and opener focus restoration tested. Native dialog traps focus; routing focuses main; pagination restores control focus.
- PASS R-33: Source edits use apply_patch, no generated source-rewrite helper scripts.
- PASS R-34: No theme toggle; warm light operational shell follows Radius identity.
- PASS R-35: Node server running on 4176; successful real admin login confirmed on that port. `npm test` passes both isolated integration suites. `checks/admin.playwright.js` passes 92 checks; member regression passes 59 checks. No uncaught browser errors.
- PASS R-36: README labels local single-process JSON, manual stock/check-in, non-persistent sessions and no real payments/refunds. No production-security or performance claims.
- PASS R-37: Radius palette/logo and separate account/admin UX are user direction; design read and dials recorded before generation and in README.
- PASS R-38: Seed records remain documented presentation fixtures. QA mutations happened in isolated temporary JSON/uploads, not client presentation data; presentation still has 4 products, 3 events and 2 accounts.

## Purpose gate

- PASS R-01: No admin gradients/glows; uploaded poster scrim exists only to guarantee text contrast over arbitrary photos.
- PASS R-04: Admin navigation uses plain text; the close glyph closes the native form. No generic decorative icon library.
- PASS R-06: Existing Space Grotesk maintains Radius type identity; smaller operational hierarchy replaces oversized landing typography. No promotional eyebrow pills.
- PASS R-07: No decorative background grids or graph paper.
- PASS R-08: No decorative arrows on admin controls.
- PASS R-09: Small rectangular badges identify persisted status; no promotional capsules above headings.
- PASS R-10: No admin glassmorphism or backdrop blur.
- PASS R-12: Shadow only raises transient dialog/toast over content, not all records.
- PASS R-13: No glow treatment.
- PASS R-14: Work queue, unboxed summary and event rows have different weights; list rows are uniform because they repeat the same record schema.
- PASS R-19: No template/looping animations; MOTION 1 only uses ordinary hover/focus feedback.
- PASS R-22: No generic illustrations or generated assets.

## Liveliness

- PASS Dials: ENERGY 2 / RHYTHM 2 / MOTION 1 explicitly recorded.
- PASS Dial consistency: Magenta save/issue controls, varied operational composition, steady reading without motion.
- PASS Focal point: Overview prioritizes work queue; lists prioritize searchable records and one create action; forms prioritize save.
- PASS Whitespace: Heading boundary, separate filter row and data region, and sidebar separate navigation from work. Empty queue does not stretch to fill the summary.
- PASS Accent: One Radius magenta accent for primary actions and focus, not every surface.
- PASS Identity motif: Radius wordmark/round logo, warm-paper surfaces and compact Space Grotesk recur across admin and member views.
- PASS Design read: Announced intent before implementation; reasons retained in README.

## Craftsmanship and quality locks

- PASS C-1: Color follows Radius, records use responsive rows for scanning, native dialogs isolate editing; reasons documented.
- PASS C-2: Click-through tests cover controls with persisted changes; non-operational payment/refund/scanner capabilities are explicitly excluded.
- PASS C-3: Queue, event roster, user access and merchandise/order forms serve stated admin tasks; no decorative analytics section.
- PASS C-4: All six pages reflow at 200% text size on 390px; empty/error/retry, mobile menu, modal keyboard and duplicate/quota errors tested.
- PASS C-5: Counts derived from stored data; fixture status disclosed in documentation.
- PASS R-05: Operational queue, secondary summary and event rows replace marketing/card-grid templates.
- PASS R-11: Small control radii, moderate modal radius and round brand logo have distinct roles.
- PASS R-15: Actions name the task: Tambah produk, Terbitkan tiket, Check-in, Arsipkan, Export CSV, Simpan.
- PASS R-16: No AI marketing claims or buzzwords in admin copy.
- PASS R-20: Ticket-type/roster/check-in workflow and Radius palette are product-specific, not a generic metric dashboard.
- PASS R-21: Light admin shell follows requested Radius palette; no forced SaaS dark theme.
- PASS R-29: Paper/white, ink/muted neutral and Radius magenta; no unrelated accent palette.
- PASS R-30: No imported SaaS layout/component library or product imitation.
- PASS R-31: README records reasons for palette, type, sidebar, rows, queue hierarchy and restrained elevation.

## Recorded click-through

- Guest `/admin.html` redirects to sign in; `admin@radius.id` / `admin123` opens admin automatically. Member sees access denied; signup cannot grant itself admin role.
- Products: create with stock/price/photo, invalid format feedback, preview before save, remove and reselect image, edit price, search, filtered CSV download, archive confirmation and restore through edit.
- Events: create with date/venue/poster/price/quota, add/remove ticket type, edit venue, archive/restore and open event participants as a filtered ticket list.
- Tickets: choose member/event/type, issue, reject quota overflow, confirm check-in, edit/cancel/restore status. Server integration also checks concurrent issuance respects capacity and event price edits preserve purchased price.
- Orders: choose member, add/remove lines, quantity and server-calculated total, save address, change status and tracking, open details. Member sees corresponding order and resi; internal notes excluded from member response.
- Users: create with yearly membership/renewal date, edit name, duplicate email error. Backend verifies reset password revokes sessions, disabled users cannot login, and current admin cannot disable/demote itself.
- Search/status/event filters update records; no results shows empty state; CSV creates download from filtered records with formula-safe quoting. Pagination tested with 11 temporary records: next shows page 2, previous returns to page 1, controls disable at boundaries.
- Mobile menu opens, navigation closes it; all route destinations work; modal Cancel/close/Escape closes the editor and restores focus. All five editor kinds fit 320px at a shortened 460px viewport and their save action remains reachable by scrolling.
- Admin data failure offers retry; successful retry restores the list. Sign out revokes cookie session. JSON records and images survive a server restart in isolated integration tests.
- Public catalog reflects new product/event images. Existing logo upload loaded successfully in both card types; event modal displayed the admin-created event and ticket price.

## Prototype boundaries

Single local process only. Stock manually maintained; payment/refund/subscription actions not connected to a gateway; check-in manual rather than QR scan; user profile/renewal choices still browser-local. Uploaded image removal unlinks rather than deleting files. Prisma schema expanded as a migration contract, not installed or used as runtime DB. Production requires DB transactions, HTTPS, persistent sessions, rate limiting and account recovery.
