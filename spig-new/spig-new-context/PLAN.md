# SPIG Node.js Rewrite: Architecture Plan

> Reference: [SUMMARY.md](./SUMMARY.md) for detailed analysis of current implementation

---

## Table of Contents


1. [Tech Stack Selection](#tech-stack-selection)
2. [Phoenix ↔ Node.js Pattern Mapping](#phoenix--nodejs-pattern-mapping)
3. [Project Structure](#project-structure)
4. [Database Migration Strategy](#database-migration-strategy)
5. [Authentication Architecture](#authentication-architecture)
6. [Real-Time Architecture](#real-time-architecture)
7. [API Design](#api-design)
8. [Frontend Architecture](#frontend-architecture)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Considerations](#deployment-considerations)

---

## Tech Stack Selection

### Core Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Node.js 20 LTS | Stable, excellent WebSocket support, npm ecosystem |
| **Framework** | **NestJS 10** | Enterprise-grade, TypeScript-first, modular architecture, built-in WebSocket support |
| **Database** | PostgreSQL 15+ | Keep existing DB, excellent with Node via Prisma |
| **ORM** | Prisma 5 | Type-safe queries, excellent migrations, schema-first |
| **Real-time** | Socket.IO 4 | Best-in-class WebSocket library, rooms, namespaces |
| **Auth** | Passport.js + Google OAuth | Industry standard, well-tested |
| **Validation** | class-validator + class-transformer | NestJS native, decorator-based |
| **Testing** | Jest + Supertest + Socket.IO Client | Comprehensive testing suite |

### Frontend Stack (Progressive Enhancement)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | React 18 + Next.js 14 | SSR for initial load, rich interactivity |
| **Styling** | Tailwind CSS 3 | Utility-first, matches existing dark theme |
| **State** | Zustand | Simple, works with SSR |
| **Code Editor** | Monaco Editor (React) | Same editor as Phoenix version |
| **Real-time** | Socket.IO Client | Pairs with backend |
| **Forms** | React Hook Form + Zod | Type-safe validation |

### Why NestJS over Express?

| Factor | Express | NestJS | Winner |
|--------|---------|--------|--------|
| Structure | DIY, inconsistent | Opinionated, modular | NestJS |
| TypeScript | Optional, manual setup | First-class citizen | NestJS |
| WebSockets | Manual integration | Built-in Gateway support | NestJS |
| Dependency Injection | Manual/third-party | Built-in container | NestJS |
| Testing | Manual setup | Built-in testing utilities | NestJS |
| Learning Curve | Low | Medium | Express |
| Phoenix Similarity | Low | High (modules ≈ contexts) | NestJS |

**Verdict**: NestJS's module system maps naturally to Phoenix contexts, and its built-in WebSocket support matches LiveView's real-time patterns.

---

## Phoenix ↔ Node.js Pattern Mapping

### Contexts → Modules

```
Phoenix Context          →    NestJS Module
─────────────────────────────────────────────
Spig.Accounts            →    AuthModule + UsersModule
Spig.Course              →    CoursesModule
Spig.Section             →    SectionsModule
Spig.Assignment          →    AssignmentsModule
Spig.Rubric              →    RubricsModule
Spig.Submission          →    SubmissionsModule
Spig.Score               →    ScoresModule
Spig.Report              →    ReportsModule
Spig.Group               →    GroupsModule
```

### Ecto Schema → Prisma Model

```typescript
// Phoenix Ecto
schema "users" do
  field :email, :string
  field :role, :string
  has_many :courses, Course
  timestamps()
end

// Prisma equivalent
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique @db.Citext
  role      Role      @default(STUDENT)
  name      String
  avatar    String?
  courses   Course[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

enum Role {
  STUDENT
  TEACHER
  ADMIN
}
```

### Ecto Changesets → DTOs + Validation

```typescript
// Phoenix changeset
def changeset(course, attrs) do
  course
  |> cast(attrs, [:name])
  |> validate_length(:name, min: 2, max: 100)
  |> validate_required([:name, :teacher_id])
end

// NestJS DTO equivalent
export class CreateCourseDto {
  @IsString()
  @Length(2, 100)
  name: string;
}

// Validation happens automatically via ValidationPipe
```

### Phoenix PubSub → Socket.IO Rooms

```typescript
// Phoenix
Phoenix.PubSub.subscribe(Spig.PubSub, "section:#{id}")
Phoenix.PubSub.broadcast!(Spig.PubSub, "section:#{id}", {:section_updated, section})

// Socket.IO equivalent
// In Gateway:
socket.join(`section:${sectionId}`);
this.server.to(`section:${sectionId}`).emit('section:updated', section);

// In client:
socket.on('section:updated', (section) => { ... });
```

### LiveView → React + Socket.IO

| LiveView Pattern | React + Socket.IO Equivalent |
|------------------|------------------------------|
| `mount/3` | `useEffect` + `useState` on component mount |
| `handle_event/3` | Socket.IO emit + event handlers |
| `handle_info/2` | Socket.IO `.on()` listeners |
| `push_event/3` | Server → Client emit |
| `assign/3` | React state update |
| `stream/3` | React state array with optimistic updates |
| `live_session` | React Router + Auth context |

### LiveView Component Communication

```
Phoenix:
mount() → subscribe to PubSub → handle_info() → update assigns → re-render

React:
useEffect() → join Socket.IO room → on('event') → setState() → re-render
```

### Authentication Flow Mapping

```
Phoenix:
Plug.fetch_session → Plug.fetch_current_user → LiveView.on_mount

NestJS:
Express-session → Passport.deserializeUser → NestJS Guard
```

---

## Project Structure

```
spig-new/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts               # Bootstrap
│   │   │   ├── app.module.ts         # Root module
│   │   │   │
│   │   │   ├── common/               # Shared utilities
│   │   │   │   ├── decorators/       # Custom decorators
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   └── roles.decorator.ts
│   │   │   │   ├── guards/           # Auth guards
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   ├── roles.guard.ts
│   │   │   │   │   └── ws-jwt.guard.ts
│   │   │   │   ├── filters/          # Exception filters
│   │   │   │   ├── interceptors/     # Response interceptors
│   │   │   │   └── pipes/            # Validation pipes
│   │   │   │
│   │   │   ├── auth/                 # Authentication module
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── google.strategy.ts
│   │   │   │   │   └── jwt.strategy.ts
│   │   │   │   ├── dto/
│   │   │   │   └── guards/
│   │   │   │
│   │   │   ├── users/                # Users module
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── dto/
│   │   │   │   └── entities/
│   │   │   │
│   │   │   ├── courses/              # Courses module
│   │   │   │   ├── courses.module.ts
│   │   │   │   ├── courses.controller.ts
│   │   │   │   ├── courses.service.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── sections/             # Sections module
│   │   │   │   ├── sections.module.ts
│   │   │   │   ├── sections.controller.ts
│   │   │   │   ├── sections.service.ts
│   │   │   │   ├── sections.gateway.ts    # WebSocket gateway
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── assignments/          # Assignments module
│   │   │   │   ├── assignments.module.ts
│   │   │   │   ├── assignments.controller.ts
│   │   │   │   ├── assignments.service.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── rubrics/              # Rubrics module
│   │   │   │   ├── rubrics.module.ts
│   │   │   │   ├── rubrics.controller.ts
│   │   │   │   ├── rubrics.service.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── submissions/          # Submissions module
│   │   │   │   ├── submissions.module.ts
│   │   │   │   ├── submissions.controller.ts
│   │   │   │   ├── submissions.service.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── scores/               # Scores module
│   │   │   │   ├── scores.module.ts
│   │   │   │   ├── scores.service.ts
│   │   │   │   ├── scores.gateway.ts      # Real-time scoring
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── groups/               # Groups module
│   │   │   │   ├── groups.module.ts
│   │   │   │   ├── groups.service.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── reports/              # Reports module
│   │   │   │   ├── reports.module.ts
│   │   │   │   ├── reports.controller.ts
│   │   │   │   ├── reports.service.ts
│   │   │   │   └── grade-calculator.ts   # Port from Python
│   │   │   │
│   │   │   └── gateway/              # Main WebSocket gateway
│   │   │       ├── gateway.module.ts
│   │   │       └── spig.gateway.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   ├── migrations/           # Migration files
│   │   │   └── seed.ts               # Seed data
│   │   │
│   │   ├── test/                     # E2E tests
│   │   │   ├── app.e2e-spec.ts
│   │   │   ├── auth.e2e-spec.ts
│   │   │   ├── sections.e2e-spec.ts
│   │   │   └── scoring.e2e-spec.ts
│   │   │
│   │   ├── uploads/                  # PDF storage
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Next.js Frontend
│       ├── src/
│       │   ├── app/                  # App router pages
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx          # Login page
│       │   │   ├── (auth)/           # Auth-required routes
│       │   │   │   ├── layout.tsx    # Auth check wrapper
│       │   │   │   ├── home/
│       │   │   │   │   └── page.tsx  # Teacher dashboard
│       │   │   │   ├── course/
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── settings/
│       │   │   │   │   │   ├── section/[secId]/
│       │   │   │   │   │   ├── assignment/[assignId]/
│       │   │   │   │   │   └── rubric/[rubId]/
│       │   │   │   └── section/
│       │   │   │       ├── page.tsx          # Student sections list
│       │   │   │       ├── join/[code]/
│       │   │   │       └── [id]/page.tsx     # Student view
│       │   │   └── api/              # Next.js API routes (proxy)
│       │   │
│       │   ├── components/           # React components
│       │   │   ├── ui/               # Base UI components
│       │   │   ├── layout/           # Layout components
│       │   │   │   ├── Navbar.tsx
│       │   │   │   └── AuthProvider.tsx
│       │   │   ├── course/           # Course-related
│       │   │   ├── section/          # Section-related
│       │   │   ├── grading/          # Grading interface
│       │   │   │   ├── CodeEditor.tsx
│       │   │   │   ├── RubricForm.tsx
│       │   │   │   └── GroupConsensus.tsx
│       │   │   └── dialogs/          # Modal dialogs
│       │   │
│       │   ├── hooks/                # Custom React hooks
│       │   │   ├── useSocket.ts      # Socket.IO connection
│       │   │   ├── useAuth.ts
│       │   │   ├── useSection.ts
│       │   │   └── useGrading.ts
│       │   │
│       │   ├── lib/                  # Utilities
│       │   │   ├── api.ts            # API client
│       │   │   ├── socket.ts         # Socket.IO setup
│       │   │   └── utils.ts
│       │   │
│       │   ├── stores/               # Zustand stores
│       │   │   ├── authStore.ts
│       │   │   └── sectionStore.ts
│       │   │
│       │   └── styles/               # Global styles
│       │       └── globals.css
│       │
│       ├── public/
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── tsconfig.json
│
├── packages/                         # Shared packages
│   └── shared-types/                 # TypeScript types
│       ├── src/
│       │   ├── dto/                  # Shared DTOs
│       │   ├── events.ts             # Socket.IO event types
│       │   └── index.ts
│       └── package.json
│
├── docker-compose.yml                # Local development
├── package.json                      # Workspace root
├── pnpm-workspace.yaml               # pnpm workspaces
├── turbo.json                        # Turborepo config
└── README.md
```

---

## Database Migration Strategy

### Phase 1: Schema Translation

The existing PostgreSQL schema is kept, with Prisma introspection:

```bash
# Connect Prisma to existing database
npx prisma db pull
```

### Prisma Schema (Matching Current DB)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Enable citext extension
// Run: CREATE EXTENSION IF NOT EXISTS citext;

model User {
  id              Int                   @id @default(autoincrement())
  email           String                @unique @db.Citext
  role            Role                  @default(STUDENT)
  name            String
  avatar          String?
  createdAt       DateTime              @default(now()) @map("inserted_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")
  
  tokens          UserToken[]
  teacherCourses  Course[]              @relation("TeacherCourses")
  teacherSections Section[]             @relation("TeacherSections")
  submissions     Submission[]
  scores          Score[]               @relation("ScorerScores")
  memberships     SectionMembership[]
  
  @@map("users")
}

enum Role {
  STUDENT  @map("student")
  TEACHER  @map("teacher")
  ADMIN    @map("admin")
}

model UserToken {
  id        Int       @id @default(autoincrement())
  token     Bytes
  context   String
  sentTo    String?   @map("sent_to")
  userId    Int       @map("user_id")
  createdAt DateTime  @default(now()) @map("inserted_at")
  
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([context, token])
  @@index([userId])
  @@map("users_tokens")
}

model Course {
  id          Int          @id @default(autoincrement())
  name        String
  teacherId   Int          @map("teacher_id")
  createdAt   DateTime     @default(now()) @map("inserted_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  
  teacher     User         @relation("TeacherCourses", fields: [teacherId], references: [id])
  sections    Section[]
  rubrics     Rubric[]
  assignments Assignment[]
  
  @@index([teacherId])
  @@map("courses")
}

model Section {
  id            Int                   @id @default(autoincrement())
  name          String
  year          Int
  semester      String
  archived      Boolean               @default(false)
  joinableCode  String                @unique @map("joinable_code")
  linkActive    Boolean               @default(false) @map("link_active")
  status        SectionStatus         @default(WAITING)
  courseId      Int                   @map("course_id")
  teacherId     Int                   @map("teacher_id")
  assignmentId  Int?                  @map("assignment_id")
  createdAt     DateTime              @default(now()) @map("inserted_at")
  updatedAt     DateTime              @updatedAt @map("updated_at")
  
  course        Course                @relation(fields: [courseId], references: [id], onDelete: Cascade)
  teacher       User                  @relation("TeacherSections", fields: [teacherId], references: [id], onDelete: Cascade)
  assignment    Assignment?           @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
  memberships   SectionMembership[]
  groups        Group[]
  reports       Report[]
  
  @@map("sections")
}

enum SectionStatus {
  WAITING           @map("waiting")
  WRITING           @map("writing")
  GRADING_INDIVIDUAL @map("grading individually")
  GRADING_GROUPS    @map("grading in groups")
  VIEWING_RESULTS   @map("viewing results")
}

model SectionMembership {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  sectionId Int      @map("section_id")
  groupId   Int?     @map("group_id")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  section   Section  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  group     Group?   @relation(fields: [groupId], references: [id], onDelete: SetNull)
  
  @@unique([userId, sectionId])
  @@map("section_memberships")
}

model Group {
  id          Int                   @id @default(autoincrement())
  sectionId   Int                   @map("section_id")
  createdAt   DateTime              @default(now()) @map("inserted_at")
  updatedAt   DateTime              @updatedAt @map("updated_at")
  
  section     Section               @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  memberships SectionMembership[]
  scores      Score[]
  
  @@index([sectionId])
  @@map("groups")
}

model Rubric {
  id          Int          @id @default(autoincrement())
  name        String
  courseId    Int          @map("course_id")
  createdAt   DateTime     @default(now()) @map("inserted_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  
  course      Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  criteria    Criteria[]
  assignments Assignment[]
  scores      Score[]
  reports     Report[]
  
  @@map("rubrics")
}

model Criteria {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  points      Float
  rubricId    Int      @map("rubric_id")
  
  rubric      Rubric   @relation(fields: [rubricId], references: [id], onDelete: Cascade)
  
  @@map("criteria")
}

model Assignment {
  id           Int          @id @default(autoincrement())
  name         String
  instructions String?
  rubricId     Int?         @map("rubric_id")
  courseId     Int          @map("course_id")
  createdAt    DateTime     @default(now()) @map("inserted_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")
  
  rubric       Rubric?      @relation(fields: [rubricId], references: [id], onDelete: SetNull)
  course       Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  sections     Section[]
  submissions  Submission[]
  scores       Score[]
  reports      Report[]
  
  @@map("assignments")
}

model Submission {
  id           Int        @id @default(autoincrement())
  value        String
  studentId    Int        @map("student_id")
  assignmentId Int        @map("assignment_id")
  createdAt    DateTime   @default(now()) @map("inserted_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  
  student      User       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  scores       Score[]
  
  @@index([studentId])
  @@map("submissions")
}

model Score {
  id           Int        @id @default(autoincrement())
  evaluation   Json       @default("{}")
  signed       Json       @default("{}")
  done         Boolean    @default(false)
  assignmentId Int        @map("assignment_id")
  submissionId Int        @map("submission_id")
  scorerId     Int?       @map("scorer_id")
  groupId      Int?       @map("group_id")
  rubricId     Int        @map("rubric_id")
  createdAt    DateTime   @default(now()) @map("inserted_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  
  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  scorer       User?      @relation("ScorerScores", fields: [scorerId], references: [id], onDelete: SetNull)
  group        Group?     @relation(fields: [groupId], references: [id], onDelete: SetNull)
  rubric       Rubric     @relation(fields: [rubricId], references: [id], onDelete: SetNull)
  
  @@unique([submissionId, assignmentId, rubricId, groupId])
  @@unique([submissionId, assignmentId, rubricId, scorerId])
  @@index([submissionId])
  @@index([scorerId])
  @@index([rubricId])
  @@map("scores")
}

model Report {
  id            Int        @id @default(autoincrement())
  assignmentId  Int?       @map("assignment_id")
  sectionId     Int?       @map("section_id")
  rubricId      Int?       @map("rubric_id")
  reportVersion Int        @map("report_version")
  report        Json
  createdAt     DateTime   @default(now()) @map("inserted_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")
  
  assignment    Assignment? @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
  section       Section?    @relation(fields: [sectionId], references: [id], onDelete: SetNull)
  rubric        Rubric?     @relation(fields: [rubricId], references: [id], onDelete: SetNull)
  
  @@index([assignmentId])
  @@index([sectionId])
  @@index([rubricId])
  @@map("reports")
}
```

### Migration Strategy: Zero Downtime

1. **Create new Prisma project** pointing to existing database
2. **Introspect** existing schema: `npx prisma db pull`
3. **Baseline** migration: `npx prisma migrate diff --from-empty --to-schema-datamodel`
4. **Deploy** Node.js app alongside Phoenix (read-only mode)
5. **Validate** data consistency
6. **Cutover** to Node.js as primary

---

## Authentication Architecture

### Google OAuth Flow (NestJS)

```typescript
// auth/strategies/google.strategy.ts
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${configService.get('BASE_URL')}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    const { emails, photos, displayName } = profile;
    const email = emails[0].value;
    
    // Find or create user (matching Phoenix behavior)
    let user = await this.usersService.findByEmail(email);
    
    if (!user) {
      user = await this.usersService.create({
        email,
        name: displayName,
        avatar: photos?.[0]?.value,
        role: Role.STUDENT, // Default to student
      });
    }
    
    return user;
  }
}
```

### JWT Token Strategy

```typescript
// auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.['spig_token'],
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### WebSocket Authentication

```typescript
// gateway/spig.gateway.ts
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class SpigGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private authService: AuthService) {}

  async handleConnection(socket: Socket) {
    try {
      // Verify JWT from handshake
      const token = socket.handshake.auth.token;
      const user = await this.authService.verifyToken(token);
      
      // Attach user to socket
      socket.data.user = user;
      
      // Join personal room for direct messages
      socket.join(`user:${user.id}`);
    } catch (error) {
      socket.disconnect();
    }
  }
}
```

---

## Real-Time Architecture

### Socket.IO Event Map

```typescript
// packages/shared-types/src/events.ts

// Server → Client Events
export interface ServerToClientEvents {
  // Section events
  'section:updated': (section: SectionDto) => void;
  'section:studentJoined': (student: UserDto) => void;
  'section:submissionReceived': (submission: SubmissionDto) => void;
  
  // Grading events
  'score:updated': (data: { groupId: number; score: ScoreDto }) => void;
  'score:synchronized': (score: ScoreDto) => void;
  
  // Report events
  'report:generated': (report: ReportDto) => void;
  
  // Join link events
  'joinLink:toggled': (isActive: boolean) => void;
  
  // Course events
  'course:newSection': (section: SectionDto) => void;
  'course:newAssignment': (assignment: AssignmentDto) => void;
  'course:newRubric': (rubric: RubricDto) => void;
}

// Client → Server Events
export interface ClientToServerEvents {
  // Room management
  'section:join': (sectionId: number) => void;
  'section:leave': (sectionId: number) => void;
  'sectionManagement:join': (sectionId: number) => void;
  'course:join': (courseId: number) => void;
  
  // Grading actions
  'submission:create': (data: CreateSubmissionDto) => void;
  'evaluation:submit': (data: SubmitEvaluationDto) => void;
  'evaluation:update': (data: UpdateEvaluationDto) => void;
  'evaluation:agree': (scoreId: number) => void;
}
```

### Gateway Implementation

```typescript
// sections/sections.gateway.ts
@WebSocketGateway()
export class SectionsGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private sectionsService: SectionsService,
    private groupsService: GroupsService,
  ) {}

  // Teacher updates section status
  async handleStatusChange(sectionId: number, newStatus: SectionStatus) {
    const section = await this.sectionsService.updateStatus(sectionId, newStatus);
    
    // Broadcast to all students in section
    this.server.to(`section:${sectionId}`).emit('section:updated', section);
  }

  // Student joins section
  @SubscribeMessage('section:join')
  async handleJoinSection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() sectionId: number,
  ) {
    const user = socket.data.user;
    
    // Verify membership
    const isMember = await this.sectionsService.isMember(sectionId, user.id);
    if (!isMember) {
      throw new WsException('Not a member of this section');
    }
    
    // Join Socket.IO room
    socket.join(`section:${sectionId}`);
    
    // If in group grading, also join group room
    const group = await this.groupsService.findUserGroup(sectionId, user.id);
    if (group) {
      socket.join(`group:${group.id}`);
    }
  }
}

// scores/scores.gateway.ts
@WebSocketGateway()
export class ScoresGateway {
  @WebSocketServer()
  server: Server;

  constructor(private scoresService: ScoresService) {}

  @SubscribeMessage('evaluation:update')
  async handleEvaluationUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: UpdateEvaluationDto,
  ) {
    const user = socket.data.user;
    
    // Update score and clear signatures (matching Phoenix behavior)
    const score = await this.scoresService.updateEvaluation(
      data.scoreId,
      data.evaluation,
    );
    
    // Broadcast to group members
    this.server.to(`group:${score.groupId}`).emit('score:updated', {
      groupId: score.groupId,
      score,
    });
  }

  @SubscribeMessage('evaluation:agree')
  async handleAgreement(
    @ConnectedSocket() socket: Socket,
    @MessageBody() scoreId: number,
  ) {
    const user = socket.data.user;
    
    // Sign the evaluation
    const score = await this.scoresService.signEvaluation(scoreId, user.id);
    
    // Check if all group members agreed
    if (await this.scoresService.isConsensusReached(scoreId)) {
      // Mark as done
      await this.scoresService.markDone(scoreId);
    }
    
    // Broadcast updated score
    this.server.to(`group:${score.groupId}`).emit('score:updated', {
      groupId: score.groupId,
      score,
    });
  }
}
```

### Client-Side Integration

```typescript
// hooks/useGrading.ts
export function useGrading(sectionId: number) {
  const socket = useSocket();
  const [score, setScore] = useState<Score | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  
  useEffect(() => {
    socket.emit('section:join', sectionId);
    
    socket.on('score:updated', ({ groupId, score: newScore }) => {
      if (groupId === currentGroupId) {
        setScore(newScore);
      }
    });
    
    socket.on('section:updated', (section) => {
      // Handle status changes, re-fetch next submission
    });
    
    return () => {
      socket.emit('section:leave', sectionId);
      socket.off('score:updated');
      socket.off('section:updated');
    };
  }, [sectionId]);
  
  const updateEvaluation = (evaluation: Record<string, boolean>) => {
    socket.emit('evaluation:update', { scoreId: score?.id, evaluation });
  };
  
  const agreeToScore = () => {
    socket.emit('evaluation:agree', score?.id);
  };
  
  return { score, submission, updateEvaluation, agreeToScore };
}
```

---

## API Design

### RESTful Endpoints

```
Authentication
POST   /auth/google              # Initiate Google OAuth
GET    /auth/google/callback     # Google OAuth callback
POST   /auth/logout              # Logout
GET    /auth/me                  # Get current user

Users
GET    /users/:id                # Get user profile

Courses (Teacher only)
GET    /courses                  # List teacher's courses
POST   /courses                  # Create course
GET    /courses/:id              # Get course with sections, rubrics, assignments
PUT    /courses/:id              # Update course
DELETE /courses/:id              # Delete course

Sections
GET    /sections                 # List student's enrolled sections
GET    /sections/join/:code      # Get section info for join page
POST   /sections/join/:code      # Join section
GET    /sections/:id             # Get section details

Course Sections (Teacher only)
GET    /courses/:id/sections     # List course sections
POST   /courses/:id/sections     # Create section
GET    /courses/:id/sections/:secId
PUT    /courses/:id/sections/:secId
DELETE /courses/:id/sections/:secId
POST   /courses/:id/sections/:secId/status     # Change status
POST   /courses/:id/sections/:secId/assignment # Set assignment
POST   /courses/:id/sections/:secId/groups     # Generate groups
PUT    /courses/:id/sections/:secId/link       # Toggle join link

Rubrics (Teacher only)
GET    /courses/:id/rubrics
POST   /courses/:id/rubrics
GET    /courses/:id/rubrics/:rubId
PUT    /courses/:id/rubrics/:rubId
DELETE /courses/:id/rubrics/:rubId
POST   /courses/:id/rubrics/:rubId/criteria
DELETE /courses/:id/rubrics/:rubId/criteria/:critId

Assignments (Teacher only)
GET    /courses/:id/assignments
POST   /courses/:id/assignments
GET    /courses/:id/assignments/:assignId
PUT    /courses/:id/assignments/:assignId
DELETE /courses/:id/assignments/:assignId
POST   /courses/:id/assignments/:assignId/pdf    # Upload PDF
DELETE /courses/:id/assignments/:assignId/pdf    # Delete PDF
PUT    /courses/:id/assignments/:assignId/rubric # Assign rubric

Submissions
POST   /sections/:id/submissions              # Create submission
GET    /sections/:id/submissions/next         # Get next ungraded submission

Scores
POST   /sections/:id/scores                   # Submit individual score
GET    /sections/:id/scores/group             # Get current group score

Reports (Teacher only)
POST   /courses/:id/sections/:secId/reports   # Generate report
GET    /courses/:id/sections/:secId/reports   # Get latest report
GET    /sections/:id/results                  # Get student's own results
```

### Controller Example

```typescript
// sections/sections.controller.ts
@Controller('sections')
@UseGuards(JwtAuthGuard)
export class SectionsController {
  constructor(
    private sectionsService: SectionsService,
    private sectionsGateway: SectionsGateway,
  ) {}

  @Get()
  async getEnrolledSections(@CurrentUser() user: User) {
    return this.sectionsService.findByStudent(user.id);
  }

  @Get(':id')
  async getSection(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Query('student_view') studentView?: string,
  ) {
    const section = await this.sectionsService.findById(id, {
      includeAssignment: true,
      includeRubric: true,
    });
    
    // Check access
    const isTeacher = section.teacherId === user.id;
    const isMember = await this.sectionsService.isMember(id, user.id);
    
    if (!isTeacher && !isMember) {
      throw new ForbiddenException('Access denied');
    }
    
    // Teacher can view as student
    const viewAsStudent = studentView === '1';
    
    return {
      ...section,
      isTeacher: isTeacher && !viewAsStudent,
    };
  }

  @Post(':id/submissions')
  async createSubmission(
    @Param('id', ParseIntPipe) sectionId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateSubmissionDto,
  ) {
    const section = await this.sectionsService.findById(sectionId);
    
    if (section.status !== 'writing') {
      throw new BadRequestException('Submissions are not open');
    }
    
    const submission = await this.sectionsService.createSubmission(
      sectionId,
      user.id,
      dto.value,
    );
    
    // Notify teacher via WebSocket
    this.sectionsGateway.server
      .to(`sectionManagement:${sectionId}`)
      .emit('section:submissionReceived', submission);
    
    return submission;
  }
}
```

---

## Frontend Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Layout                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                      Navbar                             │ │
│  │  [SPIG]                           [User Avatar] [Logout]│ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Page Content                         │ │
│  │                                                         │ │
│  │  Student View (section/:id):                           │ │
│  │  ┌─────────────────────┬───────────────────────────┐   │ │
│  │  │   RubricPanel       │      CodeEditor           │   │ │
│  │  │  ┌──────────────┐   │  ┌─────────────────────┐  │   │ │
│  │  │  │ Criteria 1 □ │   │  │                     │  │   │ │
│  │  │  │ Criteria 2 ☑ │   │  │  Monaco Editor      │  │   │ │
│  │  │  │ Criteria 3 □ │   │  │  (read-only during  │  │   │ │
│  │  │  └──────────────┘   │  │   grading)          │  │   │ │
│  │  │                     │  │                     │  │   │ │
│  │  │  [Lock In] (2/5)    │  └─────────────────────┘  │   │ │
│  │  │  Progress ▓▓▓░░░░░  │                           │   │ │
│  │  └─────────────────────┴───────────────────────────┘   │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

```typescript
// components/grading/GradingInterface.tsx
export function GradingInterface({ sectionId }: Props) {
  const { section, submission, score, isLoading } = useSectionData(sectionId);
  const { updateEvaluation, agreeToScore } = useGrading(sectionId);
  const [localEvaluation, setLocalEvaluation] = useState<Record<string, boolean>>({});
  
  // Sync local state with server state
  useEffect(() => {
    if (score?.evaluation) {
      setLocalEvaluation(score.evaluation);
    }
  }, [score?.evaluation]);
  
  const handleCheckboxChange = (criteriaId: string, checked: boolean) => {
    const newEval = { ...localEvaluation, [criteriaId]: checked };
    setLocalEvaluation(newEval);
    
    // Debounce server update
    debouncedUpdate(newEval);
  };
  
  if (section.status === 'viewing results') {
    return <ResultsView results={/* ... */} />;
  }
  
  if (section.status === 'waiting') {
    return <WaitingView />;
  }
  
  if (section.status === 'writing') {
    return <WritingView />;
  }
  
  // Grading view
  return (
    <div className="flex h-screen">
      <RubricPanel
        rubric={section.assignment?.rubric}
        evaluation={localEvaluation}
        onCheckboxChange={handleCheckboxChange}
        score={score}
        onAgree={agreeToScore}
        isGroupGrading={section.status === 'grading in groups'}
      />
      <CodeEditor
        value={submission?.value ?? ''}
        language="java"
        readOnly
      />
    </div>
  );
}
```

### State Management Pattern

```typescript
// stores/sectionStore.ts
interface SectionState {
  section: Section | null;
  submission: Submission | null;
  score: Score | null;
  results: Report | null;
  groupMembers: User[];
  
  setSection: (section: Section) => void;
  setSubmission: (submission: Submission) => void;
  setScore: (score: Score) => void;
  updateEvaluation: (evaluation: Record<string, boolean>) => void;
}

export const useSectionStore = create<SectionState>((set) => ({
  section: null,
  submission: null,
  score: null,
  results: null,
  groupMembers: [],
  
  setSection: (section) => set({ section }),
  setSubmission: (submission) => set({ submission }),
  setScore: (score) => set({ score }),
  
  updateEvaluation: (evaluation) => set((state) => ({
    score: state.score ? { ...state.score, evaluation, signed: {} } : null,
  })),
}));
```

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ~10%
                    │  (Cypress)  │
                    └──────┬──────┘
                    ┌──────┴──────┐
                    │ Integration │  ~30%
                    │  (Supertest)│
                    └──────┬──────┘
              ┌────────────┴────────────┐
              │       Unit Tests        │  ~60%
              │     (Jest + RTL)        │
              └─────────────────────────┘
```

### Unit Test Example (Service)

```typescript
// sections/sections.service.spec.ts
describe('SectionsService', () => {
  let service: SectionsService;
  let prisma: PrismaService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SectionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    
    service = module.get(SectionsService);
    prisma = module.get(PrismaService);
  });
  
  describe('generateGroups', () => {
    it('should distribute students evenly into groups of 5', async () => {
      // Arrange
      const sectionId = 1;
      const studentIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      mockPrisma.sectionMembership.findMany.mockResolvedValue(
        studentIds.map(id => ({ userId: id }))
      );
      
      // Act
      await service.generateGroups(sectionId);
      
      // Assert
      expect(mockPrisma.group.createMany).toHaveBeenCalled();
      const createdGroups = mockPrisma.group.createMany.mock.calls[0][0].data;
      expect(createdGroups.length).toBe(3); // ceil(12/5) = 3 groups
    });
    
    it('should handle sections with fewer students than group size', async () => {
      const sectionId = 1;
      const studentIds = [1, 2, 3];
      mockPrisma.sectionMembership.findMany.mockResolvedValue(
        studentIds.map(id => ({ userId: id }))
      );
      
      await service.generateGroups(sectionId);
      
      const createdGroups = mockPrisma.group.createMany.mock.calls[0][0].data;
      expect(createdGroups.length).toBe(1);
    });
  });
  
  describe('getNextSubmission', () => {
    it('should return ungraded submission for individual grading', async () => {
      // ... test implementation
    });
    
    it('should return null when all submissions are graded', async () => {
      // ... test implementation
    });
  });
});
```

### Integration Test Example (API)

```typescript
// test/sections.e2e-spec.ts
describe('Sections (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleRef.createNestApplication();
    await app.init();
    
    prisma = moduleRef.get(PrismaService);
    
    // Create test user and get token
    const user = await prisma.user.create({
      data: { email: 'teacher@test.com', role: 'TEACHER', name: 'Test Teacher' },
    });
    authToken = generateTestToken(user.id);
  });
  
  describe('POST /courses/:id/sections/:secId/status', () => {
    it('should progress through all status stages', async () => {
      const course = await createTestCourse(prisma, /* ... */);
      const section = await createTestSection(prisma, course.id);
      
      // waiting -> writing
      await request(app.getHttpServer())
        .post(`/courses/${course.id}/sections/${section.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'writing' })
        .expect(200);
      
      let updated = await prisma.section.findUnique({ where: { id: section.id } });
      expect(updated.status).toBe('writing');
      
      // writing -> grading individually
      await request(app.getHttpServer())
        .post(`/courses/${course.id}/sections/${section.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'grading individually' })
        .expect(200);
      
      updated = await prisma.section.findUnique({ where: { id: section.id } });
      expect(updated.status).toBe('grading individually');
    });
    
    it('should not allow skipping status stages', async () => {
      // ... test that you can't jump from 'waiting' to 'viewing results'
    });
  });
});
```

### WebSocket Integration Test

```typescript
// test/scoring.e2e-spec.ts
describe('Scoring WebSocket (e2e)', () => {
  let app: INestApplication;
  let ioClient1: Socket;
  let ioClient2: Socket;
  
  beforeAll(async () => {
    // ... setup
    
    ioClient1 = io(`http://localhost:${port}`, {
      auth: { token: student1Token },
    });
    
    ioClient2 = io(`http://localhost:${port}`, {
      auth: { token: student2Token },
    });
  });
  
  it('should synchronize evaluation changes across group members', async () => {
    // Both students join the section
    ioClient1.emit('section:join', sectionId);
    ioClient2.emit('section:join', sectionId);
    
    // Set up listener for client2
    const scoreUpdatePromise = new Promise<any>((resolve) => {
      ioClient2.on('score:updated', resolve);
    });
    
    // Client1 updates evaluation
    ioClient1.emit('evaluation:update', {
      scoreId: scoreId,
      evaluation: { '1': true, '2': false },
    });
    
    // Client2 should receive the update
    const received = await scoreUpdatePromise;
    expect(received.score.evaluation).toEqual({ '1': true, '2': false });
    expect(received.score.signed).toEqual({}); // Signatures should be cleared
  });
  
  it('should mark score as done when all members agree', async () => {
    // ... test consensus mechanism
  });
});
```

### Frontend Component Test

```typescript
// components/grading/RubricPanel.test.tsx
describe('RubricPanel', () => {
  it('should render all criteria with checkboxes', () => {
    const rubric = {
      name: 'Test Rubric',
      criteria: [
        { id: 1, name: 'Criterion 1', points: 5 },
        { id: 2, name: 'Criterion 2', points: -2 },
      ],
    };
    
    render(
      <RubricPanel
        rubric={rubric}
        evaluation={{}}
        onCheckboxChange={vi.fn()}
        score={null}
        onAgree={vi.fn()}
        isGroupGrading={false}
      />
    );
    
    expect(screen.getByText('Criterion 1')).toBeInTheDocument();
    expect(screen.getByText('5pts')).toBeInTheDocument();
    expect(screen.getByText('-2pts')).toBeInTheDocument();
  });
  
  it('should show progress bar during group grading', () => {
    const score = {
      signed: { '1': true, '2': true },
      evaluation: { '1': true },
    };
    
    render(
      <RubricPanel
        rubric={testRubric}
        evaluation={score.evaluation}
        onCheckboxChange={vi.fn()}
        score={score}
        onAgree={vi.fn()}
        isGroupGrading={true}
        groupSize={5}
      />
    );
    
    expect(screen.getByText('Lock in score (2/5)')).toBeInTheDocument();
  });
});
```

---

## Deployment Considerations

### Environment Variables

```bash
# .env.production

# Database
DATABASE_URL="postgresql://user:pass@host:5432/spig?schema=public"

# Authentication
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
JWT_SECRET="<32+ random bytes>"
SESSION_SECRET="<32+ random bytes>"

# URLs
BASE_URL="https://spig.example.com"
FRONTEND_URL="https://spig.example.com"

# Optional
SENTRY_DSN="..."
```

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: spig_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/spig_dev
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      JWT_SECRET: dev-secret-change-in-prod
    depends_on:
      - postgres
    volumes:
      - ./apps/api:/app
      - /app/node_modules

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    volumes:
      - ./apps/web:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

### Production Deployment (Railway/Render)

```yaml
# railway.yaml
services:
  api:
    build:
      dockerfile: apps/api/Dockerfile
    healthcheck:
      path: /health
      interval: 30s
    env:
      DATABASE_URL: ${{ Postgres.DATABASE_URL }}
      # ... other env vars from secrets
    
  web:
    build:
      dockerfile: apps/web/Dockerfile
    env:
      NEXT_PUBLIC_API_URL: ${{ api.url }}
```

### Nginx Configuration (if self-hosted)

```nginx
upstream api_servers {
    server localhost:3001;
}

upstream web_servers {
    server localhost:3000;
}

server {
    listen 80;
    server_name spig.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name spig.example.com;
    
    ssl_certificate /etc/letsencrypt/live/spig.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spig.example.com/privkey.pem;
    
    # WebSocket support
    location /socket.io {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API routes
    location /api {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Static uploads
    location /uploads {
        alias /var/www/spig/uploads;
        expires 30d;
    }
    
    # Frontend
    location / {
        proxy_pass http://web_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Key Migration Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Real-time sync issues | High | Extensive Socket.IO integration tests |
| Auth session migration | Medium | Dual-auth period, gradual user migration |
| Report calculation drift | High | Port Python logic to TypeScript with property-based tests |
| Performance regression | Medium | Load testing with k6, monitoring with DataDog |
| Data consistency | High | Transaction wrapping, Prisma middleware |

---

## Success Criteria

Before production cutover, validate:

1. ✅ All existing Cypress/E2E tests pass
2. ✅ WebSocket latency < 100ms p95
3. ✅ API response time < 200ms p95
4. ✅ Report calculations match Phoenix implementation ±0.01
5. ✅ Zero data corruption during parallel operation
6. ✅ Auth flow works for new + existing users
7. ✅ PDF upload/download works
8. ✅ Group consensus works with 5+ simultaneous users

