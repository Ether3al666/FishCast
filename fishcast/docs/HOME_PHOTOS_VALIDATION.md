# Homepage location photos — 2026-11-17

- Replaced the six homepage question-mark icons with venue thumbnails, preserving the title links and expandable source information.
- Reused matched venue galleries and AMap photos. Added the sourced historical 荷韵园 photo documented in IMAGE_CREDITS.md. Four venues have matched photos; 笋河水乡 and 东风村 use the explicitly marked decorative fallback.
- Failed photos advance through the same venue's available images before falling back. The source caption follows the displayed image. Existing map cards do not gain duplicate thumbnails.
- Lint, typecheck and 135 unit tests passed. Production build passed again after the new gallery entry. All 36 Playwright tests passed, including new homepage photo/error/link coverage. Formatting and git diff whitespace checks passed.
- Live browser check confirmed all six image elements loaded, including the new remote 荷韵园 photo. Checked the mobile layout at 375 px; automated homepage overflow checks covered 320, 375 and 1440 px. Desktop screenshot saved to the workspace outputs as fishcast-home-place-photos.jpg.
- The existing production JavaScript chunk-size advisory remains. No publication or deployment was performed.
