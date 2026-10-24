# Tech

## pipeline/

- Python, managed only with uv (`uv add`, `uv run`).
- Ruff for lint and format. ty for type checking.
- Type-annotate every function.
- Dependencies: httpx, scipy.

## site/

- SvelteKit with adapter-static, bun, Tailwind, Svelte 5 runes.
- TypeScript, no `any`.

## Data flow

- The pipeline writes static JSON into `site/static/data/`.
- The site only reads those files. No live API calls at runtime.

## Design

- Dark mode, true black `#000` background, white text.
- Information-dense.
- No emojis.
