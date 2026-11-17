# Status wording cleanup — 2026-11-17

Follow-up: removed the selected-place weather panel's standalone `预报非实测 · 不代表现场安全` caption and `开放安排请咨询场所` banner as requested in the screenshot. Removed their unused styles and icon import. The weather values, source timestamp, refresh control and expandable evidence remain available. Lint, typecheck, build, 60 unit tests and both planner-flow browser tests passed; the updated flow verifies the removed elements are absent.

Removed the user-facing 待核实 / 待确认 / 待核查 wording throughout the homepage, map, place details, planner and source explanations. Removed repetitive UNKNOWN badges from place cards and photo overlays. The map filter/legend uses 资料收录, while the detail card is titled 出行信息 and uses em dashes for unavailable fields. Specific missing data remains clear in the expandable details or a concise instruction to consult the venue.

Only presentation and descriptive strings changed. Source links, timestamps, coordinates, UNKNOWN legal states, prohibition labels, candidate filters and recommendation eligibility remain intact. Historical-image labels and source credits remain visible. Existing tests were updated for the changed display text.

Verification:

- Source search found no remaining 待核实 / 待确认 / 待核查 / 未核实 occurrences in `src`.
- Lint, typecheck and build passed; the existing bundle-size warning remains.
- 55 unit tests and 26 browser tests passed.
- Direct browser checks of `/map`, `/spots/cq-liangfeng`, `/plan` with a submitted request, `/about` and `/` found no old wording, including collapsed text. UNKNOWN card badges were absent.
- Inspected map screenshot: workspace `outputs/fishcast-map-clean-labels.jpg`.
- The long-running port 4176 preview served a stale SpotDetail module without its export, although a fresh test server and production build succeeded. Restarting that preview server restored rendering; all five direct route checks then passed on 4176.
