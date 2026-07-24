# Flowline — Team Task Manager

A full-stack team task manager with authentication, project/team management, task
assignment & status tracking, and a dashboard with overdue detection. Built with
Express + PostgreSQL (Prisma) on the backend and React (Vite) on the frontend,
served as a single deployable service.

## Features

- **Authentication** — signup/login with hashed passwords (bcrypt) and JWT sessions.
- **Projects & teams** — create projects, invite members by email, assign roles.
- **Role-based access control** — every project has its own `ADMIN` / `MEMBER` roles
  (a user can be admin on one project and a member on another).
  - **Admins** can edit the project, add/remove members, change roles, create/edit/delete tasks, and reassign tasks.
  - **Members** can view everything in projects they belong to, and can only change the *status* of tasks assigned to them.
- **Tasks** — title, description, assignee, priority, due date, status (`TODO` / `IN_PROGRESS` / `DONE`).
- **Dashboard** — task counts by status, overdue task tracking (project-wide and personal), tasks assigned to you.
- **Validation** — server-side validation on every write endpoint (`express-validator`), unique-email enforcement, referential checks (e.g. an assignee must be a project member).

## Architecture

```
team-task-manager/
├── backend/            Express REST API + Prisma ORM (PostgreSQL)
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/     auth, projects, tasks, dashboard
│       ├── middleware/ JWT auth guard, project role guard
│       └── index.js    serves the API AND the built frontend
├── frontend/           React (Vite) SPA
│   └── src/
├── railway.json        Railway build/deploy config
└── package.json        root orchestration scripts
```

In production, the frontend is built to static files and served by the same
Express server that serves `/api/*` — so the whole app is **one Railway service**.

## Data model

- `User` — account.
- `Project` — owned by a user.
- `ProjectMember` — join table between `User` and `Project` with a `role` (`ADMIN`/`MEMBER`). This is where RBAC lives.
- `Task` — belongs to a `Project`, optionally assigned to a `User`, has `status`/`priority`/`dueDate`.

## REST API

All routes except `/api/auth/signup` and `/api/auth/login` require
`Authorization: Bearer <token>`.

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | public | Create account |
| POST | `/api/auth/login` | public | Log in |
| GET  | `/api/auth/me` | authed | Current user |
| POST | `/api/projects` | authed | Create project (creator becomes admin) |
| GET  | `/api/projects` | authed | List my projects |
| GET  | `/api/projects/:projectId` | member | Project detail (members + tasks) |
| PATCH | `/api/projects/:projectId` | admin | Update project |
| DELETE | `/api/projects/:projectId` | admin | Delete project |
| POST | `/api/projects/:projectId/members` | admin | Add member by email |
| PATCH | `/api/projects/:projectId/members/:userId` | admin | Change member role |
| DELETE | `/api/projects/:projectId/members/:userId` | admin | Remove member |
| POST | `/api/projects/:projectId/tasks` | admin | Create task |
| GET  | `/api/projects/:projectId/tasks` | member | List tasks (filter by `?status=`/`?assigneeId=`) |
| PATCH | `/api/tasks/:taskId` | admin, or assignee for `status` only | Update task |
| DELETE | `/api/tasks/:taskId` | admin | Delete task |
| GET | `/api/dashboard` | authed | Aggregated stats, overdue tasks, my tasks |

## Running locally

Requires Node 18+ and a PostgreSQL database (a free one from
[Neon](https://neon.tech), [Supabase](https://supabase.com), or Railway itself works fine).

```bash
# 1. Backend
cd backend
cp .env.example .env      # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy # creates tables
npm run dev                # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api to :4000
```

For a production-style run on one port (what actually ships to Railway):

```bash
npm run build   # from the repo root — builds frontend into backend/public
npm start        # from the repo root — starts Express, which now also serves the UI
```

## Deploying to Railway

This repo is pre-configured (`railway.json`) to build the frontend, generate the
Prisma client, run migrations, and start the server — Railway just needs a
Postgres database and two environment variables. Because I don't have a browser
or Railway account in this environment, here's exactly what to click/run:

### Option A — Railway dashboard (no CLI)

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select this repo.
3. In the same project, click **+ New** → **Database** → **Add PostgreSQL**. Railway automatically injects `DATABASE_URL` into every service in the project — your app service will pick it up.
4. Click into your app service → **Variables** → add:
   - `JWT_SECRET` — any long random string (e.g. generate one with `openssl rand -hex 32`)
5. Still on the app service, confirm **Settings → Build**: Railway will auto-detect Node and use the `build`/`start` commands defined in `railway.json`. No changes needed.
6. Click **Deploy**. Railway will run the build (installs both packages, builds the React app, generates the Prisma client), then run `prisma migrate deploy` to create your tables, then start the server.
7. Once deployed, go to **Settings → Networking → Generate Domain** to get your public URL. That's your live app.

### Option B — Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway add --database postgres
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway up
railway domain   # generates and prints your public URL
```

Either way, once live: visit the URL, sign up for an account, create a project
(you're automatically its admin), add a teammate by their email (they need to
have signed up too), create tasks, assign them, and watch the dashboard update.

## Notes on what I verified vs. couldn't in this sandbox

- All backend route files pass Node syntax checks and were reviewed line-by-line for the RBAC logic (project-scoped admin/member checks, assignee-only status updates).
- The frontend builds cleanly with Vite with no errors (`npm run build` succeeds, output verified in `backend/public`).
- I could **not** run a live Postgres instance or `prisma generate` inside this sandbox — my container's network is restricted to package registries (npm/pypi/github) and doesn't reach `binaries.prisma.sh` or `railway.app`. This is a sandbox limitation, not a code issue: Railway's build environment has full internet access, so `prisma generate` and `prisma migrate deploy` will run normally there. I hand-wrote the initial SQL migration (`backend/prisma/migrations/.../migration.sql`) to match the schema exactly, so `prisma migrate deploy` will apply it deterministically on first deploy rather than depending on the (network-blocked) migration engine to generate it.
