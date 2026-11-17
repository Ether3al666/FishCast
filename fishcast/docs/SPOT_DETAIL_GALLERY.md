# Place detail refresh — 2026-11-17

## Result

Replaced the long boxed detail document with a photographic place page matching the existing dark coastal theme. The title, address and water type precede a large photo gallery. A concise introduction and reference-location link sit beside a compact visit-status card. Coordinates, lookup dates and full source records remain available in native expandable sections. Mobile uses a horizontal thumbnail strip and stacks the visit card above the longer information.

Liangfeng has three verified, source-hosted government photographs from the 2024 competition report. The date and source remain visible below the gallery, and the credit explicitly says photos do not establish current opening. Existing AMap photos are reused for 86 other venues; missing/failed photos use the clearly labeled decorative water fallback. No invented venue photos, live camera claims or permission upgrades were added. Demo records retain their separate text-only presentation.

Photo provenance: `IMAGE_CREDITS.md` and `src/data/spot-gallery.json`.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 55/55 passed.
- `npm run build`: passed. Existing >500 kB bundle warning remains; no new package dependencies.
- `PLAYWRIGHT_CHANNEL=msedge npm run test:e2e`: 26/26 passed, including gallery keyboard selection, all-photo failure, one-photo/no-photo venues, source disclosure, route changes and 375/768/1440 px overflow checks.
- Updated the prior real-spot browser flow to expand the now-collapsed public-source section before accessing its link.
- Initial browser-test startup failed on JSON imports missing Node import attributes. Replaced test data imports with explicit filesystem reads; the full browser suite then passed.
- Live browser verification at `http://127.0.0.1:4176/#/spots/cq-liangfeng`: all three government-source photos loaded with natural width 900 px, thumbnail selection changed the main photo, no page errors, no horizontal overflow at 375 px.
- Desktop and mobile screenshots were inspected: `outputs/fishcast-venue-detail-desktop.jpg` and `outputs/fishcast-venue-detail-mobile.jpg` in the workspace root.

The interaction tests substitute local image bytes only within test routing; live screenshots use original remote photos. Weather is blocked during these focused checks to avoid dependence on the previously diagnosed connection issue. This change does not resolve or alter that weather connectivity limitation.
