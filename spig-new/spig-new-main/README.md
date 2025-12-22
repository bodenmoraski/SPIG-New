# SPIG - Student Peer Interactive Grading

A peer-assessment grading platform built with NestJS, Next.js, and Socket.IO.

## Tech Stack

- **Backend**: NestJS 10 + Prisma + Socket.IO
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Google Sign-In (JWT verification)

## Project Structure

```
spig-new-main/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared-types/ # TypeScript types
├── turbo.json        # Turborepo config
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (or use Supabase)

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   # Copy and edit .env files
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   ```

3. Enable citext extension and push database schema:
   ```bash
   # In your database, run:
   # CREATE EXTENSION IF NOT EXISTS citext;
   
   pnpm db:push
   ```

4. Start development servers:
   ```bash
   pnpm dev
   ```

   - API: http://localhost:3001
   - Web: http://localhost:3000
   - API Docs: http://localhost:3001/api/docs

## Features

- **Google Sign-In**: Secure authentication via Google OAuth
- **Course Management**: Teachers create courses, sections, rubrics, assignments
- **Real-time Grading**: Students submit code and grade peers
- **Group Consensus**: Collaborative group grading with real-time sync
- **Report Generation**: Automatic grade calculation with statistics

## Development

```bash
# Run all apps
pnpm dev

# Run tests
pnpm test

# Build all apps
pnpm build

# Database operations
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio
```

## Deployment to Railway

Railway is the easiest way to deploy SPIG. Follow these steps:

### 1. Create Railway Account
- Sign up at [railway.app](https://railway.app)
- Connect your GitHub account

### 2. Create Database Service
1. Click "New Project" → "New Database" → "PostgreSQL"
2. Railway will provide a `DATABASE_URL` automatically
3. **Important**: In the Railway database dashboard, go to "Query" tab and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS citext;
   ```

### 3. Deploy API Service
1. Click "New" → "GitHub Repo" → Select your repository
2. **Important**: In service settings, set the **Root Directory**:
   - If your repo root contains `spig-new/spig-new-main/`: Set to `spig-new/spig-new-main/apps/api`
   - If your repo root is already `spig-new-main/`: Set to `apps/api`
3. The `nixpacks.toml` in `apps/api/` will handle build/start commands automatically
4. Railway should auto-detect Node.js and pnpm from the configuration
3. Add environment variables:
   - `DATABASE_URL` → Use the variable from your database service (`${{ Postgres.DATABASE_URL }}`)
   - `GOOGLE_CLIENT_ID` → Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` → Your Google OAuth client secret
   - `JWT_SECRET` → Generate a random 32+ character string
   - `PORT` → `3001` (or let Railway assign it)
   - `FRONTEND_URL` → Will set this after deploying web (use `${{ Web.RAILWAY_PUBLIC_DOMAIN }}`)
   - `BASE_URL` → Your API's Railway URL (will be generated)

### 4. Deploy Web Service
1. Click "New" → "GitHub Repo" → Select the same repository
2. **Important**: In service settings, set the **Root Directory**:
   - If your repo root contains `spig-new/spig-new-main/`: Set to `spig-new/spig-new-main/apps/web`
   - If your repo root is already `spig-new-main/`: Set to `apps/web`
3. The `nixpacks.toml` in `apps/web/` will handle build/start commands automatically
4. Railway should auto-detect Node.js and pnpm from the configuration
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → Your API service's public URL (use `${{ Api.RAILWAY_PUBLIC_DOMAIN }}`)
4. Generate a public domain in Railway settings

### 5. Update API Environment Variables
After web is deployed, update the API's `FRONTEND_URL` to your web service's public URL.

### 6. Update Google OAuth Settings
In your Google Cloud Console, add these to authorized redirect URIs:
- `https://your-api.railway.app/api/auth/google/callback`

### Environment Variables Summary

**API Service:**
- `DATABASE_URL` (from PostgreSQL service)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET` (random 32+ chars)
- `FRONTEND_URL` (web service URL)
- `BASE_URL` (API service URL)
- `PORT` (optional, defaults to 3001)

**Web Service:**
- `NEXT_PUBLIC_API_URL` (API service URL)

**Database:**
- Railway auto-generates `DATABASE_URL`

### Notes
- Railway gives you a free $5/month credit
- Both services can run on the free tier for demo purposes
- Use Railway's variable references (e.g., `${{ Postgres.DATABASE_URL }}`) to link services
- Railway automatically rebuilds on git push if you enable GitHub integration

## License

Private - All rights reserved
