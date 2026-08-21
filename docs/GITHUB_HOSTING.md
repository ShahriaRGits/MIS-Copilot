# GitHub Upload and Hosting Guide

## Important hosting distinction

GitHub is appropriate for storing this repository, reviewing changes, running CI, and publishing documentation. **GitHub Pages is not sufficient for this MVP** because the application includes an Express/tRPC backend, server-side deterministic analytics, decision logging, and a server-side LLM integration. GitHub Pages serves static files and cannot run the Node.js server or safely provide server-only environment variables.

The safe deployment model is therefore:

| Concern | Recommended location |
|---|---|
| Source code and version history | GitHub repository |
| Pull-request checks | GitHub Actions, using `.github/workflows/ci.yml` |
| Runtime hosting | A Node-compatible service such as Manus hosting, Cloud Run, Render, Railway, or an equivalent managed service |
| Secrets | The runtime provider's encrypted secret store, never GitHub source files or browser code |
| Synthetic fixtures | Versioned under `server/data/` because they contain no credentials |

The repository is prepared for GitHub upload and includes CI. It is **not** configured to pretend that GitHub Pages can host the complete application.

## Upload the existing project

From the project directory, create a private repository by default:

```bash
gh repo create ai-mis-copilot --private --source=. --remote=origin --push
```

If a repository already exists, replace the remote step with the repository URL supplied by your organization:

```bash
git remote add origin https://github.com/ORG_OR_USER/REPOSITORY.git
git branch -M main
git add .
git commit -m "Prepare AI MIS Copilot MVP for GitHub"
git push -u origin main
```

Review the commit before pushing. Do not add `.env`, `.env.*`, `dist/`, `node_modules/`, `.project-config.json`, or runtime logs.

## Runtime configuration

The application must receive its server-side values through the deployment provider's secret/configuration interface. At minimum, configure the database and the existing server-side integration values required by the Manus template. Never prefix a server-only secret with `VITE_`; Vite-prefixed values are eligible for browser bundling.

The browser must not receive `BUILT_IN_FORGE_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, or any LLM credential. The included CI workflow does not require production secrets because it only type-checks, tests, and builds the code.

## Deployment checklist

After the repository is uploaded, connect the repository to a Node-compatible host. Configure the build command as `pnpm install --frozen-lockfile && pnpm build`, the start command as `pnpm start`, and the Node version as 22 or a compatible newer LTS release. Set the host's health-check and runtime port according to its platform contract; the server must not be changed to a hardcoded deployment port.

Run the following checks in the host's build environment before accepting the deployment:

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

The MVP remains labelled as synthetic/demo data. Live marketing connectors, production identity policy, forecasting, notification delivery, and autonomous execution are outside the current implementation scope.
