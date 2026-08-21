# Security Policy

## Supported versions

Security fixes apply to the current `main` branch and the most recent tagged release, if tags are introduced later.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for the repository, or contact the repository maintainers through the private channel configured by the repository owner. Include a concise description, affected file or endpoint, reproducible steps, impact, and any safe mitigation.

## Secret-handling rules

Never commit API keys, OAuth credentials, database URLs, JWT secrets, `.env` files, browser cookies, production exports, or user data. Server-only credentials must be configured through the hosting provider's encrypted secret store. Values exposed to Vite with a `VITE_` prefix must be treated as public and must never contain a server secret.

The application is designed so the LLM credential is used server-side. A browser bundle or GitHub Pages deployment must not be used as a substitute for the server runtime.
