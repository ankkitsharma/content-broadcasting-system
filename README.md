# content-broadcasting-system

Backend-only Content Broadcasting System (Node.js + Express + PostgreSQL + Prisma).

## Hosted instance (VPS)

This project is hosted on a VPS at:

- **Base URL**: `https://cbs.ankitsh.cc/`
- **Health**: `GET https://cbs.ankitsh.cc/health`
- **Swagger UI**: `GET https://cbs.ankitsh.cc/docs/` (note trailing slash; `/docs` redirects)

## Tech stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Web framework**: Express
- **Validation**: Zod
- **API docs**: OpenAPI (`openapi.yaml`) + Swagger UI (`/docs/`)
- **Auth**: JWT Bearer tokens (login via `/auth/login`)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Caching (optional)**: Redis (enabled when `REDIS_URL` is set)
- **Rate limiting**: Public rate limiter on `/content/live/:teacherId`
- **Uploads**:
  - **Local**: `multer` to `UPLOAD_DIR` + static serving via `/uploads/<filename>`
  - **S3-compatible**: Cloudflare R2 (S3 API) with public base URL for reads
- **Package manager**: pnpm
- **Testing**: Vitest + Supertest
- **Containerization**: Docker Compose (dev + prod)

## Features

- **Authentication**
  - `POST /auth/login` issues a JWT (Bearer token)
- **Role-based access control (RBAC)**
  - Teacher endpoints require teacher role
  - Admin endpoints require principal role
- **Teacher content upload**
  - `POST /content` accepts multipart form-data (`title`, `subject`, optional scheduling fields, and `file`)
  - Upload validation (mime allowlist, max size via env)
  - New uploads start as **pending** and are automatically appended to the teacher’s rotation list for that subject
- **Teacher content management**
  - `GET /content/mine` lists the teacher’s uploads
  - `PUT /content/:id/schedule` sets start/end times and optional rotation duration
  - `PUT /content/:id/rotation` sets rotation order and optional per-item duration for a subject
- **Principal approval workflow**
  - `GET /admin/content` lists all content
  - `GET /admin/content/pending` lists pending items
  - `POST /admin/content/:id/approve` approves content
  - `POST /admin/content/:id/reject` rejects content (requires a rejection reason)
- **Public “live” content endpoint**
  - `GET /content/live/:teacherId?subject=<subject>`
  - Returns the currently active item based on scheduling + rotation rules; returns `{}` when nothing is live (not an error)
  - Optional Redis caching with short TTL; cache failures never break the endpoint
  - Optional view-event recording if the `contentViewEvent` model exists in Prisma

## Run locally (Node on host, DB in Docker)

- Copy env:
  - `cp .env.example .env`
- Install deps:
  - `pnpm install`
- Start Postgres:
  - `docker compose -f docker-compose.dev.yml up -d db`
- Push schema + seed (against `DATABASE_URL` from `.env`):
  - `pnpm exec prisma db push`
  - `pnpm db:seed`
- Start API:
  - `pnpm dev`
- Endpoints:
  - Health: `GET /health`
  - Swagger UI: `GET /docs/`
  - Uploads (local provider): `GET /uploads/<filename>`

## Run with Docker (dev)

- Start API + DB:
  - `docker compose -f docker-compose.dev.yml up --build`
- Push schema + seed (inside the API container):
  - `docker compose -f docker-compose.dev.yml exec api pnpm exec prisma db push`
  - `docker compose -f docker-compose.dev.yml exec api pnpm db:seed`
- Endpoints:
  - Health: `GET /health`
  - Swagger UI: `GET /docs/`

## S3 Uploads with Cloudflare R2 (public bucket)

This project supports S3-style uploads via **Cloudflare R2** (S3-compatible).

### Setup in Cloudflare

- Create an **R2 bucket**
- Enable a **public access route** (e.g. `r2.dev` or a custom domain) so objects can be fetched publicly
- Create an **API token / access key** for S3-compatible access (Access Key ID + Secret)

### Enable R2 uploads in the API

Set `STORAGE_PROVIDER="s3"` and configure these env vars:

- `S3_ENDPOINT`: `https://<accountid>.r2.cloudflarestorage.com`
- `S3_REGION`: `auto`
- `S3_BUCKET`: your bucket name
- `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`: from the R2 API token
- `S3_PUBLIC_BASE_URL`: the base URL for your public bucket route
  - Example: `https://pub-<hash>.r2.dev/<bucket>`

When enabled:

- Uploads go to R2 and `content.filePath` stores the **object key**
- The live endpoint returns `fileUrl = ${S3_PUBLIC_BASE_URL}/${key}`

If you add new dependencies and the container throws “Cannot find module …”, reset volumes (dev):

- `docker compose -f docker-compose.dev.yml down -v`
- `docker compose -f docker-compose.dev.yml up --build`

## Run with Docker (prod)

- Copy env (don’t commit secrets):
  - `cp .env.example .env.production`
  - Edit `.env.production` for your VPS values
- Start API + DB:
  - `docker compose -f docker-compose.prod.yml up -d --build`
- Push schema + seed:
  - `docker compose -f docker-compose.prod.yml exec api pnpm exec prisma db push`
  - `docker compose -f docker-compose.prod.yml exec api node dist/prisma/seed.js`
- Hosted URLs:
  - Health: `GET https://cbs.ankitsh.cc/health`
  - Swagger UI: `GET https://cbs.ankitsh.cc/docs/`

## Common error: missing tables

If you see an error like “The table `public.users` does not exist”, run the `prisma db push` step for your chosen flow above.

## Seeded users

- principal: `principal@example.com` / `Principal@123`
- teacher1: `teacher1@example.com` / `Teacher@123`
- teacher2: `teacher2@example.com` / `Teacher@123`

## API

- `POST /auth/login`
- Teacher:
  - `POST /content` (multipart form-data: `title`, `subject`, optional scheduling fields, and `file`)
  - `GET /content/mine`
  - `PUT /content/:id/schedule`
  - `PUT /content/:id/rotation`
- Principal:
  - `GET /admin/content`
  - `GET /admin/content/pending`
  - `POST /admin/content/:id/approve`
  - `POST /admin/content/:id/reject`
- Public:
  - `GET /content/live/:teacherId?subject=maths`

## API docs

- OpenAPI spec: `openapi.yaml`

## Deployment

- Deployment URL (VPS): **`https://cbs.ankitsh.cc/`**

## Demo video

- https://drive.google.com/file/d/1he5ddMNcRiLXxkHBuBVLN5sim-k8e-V9/view?usp=sharing
