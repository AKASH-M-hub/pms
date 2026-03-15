# Setup Guide

This document covers local setup for backend, frontend, database, and common troubleshooting.

## Requirements

- Java 21+
- Maven 3.9+ (or use `mvnw.cmd`)
- Node.js 18+
- npm 9+
- MySQL 8+

## 1. Clone Repository

```bash
git clone https://github.com/AKASH-M-hub/Placement_Management_System.git
cd Placement_Management_System/PMS
```

## 2. Install Frontend Dependencies

```bash
npm run install:frontend
```

## 3. Configure Database

Create a MySQL database:

```sql
CREATE DATABASE pms_db;
```

Edit `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/pms_db
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD
spring.jpa.hibernate.ddl-auto=update
server.port=8080
```

## 4. Run Backend

Unix/macOS:

```bash
./mvnw spring-boot:run
```

Windows:

```bash
mvnw.cmd spring-boot:run
```

Fallback if wrapper has issues:

```bash
mvn -DskipTests compile
mvn spring-boot:run
```

## 5. Run Frontend

From `PMS` root:

```bash
npm run dev
```

Frontend starts on `http://localhost:5173`.

## 6. Build Commands

Backend:

```bash
mvn test
mvn clean package -DskipTests
```

Frontend:

```bash
npm run build
npm run preview
```

## Troubleshooting

### Port already in use

- Backend: change `server.port` in `application.properties`.
- Frontend: run `npm run dev -- --port 5174` from `frontend` if needed.

### DB connection failures

- Verify MySQL service is running.
- Confirm DB name and credentials.
- Confirm user has privileges on `pms_db`.

### Login or token errors

- Re-login to refresh token.
- Clear browser local storage for stale auth data.

### Frontend cannot call backend

- Confirm backend is running on `8080`.
- Confirm CORS/security config allows your frontend origin.
