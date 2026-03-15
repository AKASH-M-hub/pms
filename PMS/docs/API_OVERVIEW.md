# API Overview

Base URL (local): `http://localhost:8080`

Most protected endpoints require:

```http
Authorization: Bearer <jwt_token>
```

## Auth Endpoints

### POST `/api/auth/login`
- Logs in as student/admin depending on role payload.

### POST `/api/auth/register/student`
- Creates a student account.

### POST `/api/admin/auth/register`
- Creates an admin account.

## Public/Shared Endpoints

### GET `/api/jobs`
- Returns available jobs for authenticated student.

## Student Endpoints (`/api/student`)

### POST `/apply/{jobId}`
- Applies current student to a job.

### GET `/applications`
- Lists current student applications.

### GET `/profile`
- Returns student profile with completeness information.

### PUT `/profile`
- Updates profile fields (name, dept, cgpa, skills, portfolio).

### POST `/documents/{type}`
- Upload document for `resume` or `certificates`.

### GET `/documents/{type}`
- Download own uploaded document.

### GET `/interviews`
- Lists student interviews.

### GET `/offers`
- Lists student offers.

### PUT `/offers/{offerId}/respond`
- Accept/reject an offer.

### POST `/feedback`
- Submit student feedback.

### GET `/feedback`
- Get student feedback entries.

### GET `/reminders`
- Get deadline-related reminders.

## Admin Endpoints (`/api/admin`)

### POST `/job`
- Create a job posting.

### GET `/applications`
- List or filter applications.
- Optional query params: `status`, `department`, `skill`, `minCgpa`.

### PUT `/applications/{applicationId}/status`
- Update status/remarks for one application.

### PUT `/applications/bulk-status`
- Bulk status update.

### POST `/applications/{applicationId}/interview`
- Schedule interview for one application.

### POST `/applications/bulk-interview`
- Bulk interview scheduling.

### GET `/interviews`
- List all interviews.

### POST `/applications/{applicationId}/offer`
- Issue offer for one application.

### GET `/offers`
- List all offers.

### GET `/feedback`
- View submitted feedback.

### GET `/analytics`
- Returns dashboard summary metrics.

### GET `/reports/analytics/pdf`
- Downloads analytics PDF report.

### GET `/students/{studentId}/documents/{type}`
- Download a student document as admin.

## Error Handling Notes

- Validation/business failures typically return `400` with message.
- Authentication failures return `401`.
- Access denied for role mismatch returns `403`.
- Unexpected server failures return `500`.
