# Architecture Overview

The Placement Management System is a layered full-stack application:

- React frontend for admin/student workflows
- Spring Boot backend for API, security, business logic
- MySQL for persistence

## High-Level Components

- `frontend/`
  - Pages and API client for admin and student dashboards
- `src/main/java/com/example/PMS/Controller/`
  - HTTP API controllers
- `src/main/java/com/example/PMS/Service/`
  - Business logic and orchestration
- `src/main/java/com/example/PMS/Repository/`
  - Spring Data repositories
- `src/main/java/com/example/PMS/Entity/`
  - JPA entities and enums
- `src/main/java/com/example/PMS/Security/`
  - JWT, authentication/authorization configuration

## Backend Layering

1. Controller layer
- Exposes REST endpoints and validates incoming DTOs.

2. Service layer
- Contains core business rules (application lifecycle, interview schedule, offer handling, analytics).

3. Repository layer
- Uses Spring Data JPA for persistence.

4. Entity/DTO model
- Entities represent storage model.
- DTOs represent API request/response model.

## Authentication and Authorization

- JWT-based stateless authentication.
- Spring Security role checks for `ROLE_ADMIN` and `ROLE_STUDENT`.
- Protected endpoints under `/api/student/**` and `/api/admin/**`.

## Main Functional Flows

### Student Flow

- Register/login
- View jobs
- Apply to jobs
- Update profile
- Upload documents
- Track interview and offer status
- Submit feedback

### Admin Flow

- Register/login
- Post jobs
- Filter and update applications
- Schedule interviews (single/bulk)
- Issue offers
- View feedback and analytics
- Download analytics PDF

## File Storage

- Student uploads are stored under `uploads/students/`.
- Paths are persisted against student records.
- Uploads are intentionally ignored from git.

## Suggested Next Improvements

- Replace in-file credentials with environment variables or profile-specific config.
- Add Swagger/OpenAPI docs for contract visibility.
- Add integration tests for authentication and core workflows.
- Add CI checks for backend tests and frontend build.
