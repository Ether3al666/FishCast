# Coastal visual assets

Downloaded 2026-11-17 from Unsplash, bundled locally for dependable rendering. Used as decorative coastal imagery only, not as Chongqing location evidence.

- `public/images/coast.jpg`: Silas Baisch, https://unsplash.com/photos/aerial-photography-of-sea-Szcw9x0u_G8
- `public/images/water.jpg`: Willian Justen de Vasconcellos, https://unsplash.com/photos/waves-on-body-of-water-hKwBa0Gltuk
- `public/images/shore.jpg`: https://unsplash.com/photos/a-view-of-the-ocean-from-a-cliff-Ld5VNYr7JjQ

License: https://unsplash.com/license

No imagery from the user's screenshot is redistributed. That screenshot is the visual direction only.

## Planner venue images

`src/data/spot-photos.json` records HTTPS photo URLs for 264 of the 342 catalog entries, retrieved on 2026-11-17. The first 86 came from AMap PlaceSearch getDetails; the citywide expansion adds 178 from PlaceSearch results with `extensions: 'all'`. The expansion used 85 district-limited keyword and named-venue lookups; only photographs matching a retained venue's POI were attached. See [citywide coverage and selection](CITYWIDE_COVERAGE.md).

Every image is paired with the same venue's POI source link and retrieval time. The UI labels these as 高德场所图 and links to the original venue record. Capture dates are not supplied; these images are not evidence of present opening, weather, or permission. The count represents catalog entries with an AMap photo reference, not independently verified photos of every fishing position.

Images remain hosted by AMap / AutoNavi and are not downloaded or redistributed in the repository. Availability and rights remain with the source and its contributors; no independent reuse license is asserted. If a photo fails or no photo exists, the UI uses the existing local `water.jpg` decorative asset, visibly labeled 水景示意 · 非实景. Image loads use no-referrer, native lazy loading, and no new API keys or runtime POI search.

## Place detail gallery

`src/data/spot-gallery.json` adds three historical photographs for 凉风村垂钓基地 from the Guanba town government's article [关坝镇：150名钓友抛竿竞技，齐聚凉风村](https://ws.cq.gov.cn/jz/wsgbz/jzdt/202412/t20241209_13873393.html), published 2024-12-09 about the competition on 2024-12-07. Accessed 2026-11-17. The source text explicitly identifies the venue as 关坝镇凉风垂钓基地. Images were visually checked against the article: pond surroundings, bankside fishing positions, and competition participants.

- `W020241209548964686604.jpg`: pond and surrounding landscape.
- `W020241209548959971809.jpg`: bankside fishing positions.
- `W020241210393273812032.jpg`: competition participants.

These are remote source-hosted image references, not downloaded assets or a claim of an independent reuse license. The page visibly labels them `2024 年赛事资料图`, links to the government article, and states that they do not establish current opening. The source retains image rights. No photo changes the venue's UNKNOWN permission status. Detail pages for the 264 AMap photo records reuse their matched images; other venues use the explicitly labeled decorative fallback. Individual failed images are removed from the gallery; if all fail, the source credit changes to an image-unavailable explanation and the marked fallback.

## Homepage location thumbnails

The six homepage location cards use the matching venue gallery first, then its AMap photo, with a source link on each image. A failed gallery image advances to the next photo of the same venue; exhausted or missing images use the labeled `水景示意 · 非实景` fallback. Map cards retain their existing photo layout without duplicate thumbnails.

Added one historical aerial view of 荷韵生态园 (荷韵园), showing its mountain setting, buildings and ponds, from [重庆旅行（搜狐号）](https://www.sohu.com/a/309371855_99941923), published 2019-04-21 and accessed 2026-11-17. The source places the image in its 巴南区—荷韵园 section and identifies the 云篆山 / 鱼洞街道三湾村 location. The remote image reference is `4d9a5a1374b142b6af1936adf220f7b0.jpeg`. It is labeled as 2019 material; no independent reuse license or current conditions are claimed.

Four of the six homepage venues now have matched photographs: 凉风村、荷韵园、鱼乐圈、巴乡谷. 笋河水乡 and 万顺镇东风村 retain the explicitly marked decorative fallback because a matching standalone venue photograph was not established. The Dongfeng source's promotional collages and registration QR code were not used as venue photographs.
