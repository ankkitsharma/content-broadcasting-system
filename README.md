# content-broadcasting-system

Backend-only Content Broadcasting System (Node.js + Express + PostgreSQL + Prisma).

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
- URLs:
  - Health: `GET http://localhost:3000/health`
  - Swagger UI: `GET http://localhost:3000/docs/` (note trailing slash; `/docs` redirects)
  - Uploads: `GET http://localhost:3000/uploads/<filename>`

## Run with Docker (dev)

- Start API + DB:
  - `docker compose -f docker-compose.dev.yml up --build`
- Push schema + seed (inside the API container):
  - `docker compose -f docker-compose.dev.yml exec api pnpm exec prisma db push`
  - `docker compose -f docker-compose.dev.yml exec api pnpm db:seed`
- URLs:
  - Health: `GET http://localhost:3000/health`
  - Swagger UI: `GET http://localhost:3000/docs/`

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
- URLs (example, depends on your VPS):
  - Health: `GET http://<your-host>:3000/health`
  - Swagger UI: `GET http://<your-host>:3000/docs/`

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

- Deployment URL (VPS): **TBD**
  - Replace this with your hosted URL once deployed, e.g. `https://api.example.com`
