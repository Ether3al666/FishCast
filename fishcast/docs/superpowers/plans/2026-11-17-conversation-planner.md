# Conversation planner

User selected Agent-style conversational UI using existing rules and real weather, without a model API.

- Add a pure local intent parser for explicit supported dates, day periods, numeric time ranges, species, methods and radius. Preserve follow-up fields; ask for missing date/time and reject unsupported or ambiguous date/time rather than inventing it.
- Add a conversation component with prompt starters, message history, editable/inspectable trip draft, evidence report, new conversation, weather retry and optional exact-input form.
- Keep all API traffic in existing services. Use existing weather and RuleBasedPlanner; label DEMO, missing/stale/partial weather and lack of verified fishing locations. Never simulate model thought or imply real recommendations.
- Replace the old plan route composition; reset conversations on location/mode changes and invalidate reports when weather changes. Preserve existing field validation through the optional form.
- Test parser follow-ups and rejection cases, weather summaries, conversation UI and old form workflows; run lint, typecheck, unit/browser tests and build; inspect desktop/mobile screenshots.
