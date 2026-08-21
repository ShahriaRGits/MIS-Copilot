# Running Website Handoff

## Verified current website

The AI MIS Copilot landing page is rendering successfully at the managed preview URL:

<https://3000-ie7q7l81gi5a2i3aowcsa-2cda9270.us4.manus.computer/>

The root route `/` was verified at desktop size and shows the persistent Sample Data banner, MIS Copilot header, five-stage workflow, and the Data-stage source cards.

## Why the GitHub URL is not the website

The GitHub repository at <https://github.com/ShahriaRGits/MIS-Copilot> stores source code and runs CI. It does not run the Node.js/tRPC server. Opening the repository URL therefore shows repository files rather than the application landing page.

The full MVP requires a Node-compatible runtime because its backend serves deterministic analytics, bounded AI calls, and decision logging. GitHub Pages is not sufficient for this full-stack application.

## Required publish action

To obtain a persistent public application URL through the managed platform, open the project Management UI and click **Publish** for the latest checkpoint. Configure the required server-side secrets through the platform's encrypted Secrets panel. Do not copy secrets into GitHub files or browser code.

If using an external GitHub-connected host instead, configure the build command `pnpm install --frozen-lockfile && pnpm build`, the start command `pnpm start`, Node.js 22 or compatible newer LTS, and the encrypted runtime variables described in `docs/GITHUB_HOSTING.md`.
