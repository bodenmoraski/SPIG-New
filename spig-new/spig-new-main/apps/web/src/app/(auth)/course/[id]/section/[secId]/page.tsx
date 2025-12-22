'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useSectionSocket } from '@/hooks/useSocket';
import { InviteLinkDialog } from '@/components/section/InviteLinkDialog';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

interface Membership {
  id: number;
  userId: number;
  groupId: number | null;
  user: User;
}

interface Assignment {
  id: number;
  name: string;
  rubricId: number | null;
}

interface Section {
  id: number;
  name: string;
  year: number;
  semester: string;
  status: string;
  linkActive: boolean;
  joinableCode: string;
  assignmentId: number | null;
  assignment: Assignment | null;
  course: { id: number; name: string };
  teacher: User;
  members: Membership[];
}

const STATUSES = [
  'WAITING',
  'WRITING',
  'GRADING_INDIVIDUAL',
  'GRADING_GROUPS',
  'VIEWING_RESULTS',
];

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Waiting',
  WRITING: 'Writing',
  GRADING_INDIVIDUAL: 'Grading Individually',
  GRADING_GROUPS: 'Grading in Groups',
  VIEWING_RESULTS: 'Viewing Results',
};

export default function ManageSectionPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const sectionId = Number(params.secId);

  const [section, setSection] = useState<Section | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [generateReportOpen, setGenerateReportOpen] = useState(false);

  // Socket connection for real-time updates
  const { socket, isConnected } = useSectionSocket(sectionId);

  // Load section data
  const loadSection = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sectionData, assignmentsData] = await Promise.all([
        api.get<Section>(`/courses/${courseId}/sections/${sectionId}`),
        api.get<Assignment[]>(`/courses/${courseId}/assignments`),
      ]);
      setSection(sectionData);
      setAssignments(assignmentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load section');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, sectionId]);

  useEffect(() => {
    loadSection();
  }, [loadSection]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('sectionManagement:join', sectionId);

    socket.on('section:studentJoined', (student: User) => {
      setSection((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: [...prev.members, { id: 0, userId: student.id, groupId: null, user: student }],
        };
      });
    });

    socket.on('section:submissionReceived', () => {
      setSubmissionCount((prev) => prev + 1);
    });

    socket.on('section:updated', (updated: Partial<Section>) => {
      setSection((prev) => prev ? { ...prev, ...updated } : null);
    });

    return () => {
      socket.off('section:studentJoined');
      socket.off('section:submissionReceived');
      socket.off('section:updated');
    };
  }, [socket, isConnected, sectionId]);

  // Actions
  const handleSetAssignment = async (assignmentId: number) => {
    try {
      const updated = await api.post(`/courses/${courseId}/sections/${sectionId}/assignment`, {
        assignmentId,
      });
      setSection((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to set assignment');
    }
  };

  const handleNextStatus = async () => {
    if (!section) return;

    const currentIndex = STATUSES.indexOf(section.status);
    if (currentIndex >= STATUSES.length - 1) return;

    const nextStatus = STATUSES[currentIndex + 1];

    try {
      const updated = await api.post(`/courses/${courseId}/sections/${sectionId}/status`, {
        status: nextStatus,
      });
      setSection((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handlePrevStatus = async () => {
    if (!section) return;

    const currentIndex = STATUSES.indexOf(section.status);
    if (currentIndex <= 0) return;

    const prevStatus = STATUSES[currentIndex - 1];

    try {
      const updated = await api.post(`/courses/${courseId}/sections/${sectionId}/status`, {
        status: prevStatus,
      });
      setSection((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleEndActivity = async () => {
    try {
      const updated = await api.delete(`/courses/${courseId}/sections/${sectionId}/assignment`);
      setSection((prev) => prev ? { ...prev, ...updated, assignment: null, assignmentId: null } : null);
      setSubmissionCount(0);
    } catch (err: any) {
      alert(err.message || 'Failed to end activity');
    }
  };

  const handleDeleteSubmissions = async () => {
    try {
      await api.delete(`/courses/${courseId}/sections/${sectionId}/submissions`);
      setSubmissionCount(0);
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete submissions');
    }
  };

  const handleToggleLink = async () => {
    try {
      const updated = await api.put(`/courses/${courseId}/sections/${sectionId}/link`, {});
      setSection((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle link');
    }
  };

  const handleRegenerateLink = async () => {
    try {
      const updated = await api.post(`/courses/${courseId}/sections/${sectionId}/link/regenerate`, {});
      setSection((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate link');
    }
  };

  const handleGenerateReport = async () => {
    try {
      await api.post(`/courses/${courseId}/sections/${sectionId}/reports`, {});
      setGenerateReportOpen(false);
      alert('Report generated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to generate report');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading section...</div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error">{error || 'Section not found'}</p>
        <Link href={`/course/${courseId}`} className="btn btn-secondary">
          ← Back to Course
        </Link>
      </div>
    );
  }

  const currentStatusIndex = STATUSES.indexOf(section.status);
  const prevStatus = currentStatusIndex > 0 ? STATUSES[currentStatusIndex - 1] : null;
  const nextStatus = currentStatusIndex < STATUSES.length - 1 ? STATUSES[currentStatusIndex + 1] : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href={`/course/${courseId}`}
            className="text-text-muted hover:text-accent text-sm mb-2 block"
          >
            ← {section.course.name}
          </Link>
          <h1 className="text-3xl font-bold">{section.name}</h1>
          <p className="text-text-muted">
            {section.semester} {section.year} • Teacher: {section.teacher.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/section/${sectionId}?student_view=1`}
            target="_blank"
            className="btn btn-secondary"
          >
            Open Student View →
          </Link>
          <Link
            href={`/section/${sectionId}`}
            target="_blank"
            className="btn btn-primary"
          >
            Grade Submissions →
          </Link>
        </div>
      </div>

      {/* Invite Link Card */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Invite Link</h2>
        <p className="mb-4">
          Invitations are{' '}
          <span className={section.linkActive ? 'text-success font-bold' : 'text-text-muted font-bold'}>
            {section.linkActive ? 'OPEN' : 'CLOSED'}
          </span>
        </p>
        <button onClick={() => setInviteDialogOpen(true)} className="btn btn-primary">
          Invite Students
        </button>
        <p className="text-sm text-text-muted mt-4">
          {section.members.length} students enrolled
        </p>
      </div>

      {/* Assignment Control Card */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Assignment</h2>

        {!section.assignment ? (
          <div>
            {assignments.length === 0 ? (
              <p className="text-text-muted">
                No assignments available.{' '}
                <Link href={`/course/${courseId}`} className="text-accent hover:underline">
                  Create one first.
                </Link>
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <select
                  className="input flex-1"
                  defaultValue=""
                  onChange={(e) => e.target.value && handleSetAssignment(Number(e.target.value))}
                >
                  <option value="" disabled>
                    Select an assignment
                  </option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {!a.rubricId && '(no rubric)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p>
                Assignment: <span className="font-bold">{section.assignment.name}</span>
              </p>
              <p>
                Submissions: <span className="font-bold">{submissionCount}</span> /{' '}
                {section.members.length}
              </p>
            </div>

            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="btn btn-danger"
              disabled={submissionCount === 0}
            >
              Delete All Submissions
            </button>

            <div className="pt-4 border-t border-border">
              <p className="mb-4">
                This section is <span className="font-bold">{STATUS_LABELS[section.status]}</span>.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePrevStatus}
                  className="btn btn-secondary"
                  disabled={!prevStatus}
                >
                  ← Back to {prevStatus ? STATUS_LABELS[prevStatus] : 'N/A'}
                </button>

                {section.status === 'VIEWING_RESULTS' ? (
                  <button onClick={() => setGenerateReportOpen(true)} className="btn btn-primary">
                    Generate Report
                  </button>
                ) : nextStatus ? (
                  <button onClick={handleNextStatus} className="btn btn-primary">
                    Start {STATUS_LABELS[nextStatus]} →
                  </button>
                ) : null}

                {nextStatus === null && (
                  <button onClick={handleEndActivity} className="btn btn-danger">
                    End Activity
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Students List */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Students ({section.members.length})</h2>
        {section.members.length === 0 ? (
          <p className="text-text-muted">No students have joined yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {section.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 p-2 rounded bg-background">
                {m.user.avatar && (
                  <img
                    src={m.user.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span>{m.user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <InviteLinkDialog
        isOpen={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        joinableCode={section.joinableCode}
        linkActive={section.linkActive}
        onToggle={handleToggleLink}
        onRegenerate={handleRegenerateLink}
        students={section.members.map((m) => m.user)}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeleteConfirmOpen(false)} />
          <div className="relative card w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Are you sure?</h2>
            <p className="text-text-muted mb-6">
              This will <em>irreversibly</em> delete all submissions for the selected assignment.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeleteSubmissions} className="btn btn-danger">
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Dialog */}
      {generateReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setGenerateReportOpen(false)} />
          <div className="relative card w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Generate Report</h2>
            <p className="text-text-muted mb-6">
              The assignment has concluded. If you're done grading submissions, you can generate a
              report.
            </p>
            <div className="flex justify-end gap-3">
              <Link
                href={`/section/${sectionId}`}
                target="_blank"
                className="btn btn-secondary"
              >
                Grade More Submissions
              </Link>
              <button onClick={handleGenerateReport} className="btn btn-primary">
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

