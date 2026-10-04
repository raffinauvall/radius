# Radius account dashboard review

Evaluated locally with Playwright, 4 October 2026. Antislop during; direction is the user's Radius brand reference, magenta identity and account-first UX. ENERGY 2 / RHYTHM 2 / MOTION 1.

## Hard gate

- PASS R-02: No em dash in the changed dashboard text.
- PASS R-03: All five account views have zero horizontal overflow at 320, 390, 768, 960, 1280 and 1440 px, including an 80-character profile name. Primary controls have 44 px minimum touch height.
- PASS R-17, R-18, R-23, R-36, R-38: User explicitly requested a JSON-backed demo and removal of demo banners. Records are demo fixtures documented in README, not production/customer claims. No testimonials, generated portraits, fake trend deltas or fabricated QR codes were added. The logo is the existing user-approved asset; avatars use initials.
- PASS R-24: Account navigation has five working hash views. Events/shop links target existing landing sections; home links return to Radius.
- PASS R-25: Computed white/magenta contrast 5.34:1; muted text/warm paper 5.32:1; muted text/white 6.00:1; badge text/background 7.21:1; nav text/sidebar 6.35:1; white/selected nav 17.56:1. Input boundary/white is 3.43:1.
- PASS R-26: Ticket and order details open; dialog close controls and Escape work; print invokes browser print; filters alter the visible ticket list; profile submission saves per email; renewal requires confirmation; retry loads JSON; logout clears session.
- PASS R-27: Account loading names what is loading; failed fetch shows retry; empty ticket and order states give a next action. Failure/retry and empty states were exercised with intercepted local JSON responses.
- PASS R-28: No filler FAQ in the account dashboard.
- PASS R-32: Native links/buttons/inputs, visible focus, skip link, native modal focus trapping, Escape close, opener focus restored. Route changes focus main content; renewal confirmation restores focus to its control.
- PASS R-33: Source changes made directly with apply_patch; no source-rewrite helper scripts.
- PASS R-34: No theme toggle is shipped. Warm light surfaces follow the established Radius palette and keep ticket information readable.
- PASS R-35: Served locally and checked in the browser. Runnable click-through: `checks/account-dashboard.playwright.js`, 59 checks passed, no uncaught browser errors. Login feedback is now 16 px/600 weight in a bordered error box, contrast 7.06:1. Print dialog invocation was intercepted for testing, not a physical print test. `npm test` also verifies JSON authentication and signup using isolated data.
- PASS R-37: Radius logo/palette and separate customer dashboard are explicit user direction. Design rationale is recorded in README.

## Purpose gate

- PASS R-01, R-07, R-10, R-13: No gradients, background grids, blur or glow in the account shell.
- PASS R-04: Account icons identify views; bag identifies orders, ticket identifies tickets, person identifies profile. No decorative AI marks or new icon dependency.
- PASS R-06: Existing Space Grotesk preserves Radius typography; smaller scale improves scanning account information. Date hierarchy reflects the user's event-ticketing product.
- PASS R-08, R-09: No decorative arrows or promotional eyebrow pills. Badges indicate actual fixture ticket/order/membership states.
- PASS R-12, R-14: Shadows only elevate transient dialog/toast. Ticket pass, unboxed schedule and narrow account summary have different visual weights for different tasks.
- PASS R-19, R-22: Only hover/pressed feedback, no looping motion or decorative illustrations.

## Liveliness

- PASS: ENERGY 2 comes from Radius's magenta date stub; RHYTHM 2 separates the ticket pass, schedule and account summary; MOTION 1 keeps reading steady.
- PASS: Opening the nearest ticket is the overview's focal point; its magenta action and date stub repeat the event identity. No chart, KPI cards or duplicate ticket preview compete with it.
- PASS: Spacing separates immediate event tasks from membership/order administration. Mobile stacks the same information, tablet combines summaries, desktop uses a narrow secondary rail.

## Craftsmanship and quality locks

- PASS C-1, C-3, R-05, R-20, R-31: Overview supports opening a ticket, checking an order and managing membership; major layout/color/type decisions are recorded in README. Marketing copy and decorative metrics were removed.
- PASS C-2, C-4, R-11: Controls were clicked in a separate browser context; small control radii, ticket corners and circular initials have distinct roles. Dialogs fit narrow screens and lock background scrolling.
- PASS C-5, R-15, R-16: CTAs name their actions. Fixture origin is documented, without invented production/security/performance claims.
- PASS R-21, R-29, R-30: Light paper, black text, magenta accent follow Radius, not a borrowed SaaS product. No forced dark theme or extra palette.

## Recorded click-through

- Guest account access → sign in; signup → duplicate email feedback; wrong password → rejected; correct JSON account credentials → overview without landing/top toolbar.
- Buka tiket → ticket details; Cetak detail tiket → browser print call; Escape → close and restore opener focus.
- My tickets → all/upcoming/attended results; each category selects its control.
- My orders → list; Detail order → product, quantity and total; close → list.
- Membership → benefits and plan; cancel confirmation → unchanged; confirm renewal change → settings and overview agree.
- Profile → whitespace name rejected; valid name/phone → saved; reload → persisted. Long name → no page overflow.
- Mobile Menu akun → open/close; all five menu links → correct view; Sign out → sign in and revoked server session. A fabricated localStorage session is rejected.
- Failed JSON request → error; Coba lagi → loaded account; empty JSON ticket/order arrays → empty states and event/shop links.
- Main overview links → tickets/membership/orders views; event/shop/home destinations verified against the landing page's section IDs and files.

JSON authentication was added for the requested presentation account, `peter@gmail.com` / Andreas Peterang / password `123`. Password is stored as a salted scrypt hash outside the public directory; server-issued HttpOnly cookies carry sessions. Signup persists new accounts to JSON with empty histories. Production hardening (HTTPS, rate limiting, account recovery, persistent sessions and DB) remains out of scope.

Remaining prototype limitations: initial dashboard transactions are fixture JSON, now editable through admin; profile/renewal settings are browser-local; ticket print is detail-only, not QR check-in. Admin check-in is manual. No real subscriptions, cancellations or payments are processed.
