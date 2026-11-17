# Coastal editorial restyle

Goal: Apply the supplied dark, turquoise, photographic editorial reference to FishCast's existing static React app.

Design: charcoal surfaces, ivory serif headings, teal accents, full-width photographic hero with transparent navigation, centered introduction, three photographic navigation cards. Keep Chinese product copy, weather, maps, planner, source transparency and explicit DEMO separation. Photographs are decorative overseas coastal imagery, not evidence for Chongqing fishing locations.

Implementation:
- Replace homepage hero in App.tsx with a dedicated HomeIntro component; keep functional sections and handlers.
- Add an editorial stylesheet after existing layout styles, with shared dark tokens for all routes and responsive layouts at 760px.
- Bundle photos locally with attribution in docs; preserve loading/error/empty/DEMO states and keyboard navigation.
- Run lint, typecheck, unit tests, build, existing browser tests at 375/768/1440px; inspect desktop/mobile screenshots and links.

No new runtime dependencies, server, publishing or changes to recommendation logic.
