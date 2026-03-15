# Contributing

Thanks for contributing to Placement Management System.

## Development Setup

Use the setup guide in [docs/SETUP.md](docs/SETUP.md).

## Branch Naming

- `feature/<short-name>` for new features
- `fix/<short-name>` for bug fixes
- `docs/<short-name>` for documentation only

## Commit Guidelines

- Keep each commit focused on one concern.
- Use clear messages in imperative style.
- Include issue references when available.

Examples:

- `feat(admin): add bulk interview scheduling`
- `fix(auth): handle invalid token parse`
- `docs(readme): add quick-start steps`

## Pull Request Checklist

- [ ] Code compiles and runs locally.
- [ ] Relevant tests pass (`mvn test`, frontend build if changed).
- [ ] No secrets or credentials are committed.
- [ ] README/docs updated if behavior changed.
- [ ] Screenshots added for UI changes.

## Code Guidelines

- Keep controllers thin; business logic belongs in services.
- Prefer DTOs for request payloads over exposing entities directly.
- Add clear validation for user input.
- Keep frontend API calls centralized in `frontend/src/lib/api.js`.

## Reporting Bugs

When creating an issue, include:

- Expected behavior
- Actual behavior
- Steps to reproduce
- Logs/error snippets
- Environment details (OS, Java, Node, DB versions)
