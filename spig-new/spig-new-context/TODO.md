# SPIG Node.js Rewrite: Task List

> **Prerequisites**: Read [SUMMARY.md](./SUMMARY.md) and [PLAN.md](./PLAN.md) first  
> **Legend**: ✅ Done | 🔴 Critical | 🟡 Important | 🟢 Nice to have

---

## Phase 0: Project Setup ✅ COMPLETE
All monorepo setup, NestJS backend, Next.js frontend, shared types package - DONE.

## Phase 1: Database & Authentication ✅ COMPLETE  
Prisma schema, Google JWT auth, session cookies, role guards, frontend auth - DONE.

---

## Phase 2: Core CRUD Operations 🔴 BACKEND DONE, FRONTEND PARTIAL

### Backend ✅ Complete
- All CRUD endpoints for: Courses, Sections, Rubrics, Assignments, PDF uploads

### Frontend Needs Work
- [x] Teacher dashboard (/home) - course list
- [x] Create Course dialog
- [ ] **Course page** (`/course/[id]`) - sections, rubrics, assignments lists
- [ ] Create Section dialog
- [ ] Create Rubric dialog  
- [ ] Create Assignment dialog
- [ ] Rubric editor page (`/course/[id]/rubric/[rubId]`)
- [ ] Assignment page (`/course/[id]/assignment/[assignId]`) + PDF upload
- [ ] Join section page (`/section/join/[code]`)

---

## Phase 3: Section Management 🔴 BACKEND DONE, FRONTEND NOT STARTED

### Backend ✅ Complete
- Status state machine (WAITING→WRITING→GRADING_INDIVIDUAL→GRADING_GROUPS→VIEWING_RESULTS)
- Group generation algorithm
- WebSocket gateway for real-time updates

### Frontend Needs Work
- [ ] **Section management page** (`/course/[id]/section/[secId]`)
  - [ ] Invite link dialog (copy link, toggle activation)
  - [ ] Assignment selector
  - [ ] Status buttons (Next Activity, End Activity)
  - [ ] Student list (real-time join updates)
  - [ ] Submission counter
  - [ ] Delete submissions button

---

## Phase 4: Submissions & Individual Grading 🔴 BACKEND DONE, FRONTEND NOT STARTED

### Backend ✅ Complete
- Create submission, get next ungraded, score creation

### Frontend Needs Work
- [ ] **Student section page** (`/section/[id]`) - main grading interface
  - [ ] Waiting state (waiting message)
  - [ ] Writing state (Monaco editor + submit button)
  - [ ] Individual grading state (rubric checkboxes + code viewer)
  - [ ] "Nothing to review" state

---

## Phase 5: Group Grading & Consensus 🔴 BACKEND DONE, FRONTEND NOT STARTED

### Backend ✅ Complete
- Group score upsert, evaluation update (clears signatures!), consensus check
- ScoresGateway WebSocket for real-time sync

### Frontend Needs Work
- [ ] Group grading state in student section page
  - [ ] Group members display
  - [ ] Real-time checkbox sync via Socket.IO
  - [ ] "Lock in score" button with progress (X/Y signed)
  - [ ] Auto-advance on consensus

---

## Phase 6: Reports & Results 🔴 BACKEND DONE, FRONTEND NOT STARTED

### Backend ✅ Complete
- Grade calculator (ported from Python)
- Report generation and retrieval

### Frontend Needs Work
- [ ] Results state in student section page
  - [ ] Grade display (weighted avg, teacher/peer/group scores)
  - [ ] Confetti animation
- [ ] Teacher report view
  - [ ] Generate Report button
  - [ ] Class statistics display

---

## Current Status Summary

| Phase | Backend | Frontend | 
|-------|---------|----------|
| 0. Setup | ✅ 100% | ✅ 100% |
| 1. Auth | ✅ 100% | ✅ 100% |
| 2. CRUD | ✅ 100% | ~30% |
| 3. Section Mgmt | ✅ 100% | 0% |
| 4. Submissions | ✅ 100% | 0% |
| 5. Group Grading | ✅ 100% | 0% |
| 6. Reports | ✅ 100% | 0% |

**NEXT PRIORITY**: Build frontend pages for Phases 2-6
