# TrailMate Backend (Neon + Auth)

## What this backend does
- Email/password **signup + login** (JWT)
- Stores user trips in **Neon Postgres** (via Prisma)
- Protected trips API: `GET/POST/PUT/DELETE /trips`

## Setup (local)
1) Install deps
```bash
cd Backend
npm install
```

2) Create `.env`
- Copy `Backend/.env.example` → `Backend/.env`
- Set:
  - `DATABASE_URL` to your Neon connection string
  - `JWT_SECRET` to a long random string
  - `FRONTEND_ORIGIN` to your frontend URL (default `http://localhost:5173`)

3) Create database tables (Prisma migrate)
```bash
npm run prisma:generate
npm run prisma:migrate
```

4) Start backend
```bash
npm run dev
```

Backend runs on `http://localhost:8080` by default.

## API
### Auth
- `POST /auth/signup` `{ email, password }` → `{ token, user }`
- `POST /auth/login` `{ email, password }` → `{ token, user }`

### Trips (requires `Authorization: Bearer <token>`)
- `GET /trips` → `{ trips: [...] }`
- `POST /trips` `{ title, data }` → `{ trip }`
- `PUT /trips/:id` `{ title, data }` → `{ trip }`
- `DELETE /trips/:id` → `204`

