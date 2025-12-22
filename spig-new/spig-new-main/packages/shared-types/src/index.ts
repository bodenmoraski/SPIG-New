// User types
export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  role: Role;
}

// Section status
export type SectionStatus =
  | 'WAITING'
  | 'WRITING'
  | 'GRADING_INDIVIDUAL'
  | 'GRADING_GROUPS'
  | 'VIEWING_RESULTS';

// Socket.IO Events
export interface ServerToClientEvents {
  // Section events
  'section:updated': (section: SectionDto) => void;
  'section:studentJoined': (student: UserDto) => void;
  'section:submissionReceived': (submission: SubmissionInfo) => void;

  // Score events
  'score:updated': (data: ScoreUpdate) => void;
  'score:synchronized': (score: ScoreDto) => void;

  // Report events
  'report:generated': (report: ReportInfo) => void;

  // Join link events
  'joinLink:toggled': (isActive: boolean) => void;

  // Course events
  'course:newSection': (section: SectionDto) => void;
  'course:newAssignment': (assignment: AssignmentDto) => void;
  'course:newRubric': (rubric: RubricDto) => void;
}

export interface ClientToServerEvents {
  // Room management
  'section:join': (sectionId: number) => void;
  'section:leave': (sectionId: number) => void;
  'sectionManagement:join': (sectionId: number) => void;
  'course:join': (courseId: number) => void;

  // Grading actions
  'evaluation:update': (data: UpdateEvaluationDto) => void;
  'evaluation:agree': (data: AgreeDto) => void;
}

// DTOs
export interface UserDto {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface SectionDto {
  id: number;
  name: string;
  status: SectionStatus;
  assignmentId?: number | null;
}

export interface ScoreDto {
  id: number;
  evaluation: Record<string, boolean>;
  signed: Record<string, boolean>;
  done: boolean;
}

export interface ScoreUpdate {
  groupId: number;
  score: ScoreDto;
  consensusReached?: boolean;
}

export interface SubmissionInfo {
  id: number;
  studentId: number;
}

export interface ReportInfo {
  id: number;
  version: number;
  generatedAt: string;
}

export interface AssignmentDto {
  id: number;
  name: string;
}

export interface RubricDto {
  id: number;
  name: string;
}

export interface UpdateEvaluationDto {
  scoreId: number;
  evaluation: Record<string, boolean>;
}

export interface AgreeDto {
  scoreId: number;
  groupId: number;
}

// Grade report types
export interface StudentGrades {
  teacher_only: number | null;
  students_only: number | null;
  groups_only: number | null;
  total_average: number | null;
  weighted_average: number | null;
  highest: number | null;
  lowest: number | null;
  median: number | null;
}

export interface ClassStatistics {
  median: number | null;
  highest: number | null;
  lowest: number | null;
}
