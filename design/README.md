# Moonlight · Illustrated edition

Original four-character series created with the built-in image generation tool for this project. No stock character art, runtime generation service, external image CDN, or new package dependency is used. Full prompt set: `art-prompts.json`. Original full-resolution PNGs: `art-source/`.

The approved unified collection uses `review-v2/sources/` masters and `review-v2/prompts.json`. Its art guide is `review-v2/ART_DIRECTION.md`. The first illustrated collection remains in `art-source/` and `art-prompts.json` for rollback.

Active production assets live in `public/art/v2/`: 360px and 720px WebP portraits plus 120px thumbnails. The simplified paintings are substantially smaller than the first set. Versioned URLs prevent stale artwork from being reused. Each browser warms the same four small portraits on joining, independent of its assigned role. A concealed role card never mounts its role image, title, pack details, or investigation history in its rendered card contents.

The visual layer is `client/presentation.tsx` and `client/polish.css`. Server code, public protocol, role distribution, timings, victory rules and existing dependencies are unchanged. Voting uses the server-provided `selection` and `acted` values for its confirmed receipt; local selection is only a draft. No other player's submission status is displayed. The finale uses only the already-public final role projection, with host-only rematch control.

Discussion chat is always open during discussion and sits in the main column before private-role details. It renders plain text, handles Enter/Shift+Enter and composition input, and avoids scrolling a reader away from older messages. Motion lasts 240–300ms and is disabled with `prefers-reduced-motion`.

## Rollback checkpoint

`pre-illustrated-redesign-20261028` points to the working public MVP at `b279d55`, before any presentation change. Use Render's previous-deploy rollback if urgently needed; do not reset a working checkout destructively. A revert commit can restore the old interface while retaining project history.

`pre-character-v2-20261028` preserves the first illustrated release before the approved unified artwork was integrated.

## Rebuild images

`python3 scripts/optimize-art.py` reads the approved V2 originals and writes optimized WebP variants with Pillow. Use `--collection v1` to reproduce the first set. Pillow was already available on the development machine; it is not an app or hosting dependency.
