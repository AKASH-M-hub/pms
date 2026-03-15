# Placement Management System

A full-stack campus placement platform built with Spring Boot and React.

This repository contains:
- Backend APIs for authentication, jobs, applications, interviews, offers, feedback, and analytics.
- Frontend dashboards for students and admins.
- Document upload/download support for resumes and certificates.

## Highlights

- Role-based access: `ADMIN` and `STUDENT`
- JWT authentication with Spring Security
- Student workflows: profile, apply jobs, track interviews/offers, submit feedback
- Admin workflows: post jobs, filter/update applications, schedule interviews, issue offers
- Analytics and PDF report generation

## Tech Stack

- Backend: Java 21, Spring Boot, Spring Security, Spring Data JPA
- Database: MySQL
- Frontend: React, React Router, Vite
- Build: Maven (backend), npm (frontend)

## Quick Start

### 1) Prerequisites

- Java 21+
- Maven 3.9+ (or use `mvnw.cmd`)
- Node.js 18+
- MySQL 8+

### 2) Clone and install frontend deps

```bash
git clone https://github.com/AKASH-M-hub/Placement_Management_System.git
cd Placement_Management_System/PMS
npm run install:frontend
```

### 3) Configure backend database

Edit `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/pms_db
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD
```

### 4) Run backend

```bash
./mvnw spring-boot:run
```

Windows:

```bash
mvnw.cmd spring-boot:run
```

### 5) Run frontend

From the `PMS` folder:

```bash
npm run dev
```

### 6) Open app

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

## Documentation Index

- Setup guide: [docs/SETUP.md](docs/SETUP.md)
- Architecture overview: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- API overview: [docs/API_OVERVIEW.md](docs/API_OVERVIEW.md)
- Project structure: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)

## Repository Scripts

From `PMS` root:

- `npm run install:frontend` - install frontend dependencies
- `npm run dev` - run Vite dev server (`frontend`)
- `npm run build` - build frontend production bundle
- `npm run preview` - preview built frontend bundle

Backend (Maven):

- `mvn test` - run backend tests
- `mvn clean package -DskipTests` - build backend artifact

## Security and Secrets

- Do not commit real DB credentials, JWT secrets, or API keys.
- Keep uploaded user files out of git (handled in `.gitignore`).
- Use environment-specific config values for production.

## Contributing

See setup and conventions in [docs/SETUP.md](docs/SETUP.md) and [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

Suggested workflow:
1. Create a feature branch.
2. Keep commits focused.
3. Add tests where behavior changes.
4. Open a pull request with clear scope and screenshots for UI changes.

## Status

This repository is under active development. Existing in-progress changes may be present on non-main branches.
