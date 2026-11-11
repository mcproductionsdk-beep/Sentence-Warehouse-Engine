# Sentence Warehouse Engine — staging

Baseline: Educational-Games/main/sentence-games-release-candidate/warehouse/index.html ; blob 72d29fc91e2c58be71a9a4df0596d1ec319545ea.

Approved gameplay: clockwise perimeter conveyor, readable cardboard boxes, worker movement and animation, pickup/carry/put-down, numbered slots accepted in any order, repeated words, decoys, green correct placements, NOPE, timer and sentence completion. Desktop uses arrows/WASD and Space. Touch uses drag steering and tap cargo/slots or the circular guide to catch/drop. No duplicate bottom action bar.

Build: `node scripts/build-preview.mjs`; output `dist-preview`; blank root. One engine artifact supports the isolated Play sample fixture and shared staging launch. `version.json` and generated build-id identify the exact immutable artifact. The fixture never replaces teacher/student content during embedded launch and is hidden before initial paint in that path.

Shared launcher: Educational-Games staging branch feature/sentence-cat-platform-20261110. It owns grammar selection, editing, LINE/PROMPT/TARGET preview, five-locale pronunciation, staging sentence sharing and same-set return. Engine contains no teacher editor, catalog or API client. Protocol bt-sentence-warehouse/1 verifies exact parent origin/window/session; READY build handshake precedes INIT/STARTED. Shared pronunciation requests settle through SPOKEN with bounded fallback, cancellation on mute/restart/menu, and stale completion guards. Standalone fixture uses device speech for isolated review.

Compatibility: 2–100 pairs; targets 1–20 playable tokens. Central game-specific gate and engine validation report invalid rows without dropping them. At 20 target tokens, no extra crate is added. Shared speech checks allow only selected-set target sentences/tokens; fallback decoy-bank words outside that set are not pronounced by the shared service.

CI checks isolated desktop/portrait/landscape gameplay and gesture pickup/drop. Central integration checks the immutable engine with five locales, shared pair direction, word/completed-sentence speech requests, pause/resume, restart during completion, sound preference and same-set return. Mocked speech requests do not establish audible device quality. Final physical-device/audio acceptance and coordinated four-game production release remain open. No production routes, APIs, DNS or release changed.
