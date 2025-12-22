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

## License

Private - All rights reserved
