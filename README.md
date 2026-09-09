# WebNest Studio — Android application

Premium client-facing Android app for [WebNest Studio](https://www.webneststudio.co.in),
built with React Native and wired to the studio's Python **FastAPI** backend.

```
WebNestStudioApp/     React Native 0.87 app (this is what ships)
.reference/frontend/   Production web app — design-system + copy source of truth
.reference/backend/    FastAPI service the app talks to
```

## Product principles

- **Account-gated.** The app opens on **Create account → Verify → Login**. No
  marketing/browse surface is reachable without a session — the whole tab UI
  mounts only after authentication.
- **Ultra-premium, ink + gold.** One design system ported from the website
  (`gold` / `ink` scales, editorial serif display, gradient CTAs, ambient glow).
- **API-first with graceful fallback.** Every content screen calls FastAPI and
  falls back to bundled brand copy (`src/data/content.ts`) when an endpoint is
  empty, so the app never shows a blank state.

## Backend connection

| Concern | Where |
| --- | --- |
| Base URL | `API_BASE_URL` in `WebNestStudioApp/.env` (default: Render deployment) |
| Client + auth refresh + cold-start retry | `src/api/client.ts` |
| Endpoint map | `src/api/webnestApi.ts` → FastAPI `/api/auth`, `/api/home`, `/api/services`, `/api/portfolio`, `/api/blog`, `/api/leads`, `/api/me` |
| Session storage | `react-native-keychain` via `src/api/tokenStore.ts` |

## Run it (USB debugging device)

```bash
cd WebNestStudioApp
npm install                 # first run, or after the linear-gradient dependency was added
npm start                   # Metro
npm run android             # build + install on the connected device
```

`react-native-linear-gradient` is native — the **first** `npm run android` after
this change rebuilds and links it. Until that rebuild the app still runs (flat
gold fallbacks via `src/components/Gradient.tsx`).

Regenerate the launcher icon from the website mark:

```bash
python scripts/gen-launcher-icons.py   # needs Pillow
```

## Quality gates

```bash
npm run lint      # eslint — clean
npx tsc --noEmit  # types — clean
npm test          # jest smoke render
```

---

# Delivery roadmap (₹3,00,000, phased)

Increments ship on an interval cadence; each is independently releasable.

### ✅ Phase 1 — Foundation & luxury shell *(delivered)*
- Account gate: `AuthNavigator` (Signup → VerifyOtp → Login) sealing the app;
  auth state drives the tree swap, splash on boot.
- WebNest launcher icon + Android 8 adaptive icon + dark cold-start window,
  generated from the site's brand mark (`scripts/gen-launcher-icons.py`).
- Design system: full `gold`/`ink` palette, type scale, `Gradient`, `Logo`,
  `Card`, `Badge`, `Chip`, `Divider`, `Stat`, animated gradient `Button`,
  focus-aware `FormInput`, `BrandBackground`, branded `SplashScreen`.
- Rebuilt: auth screens, Home (hero / stats / milestone / services / work /
  process / CTA), new **Our Story** (vision, founder vision, scope, goals),
  Services, Portfolio, Profile, Contact — all on FastAPI with bundled fallback.

### Phase 2 — Client portal depth
- Real project dashboard: milestones, phase timeline, % complete, activity feed.
- File deliverables list + in-app preview/download (`/api/me/files`).
- Push notifications for status changes (FCM) + notification centre.
- Biometric unlock (Face/Touch) on top of the keychain session.

### Phase 3 — Engagement & content
- Rich blog (markdown rendering, images, share), FAQ screen (`/api/faqs`).
- Testimonials + case-study galleries on Portfolio detail.
- In-app lead chat / WhatsApp handoff with context.
- Skeleton shimmer, shared-element transitions, haptics pass.

### Phase 4 — Platform parity
- Coding playground (read-only snippet viewer → editor) mirroring the web tool.
- AI page-builder chat entry point.
- Admin-lite: leads inbox + project-status editing for `role === 'admin'`.

### Phase 5 — Polish, store, hardening
- Custom brand fonts (Poppins / Playfair) via `react-native-asset`.
- Native splash (`react-native-bootsplash`), true blur glow.
- Play Store: signing config, Proguard, screenshots, listing, staged rollout.
- Crash/analytics (Sentry + analytics), E2E (Detox), accessibility audit.

### Ongoing (every interval)
- Dependency + RN upgrades, security review of the FastAPI surface, perf budget,
  content sync with the website, design-system versioning.
