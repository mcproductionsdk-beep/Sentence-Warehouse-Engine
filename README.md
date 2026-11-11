# Sentence Warehouse Engine — isolated staging

Baseline: Educational-Games/main/sentence-games-release-candidate/warehouse/index.html ; blob 72d29fc91e2c58be71a9a4df0596d1ec319545ea. Repository main/develop began at 6e2d9250946ab77d8521bf3a9ad1b27332a9b189.

Preserve worker movement/animation, crate pickup/carry/put-down, numbered slots accepted in any order, decoys, repeated words, overlap-based delivery, mistakes/NOPE, timer and sentence completion. Portrait retains drag steering and tap-to-pick/place; desktop retains arrows/WASD and Space. The approved four-button top row replaces redundant sentence/fullscreen controls. Canvas title is an instruction so the product title appears once.

Build: node scripts/build-preview.mjs ; output dist-preview ; blank root. Explicit Play sample is an isolated fixed Spanish fixture. No teacher editor, sharing API or catalog is bundled. Shared menu/voice/set integration follows owner gameplay review. No production changes are authorized by this preview.

Compatibility: targets require 1–20 playable tokens. Invalid rows are reported before starting; no silent skipping. At 20 tokens, no distractor crate is added beyond the board capacity. Pause clears movement; restart/exit cancel completion timers. CI checks desktop, portrait and landscape, movement, pause, out-of-order/repeated deliveries, wrong placements, put-down, completion/restart, token bounds, sound and no external requests. Audible physical-device speech remains a separate check.
