# SPIG Node.js Rewrite - Agent Handoff

## Your Task
Continue implementing the SPIG peer-assessment grading platform. **The backend is 100% complete.** Your focus is **frontend implementation** and testing.

## Project Location
```
/Users/morabp27/Documents/New-SPIG/spig-new/spig-new-main/
```

## Required Reading (IN THIS ORDER)
1. **`spig-new/spig-new-context/TODO.md`** - Updated task list with completion status. **Start here to see what's done and what's next.**
2. **`spig-new/spig-new-context/SUMMARY.md`** - Phoenix app analysis (database, auth, real-time, business logic)
3. **`spig-new/spig-new-context/PLAN.md`** - Architecture decisions (already implemented)

## What's Already Built

### Backend (100% Complete) - `apps/api/`
- **Auth**: Google JWT verification, session cookies, role guards
- **All Modules**: Users, Courses, Sections, Rubrics, Assignments, Submissions, Scores, Groups, Reports
- **WebSocket Gateways**: Real-time section updates, group grading consensus
- **Grade Calculator**: Ported from Python with all formulas
- **Database**: Prisma schema pushed to Supabase

### Frontend (Partial) - `apps/web/`
- **Auth**: Google Sign-In, AuthProvider, protected routes
- **Pages**: Login, Teacher home (course list), Student sections list
- **Infra**: API client, Socket.IO hooks, Tailwind theming

## What Needs Building (Frontend Focus)

### Priority 1: Course Management Pages
- `/course/[id]` - Course detail page (list sections, rubrics, assignments)
- Create Section/Rubric/Assignment dialog components
- `/course/[id]/section/[secId]` - Section management (status control, student list, invite link)
- `/course/[id]/rubric/[rubId]` - Rubric editor (add/remove criteria)
- `/course/[id]/assignment/[assignId]` - Assignment detail with PDF upload

### Priority 2: Student Grading Flow
- `/section/[id]` - Student section view (the main grading interface)
  - Waiting state, Writing state (Monaco + submit), Individual grading, Group grading, Results
- `/section/join/[code]` - Join section page

### Priority 3: Real-time Features
- Connect Socket.IO in section pages
- Implement checkbox sync for group grading
- Handle section:updated, score:updated, report:generated events

## Key Files to Reference
- `apps/api/src/*/` - Backend controllers/services (all working)
- `apps/web/src/lib/api.ts` - API client pattern
- `apps/web/src/hooks/useSocket.ts` - Socket hooks
- `spig-main-old/lib/spig_web/controllers/live/student_view.ex` - Phoenix UI reference

## Development Commands
```bash
cd /Users/morabp27/Documents/New-SPIG/spig-new/spig-new-main
pnpm dev  # Start both servers (API :3001, Web :3000)
pnpm db:studio  # Prisma Studio
```

## Critical Notes
1. Group grading: Checkbox change CLEARS ALL signatures
2. Status machine: WAITING→WRITING→GRADING_INDIVIDUAL→GRADING_GROUPS→VIEWING_RESULTS
3. Socket namespaces: /sections and /scores
4. Use @monaco-editor/react for code editor

Go build those frontend pages! 🚀
