# Map and planner simplification — 2026-11-17

User request: simplify 地图找点 and 出钓规划, reducing unnecessary small text while keeping the established visual style.

- Removed map section numbers, English headings, duplicate location labels, introductory subtitles, and decorative map-placeholder lettering. Search and filters retain accessible names.
- Moved the map's name-selection list and reference/source explanations into separate disclosures. Kept loading, errors, retry, legal-status legend and demo identification.
- Removed planner prompt numbering, repeated message-speaker labels, keyboard footnote, default-value notes and the read-only coordinate field. Message authors remain accessible; keyboard behavior and exact-plan controls are unchanged.
- Reduced trip statistics to the current candidate count. Total/out-of-range counts and missing-coordinate explanation are available in filter details. Forecast coverage and source timing are available in forecast details. Relevant weather alerts and units stay visible.
- Dates without a time remain explicitly “时段待定” for spot requests; weather requests without a time represent the full day. Unspecified fish/method fields do not occupy the initial draft.
- `SpotCard` compact mode is enabled only by the map. Homepage cards retain their images and content.

Validation: lint and typecheck passed; 135 unit tests and all 36 browser tests passed. Production build passed again after the last decorative CSS cleanup. Existing large JavaScript bundle advisory remains. Live browser checks covered actual map loading, forecast answers, mobile 375 px without horizontal overflow and desktop layouts. Screenshots: workspace outputs/fishcast-map-simplified.jpg and fishcast-plan-simplified.jpg. No publication or deployment.
