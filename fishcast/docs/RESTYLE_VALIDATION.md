# Coastal editorial restyle — 2026-11-17

Implemented the supplied visual reference using a charcoal/teal theme, photographic hero, serif typography, centered introduction and three working navigation cards. All existing routes share the theme; core weather, evidence, DEMO and planner logic remains unchanged.

Validation:
- `npm run lint`, `npm run typecheck`, `npm test` (34 tests), `npm run build`: passed.
- Playwright using Edge: 13 tests passed, including 375/768/1440px route overflow checks, weather errors/cache, DEMO isolation, filtering, planner, keyboard skip link and map SDK lifecycle.
- Map tests require process-only `VITE_AMAP_KEY=test-placeholder` and `VITE_AMAP_SECURITY_JS_CODE=test-placeholder`; requests are intercepted by the existing fake SDK. Initial run without these values correctly showed the unconfigured map state and failed the three SDK tests. No real credentials were created or saved.
- Checked desktop/mobile screenshots, decorative image decoding, weather-card focus/scroll and both route-card destinations. Reduced-motion preference is respected.
- Screenshots under `docs/evidence` explicitly label API-failure and DEMO states. These are visual test evidence, not live weather data.
- Photo source links are in `IMAGE_CREDITS.md`. No new runtime dependency or publication.

## Lower-homepage refinement

Extended the editorial composition to the weather panel, readiness status, candidate empty state, environmental note, location controls and footer. Removed dashboard-like panel borders, increased type scale and spacing, added decorative photographic surfaces and a split image/text empty state. Changes are scoped to `.is-home`; other routes retain their existing layouts.

Re-ran lint, typecheck, 34 unit tests, production build and all 13 browser tests successfully. Additionally checked today/tomorrow switching, DEMO exit and desktop/mobile screenshots of the modified sections. Photo backgrounds are decorative and all legal/data statuses remain text.

## Functional acceptance — 2026-11-17

Fixed route transitions retaining homepage scroll position; a new browser regression failed before the fix (scrollY=582) and passes after resetting scroll on pathname changes. Latest checks: lint/typecheck/build, 34 unit tests and 14 browser tests pass.

An independent Edge session also verified live Open-Meteo today/tomorrow values and refresh (HTTP 200), synthetic geolocation success and city reset, planner form validation, empty filters, DEMO reload isolation, homepage links and mobile navigation. No pageerror captured. Initial live weather and Node direct transport timed out; subsequent Edge live check succeeded. Real AMap remains unconfigured; the real seed database remains empty and recommendation scoring remains unimplemented.

### AMap configuration follow-up — 2026-11-17 10:25 CST

The user supplied the Web JS API Key and security code in the ignored `.env.development.local`. Verified the running development preview recognizes the configuration. With no SDK interception, the actual AMap SDK and Chongqing base map loaded; desktop and mobile screenshots visibly contain streets, place labels and AMap attribution. Verified DEMO marker selection, prohibited-only filtering, selection clearing and removal of all fictional markers on exit. Wheel input and return-to-Chongqing completed. Some requests were cancelled/failed during interaction, but map readiness and visible tiles succeeded and no recognized authentication error codes were observed.

The credential file is ignored and untracked; no credential values are included in evidence. This is development configuration. Production still requires the security proxy configured by this project's production gate. The real fishing-location seed remains empty.
