# Project Structure

This document explains how the repository is organized and where to add new code.

## Root Layout

```text
PMS/
├── frontend/                      # React app (Vite)
├── src/main/java/com/example/PMS/
│   ├── Controller/                # REST endpoints
│   ├── DTO/                       # API request/response objects
│   ├── Entity/                    # JPA entities + enums
│   ├── Repository/                # Spring Data repositories
│   ├── Security/                  # Auth and security config
│   └── Service/                   # Business logic
├── src/main/resources/
│   └── application.properties     # Runtime configuration
├── uploads/                       # Runtime file uploads (git-ignored)
├── pom.xml                        # Maven backend build
├── package.json                   # Root scripts for frontend
└── docs/                          # Project documentation
```

## Frontend Conventions

- Keep route/page-level UI in `frontend/src/pages/`.
- Keep API wrapper functions in `frontend/src/lib/api.js`.
- Keep auth token helper logic in `frontend/src/lib/auth.js`.
- Keep shared styles in `frontend/src/styles.css` or local module styles.

## Backend Conventions

- Add HTTP endpoint handlers in `Controller/`.
- Put business rules in `Service/` (not controllers).
- Keep data access in `Repository/`.
- Keep persistence models in `Entity/`.
- Use `DTO/` for request bodies and response projections when needed.

## Uploads and Generated Files

- Runtime uploads go under `uploads/students/...`.
- Build/generated outputs (`target`, `node_modules`, `dist`) are ignored.
- Keep folders with `.gitkeep` where empty directory structure is needed.

## Suggested Branching

- `main`: stable integration branch
- `feature/<name>`: new features
- `fix/<name>`: bug fixes
- `docs/<name>`: documentation-only changes
