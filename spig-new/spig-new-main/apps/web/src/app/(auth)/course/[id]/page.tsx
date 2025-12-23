'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CreateSectionDialog } from '@/components/section/CreateSectionDialog';
import { CreateRubricDialog } from '@/components/rubric/CreateRubricDialog';
import { CreateAssignmentDialog } from '@/components/assignment/CreateAssignmentDialog';

interface Criteria {
  id: number;
  name: string;
  description: string | null;
  points: number;
}

interface Rubric {
  id: number;
  name: string;
  criteria: Criteria[];
  _count?: { criteria: number };
}

interface Assignment {
  id: number;
  name: string;
  instructions: string | null;
  rubricId: number | null;
  rubric?: Rubric | null;
}

interface Section {
  id: number;
  name: string;
  year: number;
  semester: string;
  status: string;
  linkActive: boolean;
  joinableCode: string;
  _count?: { memberships: number };
}

interface Course {
  id: number;
  name: string;
  teacherId: number;
  createdAt: string;
  sections: Section[];
  rubrics: Rubric[];
  assignments: Assignment[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon?: string }> = {
  WAITING: { 
    label: 'Waiting', 
    color: 'text-gray-300', 
    bgColor: 'bg-gray-500/20 border-gray-500/30',
    icon: '⏳'
  },
  WRITING: { 
    label: 'Writing', 
    color: 'text-blue-300', 
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    icon: '✍️'
  },
  GRADING_INDIVIDUAL: { 
    label: 'Grading Individually', 
    color: 'text-amber-300', 
    bgColor: 'bg-amber-500/20 border-amber-500/30',
    icon: '📝'
  },
  GRADING_GROUPS: { 
    label: 'Grading in Groups', 
    color: 'text-purple-300', 
    bgColor: 'bg-purple-500/20 border-purple-500/30',
    icon: '👥'
  },
  VIEWING_RESULTS: { 
    label: 'Viewing Results', 
    color: 'text-green-300', 
    bgColor: 'bg-green-500/20 border-green-500/30',
    icon: '📊'
  },
};

export default function CoursePage() {
  const params = useParams();
  const courseId = Number(params.id);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<Course>(`/courses/${courseId}`);
      setCourse(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSectionCreated = (section: Section) => {
    setCourse((prev) => prev ? {
      ...prev,
      sections: [section, ...prev.sections],
    } : null);
    setSectionDialogOpen(false);
  };

  const handleRubricCreated = (rubric: Rubric) => {
    setCourse((prev) => prev ? {
      ...prev,
      rubrics: [rubric, ...prev.rubrics],
    } : null);
    setRubricDialogOpen(false);
  };

  const handleAssignmentCreated = (assignment: Assignment) => {
    setCourse((prev) => prev ? {
      ...prev,
      assignments: [assignment, ...prev.assignments],
    } : null);
    setAssignmentDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="skeleton h-4 w-48 rounded"></div>
          <div className="skeleton h-8 w-64 rounded"></div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="skeleton h-6 w-32 rounded"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="card">
                  <div className="skeleton h-6 w-3/4 mb-3 rounded"></div>
                  <div className="skeleton h-4 w-full rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error">{error || 'Course not found'}</p>
        <Link href="/home" className="btn btn-secondary">
          ← Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header with Breadcrumbs */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-sm text-text-muted">
          <Link href="/home" className="hover:text-accent transition-colors">
            Courses
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-text">{course.name}</span>
        </nav>
          <h1 className="text-3xl font-bold">{course.name}</h1>
      </div>

      {/* Sections */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sections</h2>
          <button
            onClick={() => setSectionDialogOpen(true)}
            className="btn btn-primary"
          >
            + New Section
          </button>
        </div>

        {course.sections.length === 0 ? (
          <div className="card">
            <div className="empty-state py-8">
              <div className="empty-state-icon">📂</div>
              <div className="empty-state-title">No sections yet</div>
              <div className="empty-state-description">
                Create a section to organize students and run grading activities.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {course.sections.map((section) => {
              const statusConfig = STATUS_CONFIG[section.status] || STATUS_CONFIG.WAITING;
              return (
              <Link
                key={section.id}
                href={`/course/${courseId}/section/${section.id}`}
                  className="card card-hover group"
              >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <h3 className="text-lg font-semibold group-hover:text-accent transition-colors flex-1">
                    {section.name}
                  </h3>
                  <span
                      className={`status-badge ${statusConfig.bgColor} ${statusConfig.color} border flex-shrink-0`}
                  >
                      <span className="text-xs">{statusConfig.icon}</span>
                      <span className="hidden sm:inline">{statusConfig.label}</span>
                      <span className="sm:hidden">{statusConfig.label.split(' ')[0]}</span>
                  </span>
                </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{section.semester} {section.year}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{section._count?.memberships || 0} students</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${section.linkActive ? 'bg-success' : 'bg-text-subtle'}`} />
                      <span className="text-text-subtle">
                    Join link {section.linkActive ? 'active' : 'inactive'}
                      </span>
                    </div>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Rubrics */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rubrics</h2>
          <button
            onClick={() => setRubricDialogOpen(true)}
            className="btn btn-primary"
          >
            + New Rubric
          </button>
        </div>

        {course.rubrics.length === 0 ? (
          <div className="card">
            <div className="empty-state py-8">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No rubrics yet</div>
              <div className="empty-state-description">
                Create a rubric to define how submissions will be graded.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {course.rubrics.map((rubric) => {
              const criteriaCount = rubric._count?.criteria || rubric.criteria?.length || 0;
              const totalPoints = rubric.criteria?.reduce((sum, c) => sum + c.points, 0) || 0;
              return (
              <Link
                key={rubric.id}
                href={`/course/${courseId}/rubric/${rubric.id}`}
                  className="card card-hover group"
              >
                  <h3 className="text-lg font-semibold group-hover:text-accent transition-colors mb-3">
                  {rubric.name}
                </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span>{criteriaCount} {criteriaCount === 1 ? 'criterion' : 'criteria'}</span>
                    </div>
                    {totalPoints !== 0 && (
                      <div className="text-xs font-medium text-text">
                        {totalPoints > 0 ? '+' : ''}{totalPoints.toFixed(1)} total points
                      </div>
                    )}
                  </div>
              </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Assignments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Assignments</h2>
          <button
            onClick={() => setAssignmentDialogOpen(true)}
            className="btn btn-primary"
          >
            + New Assignment
          </button>
        </div>

        {course.assignments.length === 0 ? (
          <div className="card">
            <div className="empty-state py-8">
              <div className="empty-state-icon">📄</div>
              <div className="empty-state-title">No assignments yet</div>
              <div className="empty-state-description">
                Create an assignment to give students work to complete and submit.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {course.assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/course/${courseId}/assignment/${assignment.id}`}
                className="card card-hover group"
              >
                <h3 className="text-lg font-semibold group-hover:text-accent transition-colors mb-3">
                  {assignment.name}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  {assignment.rubric ? (
                    <>
                      <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-text-muted">Rubric: <span className="text-text">{assignment.rubric.name}</span></span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-error flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-text-muted">No rubric assigned</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Dialogs */}
      <CreateSectionDialog
        isOpen={sectionDialogOpen}
        onClose={() => setSectionDialogOpen(false)}
        onCreated={handleSectionCreated}
        courseId={courseId}
      />

      <CreateRubricDialog
        isOpen={rubricDialogOpen}
        onClose={() => setRubricDialogOpen(false)}
        onCreated={handleRubricCreated}
        courseId={courseId}
      />

      <CreateAssignmentDialog
        isOpen={assignmentDialogOpen}
        onClose={() => setAssignmentDialogOpen(false)}
        onCreated={handleAssignmentCreated}
        courseId={courseId}
        rubrics={course.rubrics}
      />
    </div>
  );
}

