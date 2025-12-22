# SPIG Codebase Analysis Summary

> **SPIG** = **S**tudent **P**eer **I**nteractive **G**rading  
> A peer-assessment grading platform built with Elixir/Phoenix LiveView

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Database Schema & Relationships](#database-schema--relationships)
3. [Authentication System](#authentication-system)
4. [Real-Time Features](#real-time-features)
5. [Business Logic & Workflows](#business-logic--workflows)
6. [File Upload Handling](#file-upload-handling)
7. [Report Generation](#report-generation)
8. [Frontend Architecture](#frontend-architecture)
9. [Critical Implementation Details](#critical-implementation-details)

---

## High-Level Architecture

### Technology Stack
- **Backend**: Elixir 1.14+, Phoenix 1.7.11
- **Database**: PostgreSQL with Ecto ORM
- **Real-time**: Phoenix LiveView 0.20.2 + PubSub
- **Authentication**: Google OAuth (JWT via Joken/JokenJWKS)
- **HTTP Server**: Bandit
- **Asset Bundling**: esbuild
- **Code Editor**: Monaco Editor (live_monaco_editor)
- **Error Tracking**: Sentry

### Application Structure
```
spig-main/
├── lib/
│   ├── spig/                    # Core business logic (contexts)
│   │   ├── accounts/            # User management
│   │   ├── rubric/              # Rubric and criteria
│   │   └── [entity].ex          # Domain models
│   └── spig_web/                # Web layer
│       ├── components/          # Reusable UI components
│       ├── controllers/         # Controllers + LiveViews
│       └── [endpoint/router].ex # HTTP configuration
├── priv/
│   ├── repo/migrations/         # Database migrations
│   └── static/                  # Static assets
└── python_data/                 # Grade calculation scripts
```

---

## Database Schema & Relationships

### Entity Relationship Diagram (Textual)

```
┌─────────────┐
│   users     │
├─────────────┤
│ id (PK)     │──┐
│ email       │  │ (unique, citext)
│ role        │  │ ("student"|"teacher"|"admin")
│ name        │  │
│ avatar      │  │ (URL)
│ timestamps  │  │
└─────────────┘  │
       │        │
       │ 1:N    │ N:1
       ▼        │
┌─────────────┐ │  ┌──────────────────┐
│  courses    │◄┘  │  users_tokens    │
├─────────────┤    ├──────────────────┤
│ id (PK)     │    │ id (PK)          │
│ name        │    │ user_id (FK)     │
│ teacher_id  │◄───│ token (binary)   │
│ timestamps  │    │ context          │ ("session"|"confirm"|etc.)
└─────────────┘    │ sent_to          │
       │           │ inserted_at      │
       │ 1:N       └──────────────────┘
       ▼
┌─────────────────┐     ┌────────────────┐
│   sections      │     │    groups      │
├─────────────────┤     ├────────────────┤
│ id (PK)         │◄────│ id (PK)        │
│ name            │     │ section_id(FK) │
│ year            │     │ timestamps     │
│ semester        │     └────────────────┘
│ archived        │            │
│ joinable_code   │ (unique)   │ 1:N
│ link_active     │            ▼
│ status          │◄─── ┌────────────────────────┐
│ course_id (FK)  │     │ section_memberships    │
│ teacher_id (FK) │     ├────────────────────────┤
│ assignment_id   │     │ id (PK)                │
│ timestamps      │     │ user_id (FK)           │
└─────────────────┘     │ section_id (FK)        │
       │                │ group_id (FK, nullable)│
       │ 1:N            └────────────────────────┘
       ▼                         ▲
┌─────────────────┐              │ N:M
│  assignments    │              │
├─────────────────┤              │
│ id (PK)         │              │
│ name            │              │
│ instructions    │ (URL, nullable)
│ rubric_id (FK)  │──────────────┐
│ course_id (FK)  │              │
│ timestamps      │              │
└─────────────────┘              │
       │                         │
       │ 1:N                     │ N:1
       ▼                         ▼
┌─────────────────┐     ┌────────────────┐
│  submissions    │     │    rubrics     │
├─────────────────┤     ├────────────────┤
│ id (PK)         │     │ id (PK)        │
│ value (text)    │     │ name           │
│ student_id(FK)  │     │ course_id (FK) │
│ assignment_id   │     │ timestamps     │
│ timestamps      │     └────────────────┘
└─────────────────┘            │
       │                       │ 1:N
       │ 1:N                   ▼
       ▼               ┌────────────────┐
┌─────────────────┐    │   criteria     │
│    scores       │    ├────────────────┤
├─────────────────┤    │ id (PK)        │
│ id (PK)         │    │ name           │
│ evaluation (map)│    │ description    │
│ signed (map)    │    │ points (float) │
│ done (boolean)  │    │ rubric_id (FK) │
│ assignment_id   │    └────────────────┘
│ submission_id   │
│ scorer_id (FK)  │ (nullable - null for group scores)
│ group_id (FK)   │ (nullable - null for individual scores)
│ rubric_id (FK)  │
│ timestamps      │
└─────────────────┘

┌─────────────────┐
│    reports      │
├─────────────────┤
│ id (PK)         │
│ assignment_id   │
│ section_id      │
│ rubric_id       │
│ report_version  │
│ report (map)    │ (JSON blob with computed grades)
│ timestamps      │
└─────────────────┘
```

### Critical Schema Details

#### 1. Users Table
- **`email`**: Uses PostgreSQL `citext` extension for case-insensitive email lookups
- **`role`**: String enum with values: `"student"`, `"teacher"`, `"admin"`
- **`avatar`**: Google profile picture URL
- Auto-creates users on first Google Sign-In (defaults to `"student"` role)

#### 2. Sections Table
- **`joinable_code`**: 16-character URL-safe base64 token (`Base.url_encode64(:crypto.strong_rand_bytes(12))`)
- **`link_active`**: Boolean flag to enable/disable join link (security feature)
- **`status`**: State machine with exact ordering:
  ```
  ["waiting", "writing", "grading individually", "grading in groups", "viewing results"]
  ```
- **`assignment_id`**: Currently active assignment (nullable, nilified when activity ends)

#### 3. Section Memberships (Join Table)
- **Unique constraint**: `(user_id, section_id)` - prevents duplicate enrollments
- **`group_id`**: Assigned when section enters "grading in groups" phase
- **No timestamps** - deliberately removed for simplicity

#### 4. Scores Table
- **`evaluation`**: JSON map where keys are criteria IDs (as strings) and values are booleans
  ```json
  {"42": true, "43": false, "44": true}
  ```
- **`signed`**: JSON map tracking which group members have "locked in" their agreement
  ```json
  {"123": true, "124": true, "125": false}
  ```
- **Dual scorer pattern**:
  - Individual grading: `scorer_id` is set, `group_id` is null
  - Group grading: `group_id` is set, `scorer_id` is null
- **`done`**: Marks score as finalized (important for query filtering)
- **Unique constraints**:
  - `(submission_id, assignment_id, rubric_id, group_id)` - one group score per submission
  - `(submission_id, assignment_id, rubric_id, scorer_id)` - one individual score per scorer

#### 5. Submissions Table
- **`value`**: Changed from VARCHAR(255) to TEXT to support large code submissions
- **Important**: No section_id - submissions are linked to assignments, sections linked via assignment

#### 6. Reports Table
- **`report`**: JSON blob containing computed statistics per student:
  ```json
  {
    "student_id_123": {
      "teacher_only": 85.0,
      "students_only": 82.5,
      "groups_only": 88.0,
      "total_average": 85.17,
      "weighted_average": 84.25,
      "highest": 92.0,
      "lowest": 78.0,
      "median": 85.0
    },
    "class": {
      "median": 84.0,
      "lowest": 72.0,
      "highest": 98.0
    },
    "version": 1
  }
  ```

---

## Authentication System

### Google OAuth Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │    SPIG     │     │   Google    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       │  Load login page  │                    │
       │──────────────────►│                    │
       │                   │                    │
       │  Google Sign-In   │                    │
       │  Button rendered  │                    │
       │◄──────────────────│                    │
       │                   │                    │
       │        Click Google Sign-In            │
       │────────────────────────────────────────►
       │                   │                    │
       │        Google OAuth popup              │
       │◄───────────────────────────────────────│
       │                   │                    │
       │   POST /auth/callback with JWT         │
       │   (g_csrf_token in body + cookie)      │
       │──────────────────►│                    │
       │                   │                    │
       │                   │  Verify JWT with   │
       │                   │  Google's JWKS     │
       │                   │────────────────────►
       │                   │                    │
       │                   │◄───────────────────│
       │                   │                    │
       │                   │  Create/find user  │
       │                   │  Generate session  │
       │                   │                    │
       │  Set cookie +     │                    │
       │  Redirect to /home│                    │
       │◄──────────────────│                    │
       │                   │                    │
```

### JWT Verification (GoogleToken Module)

```elixir
# Uses JokenJWKS to fetch Google's public keys dynamically
defmodule Spig.GoogleToken do
  defmodule JwksStrategy do
    use JokenJwks.DefaultStrategyTemplate
    def init_opts(opts) do
      url = "https://www.googleapis.com/oauth2/v3/certs"
      Keyword.merge(opts, jwks_url: url)
    end
  end
  
  # Validates:
  # - iss: "accounts.google.com" or "https://accounts.google.com"
  # - aud: matches GOOGLE_CLIENT_ID
end
```

### Session Management

1. **Session Token Generation**:
   - 32 bytes of cryptographically secure random data
   - Stored in `users_tokens` table with context = "session"
   - Valid for 60 days

2. **Cookie Configuration**:
   - Name: `_SPIG_PLSDONTSHARE_TOPSECRET`
   - Max age: 60 days
   - Same-site: Lax
   - Signed (not encrypted)

3. **LiveView Socket Authentication**:
   - `live_socket_id` stored in session: `"users_sessions:#{Base.url_encode64(token)}"`
   - Used to disconnect all LiveView sockets on logout

### CSRF Protection

- Standard Phoenix CSRF protection enabled
- **Special Google callback route**: Uses custom `google_csrf` plug that validates:
  - `g_csrf_token` in request cookies
  - `g_csrf_token` in POST body
  - Both must match (Google Sign-In's double-submit cookie pattern)

### Role-Based Access Control

```elixir
# Authorization module checks:
def has_access_to_course(conn, id) do
  # User must be the teacher of the course
  Course |> where([c], c.teacher_id == ^uid and c.id == ^id) |> Repo.one() != nil
end

def course_route(conn, _opts) do
  if is_admin(conn) or has_access_to_course(conn, id) do
    conn  # Allow access
  else
    redirect with error
  end
end
```

**Role hierarchy**:
- `admin`: Access to everything, bypasses course ownership checks
- `teacher`: Can create courses, sections, rubrics, assignments; manages own courses
- `student`: Can join sections, submit work, grade peers

### Login Redirect Logic

```elixir
defp signed_in_path(conn) do
  is_teacher = conn.assigns[:current_user].role != "student"
  if is_teacher, do: ~p"/home", else: ~p"/section"
end
```
- Teachers/admins → `/home` (course dashboard)
- Students → `/section` (enrolled courses list)

---

## Real-Time Features

### Phoenix PubSub Channels

SPIG uses Phoenix PubSub for real-time updates across multiple LiveView processes:

| Channel Topic | Purpose | Events |
|--------------|---------|--------|
| `section:#{id}` | Student view updates | `:section_updated`, `:report_generated`, `{group_id, :score_update, score}` |
| `section_m:#{id}` | Management view updates | `:join` (student joined), `:submission` (new submission) |
| `section_link:#{code}` | Join page updates | `:toggled_activation` (link enabled/disabled) |
| `new_in_course:#{id}` | Course page updates | `:new_section`, `:new_assignment`, `:new_rubric` |

### Real-Time Event Flow: Section Status Changes

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Teacher clicks   │      │   ManageSection  │      │   StudentView    │
│ "Start grading"  │      │    LiveView      │      │    LiveView      │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         │  phx-click="nextActivity"                         │
         │────────────────────────►│                         │
         │                         │                         │
         │                         │ Update section status   │
         │                         │ in database             │
         │                         │                         │
         │                         │ PubSub.broadcast!       │
         │                         │ "section:#{id}"         │
         │                         │ {:section_updated, sec} │
         │                         │────────────────────────►│
         │                         │                         │
         │                         │                         │ handle_info
         │                         │                         │ Reload section
         │                         │                         │ with preloads
         │                         │                         │
         │                         │                         │ update_all()
         │                         │                         │ Re-render UI
```

### Real-Time Event Flow: Group Grading Consensus

This is the most complex real-time feature in SPIG:

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Student A   │   │ Student B   │   │ Student C   │
│ (in group)  │   │ (in group)  │   │ (in group)  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       │ Check/uncheck   │                 │
       │ rubric criteria │                 │
       │                 │                 │
       │ "updateEval"    │                 │
       │ event           │                 │
       │                 │                 │
       ▼                 │                 │
  ┌─────────────────────────────────────────────┐
  │              Server (LiveView)               │
  │                                              │
  │ 1. Score.update_eval(score, eval)           │
  │    - Updates evaluation map                 │
  │    - Clears ALL signatures (reset signed)   │
  │                                              │
  │ 2. PubSub.broadcast!                        │
  │    "section:#{id}"                          │
  │    {group_id, :score_update, score}         │
  │                                              │
  └──────┬──────────────┬──────────────┬────────┘
         │              │              │
         ▼              ▼              ▼
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ Student A   │ │ Student B   │ │ Student C   │
  │             │ │             │ │             │
  │ push_event  │ │ push_event  │ │ push_event  │
  │ "scoreUpdate"│ │ "scoreUpdate"│ │ "scoreUpdate"│
  │             │ │             │ │             │
  │ Checkboxes  │ │ Checkboxes  │ │ Checkboxes  │
  │ sync'd      │ │ sync'd      │ │ sync'd      │
  └─────────────┘ └─────────────┘ └─────────────┘
```

**Consensus mechanism**:
1. When any group member changes the evaluation, everyone sees it (checkboxes sync)
2. ALL signatures are cleared (everyone must re-agree)
3. Each member clicks "Lock in score" to sign
4. When `all_in?(socket, score)` returns true (all members signed), score is marked `done: true`
5. Next submission is fetched for grading

### LiveView Hooks for Client-Server Communication

The app uses custom Phoenix LiveView hooks via `push_event`:

```javascript
// Client-side event handlers (app.js)
window.addEventListener("phx:scoreUpdate", e => {
  const data = e.detail;
  // Sync checkboxes with server state
  Object.keys(data.evaluation).forEach(k => {
    const elem = document.querySelector('input[name="c-' + k + '"]')
    if(elem) elem.checked = data.evaluation[k]
  })
})

window.addEventListener("phx:setEditorCode", e => {
  // Update Monaco editor with new submission code
  window.codeEditor.editor.setValue(e.detail.code)
})

window.addEventListener("phx:hydrateGradingForm", e => {
  // Attach event listeners to rubric form
  addPizzazz()
})
```

---

## Business Logic & Workflows

### Section State Machine

```
                    ┌─────────────┐
                    │   WAITING   │◄────────────────────────┐
                    └──────┬──────┘                         │
                           │ Teacher selects assignment     │
                           │ and clicks "Start"             │
                           ▼                                │
                    ┌─────────────┐                         │
                    │   WRITING   │                         │
                    └──────┬──────┘                         │
                           │ Students submit code           │
                           │ Teacher clicks "Start grading" │
                           ▼                                │
              ┌─────────────────────────┐                   │
              │ GRADING INDIVIDUALLY    │                   │
              └───────────┬─────────────┘                   │
                          │ Students grade peers 1:1       │
                          │ Teacher clicks "Start groups"   │
                          ▼                                │ "End Activity"
              ┌─────────────────────────┐                   │ clears assignment
              │   GRADING IN GROUPS     │                   │ and resets status
              └───────────┬─────────────┘                   │
                          │ Groups reach consensus          │
                          │ Teacher clicks "View results"   │
                          ▼                                │
              ┌─────────────────────────┐                   │
              │    VIEWING RESULTS      │───────────────────┘
              └─────────────────────────┘
                          │ Teacher generates report
                          ▼
                    Students see grades
```

### Group Generation Algorithm

When transitioning to "grading in groups":

```elixir
def generate_groups(socket) do
  # 1. Fetch all student IDs in section
  students = from(u in User,
    inner_join: s in "section_memberships",
    on: s.section_id == ^section_id and u.id == s.user_id,
    select: u.id
  ) |> Repo.all()

  # 2. Shuffle randomly
  students = Enum.shuffle(students)
  
  # 3. Create groups (hardcoded 5 per group, TODO: make configurable)
  per_group = 5
  ngroups = ceil(length(students) / per_group)
  
  groups = Enum.map(1..ngroups, fn _ ->
    %Group{section_id: section_id} |> Repo.insert!()
  end)
  
  # 4. Assign students to groups via section_memberships
  Enum.chunk_every(students, per_group)
  |> Enum.zip(groups)
  |> Enum.each(fn {students, group} ->
    Enum.each(students, fn stu ->
      from(m in "section_memberships",
        where: m.user_id == ^stu and m.section_id == ^section_id,
        update: [set: [group_id: ^group.id]])
      |> Repo.update_all([])
    end)
  end)
end
```

**NOTE**: The `per_group = 5` is hardcoded with a TODO comment. This should be configurable in the rewrite.

### Submission Fetching Logic

During grading phases, the system fetches the "next" ungraded submission:

**Individual Grading**:
```sql
SELECT s.* FROM submissions s
LEFT JOIN scores sc ON sc.submission_id = s.id 
  AND sc.scorer_id = :current_user_id 
  AND sc.done = true
WHERE sc.id IS NULL 
  AND s.assignment_id = :assignment_id
LIMIT 1
```

**Group Grading**:
```sql
SELECT s.* FROM submissions s
LEFT JOIN scores sc ON sc.submission_id = s.id 
  AND sc.group_id = :current_group_id 
  AND sc.done = true
WHERE sc.id IS NULL 
  AND s.assignment_id = :assignment_id
LIMIT 1
```

**Important**: The query excludes submissions that:
1. The current user/group has already graded (`done = true`)
2. This creates an "infinite loop" of grading until all submissions are covered

### Score Upsert Pattern (Group Grading)

When entering group grading, a Score record is created with conflict handling:

```elixir
%Score{
  group_id: group_id,
  assignment_id: assignment_id,
  rubric_id: rubric_id,
  submission_id: submission_id
} |> Repo.insert!(on_conflict: :nothing)

# Then fetch the actual record (may be existing)
from(s in Score,
  where: s.group_id == ^group_id
    and s.assignment_id == ^assignment_id
    and s.submission_id == ^submission_id
) |> Repo.one!()
```

This ensures only one Score record exists per group per submission.

---

## File Upload Handling

### PDF Instructions Upload

Assignments can have PDF instruction files:

```elixir
# In LiveView mount:
|> allow_upload(:instructions, accept: ~w(.pdf), max_entries: 1)

# On save:
consume_uploaded_entries(socket, :instructions, fn %{path: path}, _entry ->
  file_name = "instructions_#{assignment.id}.pdf"
  dest = Path.join([:code.priv_dir(:spig), "static", "uploads", file_name])
  File.cp!(path, dest)
  {:ok, ~p"/uploads/#{file_name}"}
end)
```

**Storage location**: `priv/static/uploads/instructions_#{assignment_id}.pdf`

**Serving**: Static files served via Plug.Static at root "/"

### PDF Existence Check

```elixir
def pdf_exists?(assignment) do
  file_path = Path.join([
    :code.priv_dir(:spig), 
    "static", 
    "uploads", 
    "instructions_#{assignment.id}.pdf"
  ])
  File.exists?(file_path)
end
```

---

## Report Generation

### Python Processing Pipeline

SPIG uses a Python subprocess for statistical calculations:

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Elixir Code   │────►│  Port.open()   │────►│ Python Script  │
│                │     │  stdin/stdout  │     │                │
│ collect data   │     │                │     │ data.py        │
│ from DB        │     │                │     │ process.py     │
└────────────────┘     └────────────────┘     └────────────────┘
```

**Input JSON structure**:
```json
{
  "students": ["123", "456", "789"],
  "grades": [[85, 82, 88], [90, 87, 85], [78, 80, 82]],
  "teacher_grades": [85, 88, 80],
  "group_grades": [[86, 84], [89, 90], [79, 81]]
}
```

Where:
- `students`: Array of user IDs (as strings)
- `grades`: 2D array of student-to-student scores (grades[i] = scores received by student i)
- `teacher_grades`: Array of teacher scores per student
- `group_grades`: 2D array of group consensus scores per student

**Grade calculation formulas** (from `data.py`):
- `teacher_only`: Just the teacher's score
- `students_only`: Mean of individual peer scores
- `groups_only`: Mean of group consensus scores
- `total_average`: `(teacher + students_avg + groups_avg) / 3`
- `weighted_average`: `0.4 * teacher + 0.3 * students_avg + 0.3 * groups_avg`
- `highest`, `lowest`, `median`: Statistics across all score sources

**Output JSON structure**:
```json
{
  "123": {
    "teacher_only": 85.0,
    "students_only": 82.5,
    "groups_only": 85.0,
    "total_average": 84.17,
    "weighted_average": 84.0,
    "highest": 88.0,
    "lowest": 78.0,
    "median": 85.0
  },
  "class": {
    "median": 84.0,
    "highest": 92.0,
    "lowest": 72.0
  },
  "version": 1
}
```

### Python Dependencies

The Python script requires:
- `numpy`
- `pandas` (imported but appears unused)

Located in: `python_data/.venv/bin/python3`

---

## Frontend Architecture

### LiveView + LiveComponent Structure

```
app.html.heex (layout)
├── nav (with username component)
└── container
    └── @inner_content (LiveView)
        ├── Live.Courses (teacher dashboard)
        │   └── NewCourse (LiveComponent)
        ├── Live.Course (single course)
        │   ├── NewSection (LiveComponent)
        │   ├── NewRubric (LiveComponent)
        │   └── NewAssignment (LiveComponent)
        ├── Live.ManageSection (teacher section management)
        ├── Live.Assignment (assignment details)
        ├── Live.Rubric (rubric editor)
        ├── Live.Sections (student course list)
        ├── Live.Join (join section page)
        └── Live.StudentView (student grading interface)
```

### Monaco Code Editor Integration

Uses `live_monaco_editor` hex package:

```elixir
<LiveMonacoEditor.code_editor
  style="width: 100%"
  value={@submission_code}
  opts={%{
    "language" => "java",
    "automaticLayout" => true,
    "autoIndent" => "full",
    "formatOnPaste" => true,
    "formatOnType" => true,
    "tabSize" => 2
  }}
/>
```

**Client-side access**:
```javascript
window.addEventListener("lme:editor_mounted", (ev) => {
  window.codeEditor = {
    editor: ev.detail.editor.standalone_code_editor,
    hook: ev.detail.hook
  };
});

// Push events to server:
window.codeEditor.hook.pushEvent('submit', code)
```

### Dialog State Preservation

Phoenix LiveView normally resets DOM state on re-renders. SPIG handles dialog open state:

```javascript
dom: {
  onBeforeElUpdated(from, to) {
    if (to.nodeName.toLowerCase() == "dialog") {
      if (from.open != to.open) {
        to.open = from.open;  // Preserve open state
      }
    }
  }
}
```

### Confetti Animation

For results celebration, uses custom canvas-based confetti:

```javascript
class ConfettiCannon {
  makeConfetti(position) {
    // Creates 100 confetti particles at given position
    // Physics: gravity at 200px/s², random velocity, rotation
  }
}
window.ConfettiCannon = ConfettiCannon;
```

Used via: `<script type="module" src={~p"/assets/confetti.js"}>`

---

## Critical Implementation Details

### 1. CSRF Token Handling

Phoenix uses double-submit CSRF protection. The Google Sign-In callback bypasses normal CSRF but implements its own:

```elixir
pipeline :browser_no_csrf do
  # ... standard plugs minus :protect_from_forgery
end

scope "/", SpigWeb do
  pipe_through [:browser_no_csrf, :google_csrf, :redirect_if_user_is_authenticated]
  post "/auth/callback", UserSessionController, :create
end
```

### 2. LiveView Stream vs Assigns

SPIG uses LiveView streams for efficient list updates:

```elixir
# Instead of:
socket |> assign(:students, students)

# Uses:
socket |> stream(:students, students)

# Updates:
socket |> stream_insert(:students, new_student)
socket |> stream_delete(:students, student)
socket |> stream_delete_by_dom_id(:students, dom_id)
```

Streams are more memory-efficient and handle large lists better.

### 3. Preloading Patterns

Careful preloading to avoid N+1 queries:

```elixir
section = Repo.get!(Section, id)
  |> Repo.preload(assignment: [rubric: :criteria])
```

Force-reload after updates:
```elixir
|> Ecto.reset_fields([:assignment])
|> Repo.preload([assignment: [rubric: :criteria]], force: true)
```

### 4. Teacher "Student View" Mode

Teachers can preview what students see by adding `?student_view=1`:

```elixir
is_teacher = if params["student_view"] == "1" do
  false  # Force student mode
else
  section.teacher_id == socket.assigns.current_user.id
end

# Teachers in student view always see "grading individually" status
section = if is_teacher, do: %{section | status: "grading individually"}, else: section
```

### 5. Group Member Display Logic

Building the "You're in a group with X, Y, and Z" string:

```elixir
group_members = group.students
  |> Enum.filter(fn(stu) -> stu.id != current_user_id end)
  |> Enum.with_index()
  |> Enum.reduce("", fn({student, i}, acc) ->
    cond do
      i == 0 -> acc
      i == n_students - 1 -> acc <> ", and "
      true -> acc <> ", "
    end <> student.name
  end)
```

### 6. Score Signature Tracking

The `signed` map in scores tracks who has agreed:

```elixir
# When student agrees:
def sign_eval(score, user_id) do
  updated = Map.put(score.signed, user_id, true)
  score |> cast(%{:signed => updated}, [:signed])
end

# When evaluation changes, clear all signatures:
def update_eval(score, eval) do
  score |> cast(%{:evaluation => eval, :signed => %{}}, [:evaluation, :signed])
end

# Check if all group members agreed:
def all_in?(socket, score) do
  Enum.all?(socket.assigns.group.students, fn(stu) ->
    score.signed["#{stu.id}"]
  end)
end
```

### 7. Rubric Point Tallying

```elixir
def tally_rubric(criteria, evaluation) do
  Enum.reduce(criteria, 0, fn (c, acc) ->
    eval = evaluation["#{c.id}"]  # Criteria ID as string key
    on = if eval == nil, do: false, else: eval
    if on, do: acc + c.points, else: acc
  end)
end
```

**Note**: Points can be negative (deductions for errors).

### 8. Trusted Email Domain (Commented Out)

There's commented-out code for restricting to trusted email domains:

```elixir
# config.exs
config :spig, Spig.Accounts, trusted_hd: ["episcopalacademy.org"]

# user_session_controller.ex (commented)
# if !Spig.Accounts.is_trusted_email(claims["hd"]) do
#   render(:bad_email)
# end
```

The `hd` claim in Google JWT is the "hosted domain" for Google Workspace accounts.

### 9. Environment Configuration

**Required production environment variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `BASE_URL` - Application base URL (for OAuth callback)
- `SECRET_KEY_BASE` - Phoenix secret key
- `PHX_HOST` - Hostname for URL generation
- `PORT` - HTTP port (default 4000)

---

## Known Quirks & Technical Debt

1. **Hardcoded group size**: `per_group = 5` is hardcoded in `generate_groups/1`
2. **Java-only syntax highlighting**: Monaco editor hardcoded to Java
3. **Python dependency**: Report generation requires Python environment setup
4. **No submission editing**: Students cannot edit after submitting
5. **No rubric editing after use**: Changing rubric criteria after scores exist could cause issues
6. **Trusted email domain disabled**: The domain restriction code is commented out
7. **Report class statistics bug**: `class_statistics` has `"median"` key twice (overwriting `"total_average"`)
8. **Missing timestamps in section_memberships**: Deliberately removed, but loses audit trail
9. **No pagination**: Large classes could have performance issues

---

## File Paths Reference

| Purpose | Path |
|---------|------|
| User model | `lib/spig/accounts/user.ex` |
| Session token model | `lib/spig/accounts/user_token.ex` |
| Google JWT verification | `lib/spig/google_token.ex` |
| Authentication plug | `lib/spig_web/user_auth.ex` |
| Authorization plug | `lib/spig_web/authorization.ex` |
| Router | `lib/spig_web/router.ex` |
| Student grading view | `lib/spig_web/controllers/live/student_view.ex` |
| Section management | `lib/spig_web/controllers/live/manage_section.ex` |
| Report generation | `lib/spig/report.ex` |
| Grade calculations | `python_data/data.py` |
| Main CSS | `priv/static/styles/app.css` |
| Client JS | `assets/js/app.js` |

