# Security Policy

## Supported Versions

This project is under active development. Security fixes are applied on the active main branch.

## Reporting a Vulnerability

If you discover a security issue:

1. Do not post sensitive details publicly.
2. Open a private report to the maintainers or create a GitHub issue with minimal reproduction details.
3. Include impact, affected endpoints, and steps to reproduce.

## Security Best Practices for Contributors

- Never commit real credentials or tokens.
- Keep database credentials and JWT secrets environment-specific.
- Validate and sanitize all request inputs.
- Use role-based authorization checks for protected endpoints.
- Keep dependencies updated and monitor vulnerability alerts.

## Current Repository Safeguards

- Runtime upload files are git-ignored.
- Local env files are git-ignored.
- Role-based endpoint protection is used in backend controllers.
