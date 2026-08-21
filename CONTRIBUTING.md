# Contributing

## Development setup

Use Node.js 22 or a compatible newer LTS release and enable Corepack before installing dependencies:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Run the development server with `pnpm dev`. Before opening a pull request, run `pnpm check`, `pnpm test`, and `pnpm build`.

## Pull requests

Keep changes focused on the approved MVP scope. Preserve the distinction between deterministic calculations and AI interpretation. Any new metric must include a documented formula, visible numerator and denominator behavior, deterministic tests, and evidence coverage where applicable. Any new AI output must be bounded to an evidence packet and pass the existing numeric and causal-language guardrails.

Do not commit secrets, `.env` files, production exports, customer data, generated build directories, or runtime logs. Use the GitHub Actions check in `.github/workflows/ci.yml` as the minimum verification gate.
