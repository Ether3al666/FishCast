# Conversation planner — 2026-11-17

User-approved scope: Agent-style UI using existing local rules and real weather. No model API or new credentials.

Implemented a conversational planner with starter prompts, multi-turn condition collection, a visible trip draft, current-weather summaries, evidence cards, reset and recheck actions. The existing precise form remains available under a disclosure. The bounded parser explicitly rejects unsupported/ambiguous input; it is labeled as a local rule assistant. Existing DEMO separation and the no-recommendation safety gate remain intact.

Validation:
- ESLint, TypeScript, production build: passed.
- Unit tests: 41 passed, including 7 conversation parser/weather tests.
- Edge Playwright: 17 passed, including three new conversational flow/mobile/input-method tests and updated precise-form regression coverage.
- Independent Edge check against the development server successfully loaded real Open-Meteo weather, generated a dated hourly summary, and invalidated the report when weather refresh began. No page errors observed.
- Inspected desktop welcome, populated conversation and mobile screenshots; mobile horizontal overflow check passed.

Limits: local grammar only, no arbitrary conversation or AI inference. Chat lives in the current page. Dates and time windows use Beijing time. Radius/fish/method are stored as requirements but do not enable matching or scoring. Real seed data remains empty; the assistant does not invent fishing locations or success rates. Screenshots are point-in-time evidence, not a weather guarantee.
