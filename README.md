# Alumni Connect

A role-based alumni portal with an Express.js and SQLite backend.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
3. Run:

```powershell
npm install
npm start
```

Open `http://localhost:3000/index.html`.

## API overview

- `POST /api/auth/signup` — create a Recruiter, Alumni, Student, or Institute account
- `POST /api/auth/login` — login and receive a JWT
- `GET /api/auth/me` — current authenticated user
- `PATCH /api/profile` — update the current user's profile
- `GET|POST /api/batches` — institute batch management
- `DELETE /api/batches/:id` — remove a batch
- `POST /api/batches/:id/students` — upload a CSV (field name `file`)
- `GET /api/batches/:id/students` — list imported students
- `GET|POST /api/jobs` — recruiter job postings
- `GET|POST /api/mentorship` — student mentorship requests
- `PATCH /api/mentorship/:id/accept` — alumni accept a request

Authenticated requests require:

```text
Authorization: Bearer <token>
```

Data is stored in `data/alumni-connect.db`. This SQLite setup is suitable for local use or a single-server deployment.
