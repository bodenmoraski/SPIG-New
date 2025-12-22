'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSectionSocket, useScoreSocket } from '@/hooks/useSocket';
import { Confetti } from '@/components/effects/Confetti';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

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
}

interface Assignment {
  id: number;
  name: string;
  instructions: string | null;
  rubric: Rubric | null;
}

interface Submission {
  id: number;
  value: string;
  studentId: number;
}

interface Score {
  id: number;
  evaluation: Record<string, boolean>;
  signed: Record<string, boolean>;
  done: boolean;
  submissionId: number;
  scorerId: number | null;
  groupId: number | null;
}

interface GroupMember {
  id: number;
  name: string;
  avatar: string | null;
}

interface Section {
  id: number;
  name: string;
  status: string;
  assignmentId: number | null;
  assignment: Assignment | null;
  course: { id: number; name: string };
  teacher: User;
  isTeacher?: boolean;
}

interface GradingResult {
  teacher_only?: number;
  students_only?: number;
  groups_only?: number;
  total_average?: number;
  weighted_average?: number;
  highest?: number;
  lowest?: number;
  median?: number;
}

export default function StudentSectionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const sectionId = Number(params.id);
  const isStudentView = searchParams.get('student_view') === '1';

  // State
  const [section, setSection] = useState<Section | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState<Submission | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [localEvaluation, setLocalEvaluation] = useState<Record<string, boolean>>({});
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [results, setResults] = useState<GradingResult | null>(null);
  const [hasPdf, setHasPdf] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Code editor state
  const [code, setCode] = useState('');
  const editorRef = useRef<any>(null);

  // Sockets
  const { socket: sectionSocket, isConnected: sectionConnected } = useSectionSocket(sectionId);
  const { socket: scoreSocket, isConnected: scoreConnected } = useScoreSocket();

  // Load section data
  const loadSection = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get<Section>(`/sections/${sectionId}${isStudentView ? '?student_view=1' : ''}`);
      setSection(data);

      // Check if user has submitted
      if (data.assignment?.id) {
        try {
          const submission = await api.get<Submission | null>(`/sections/${sectionId}/submissions/mine`);
          setSubmitted(!!submission);
        } catch {
          setSubmitted(false);
        }

        // Check if PDF exists
        if (data.assignment) {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/courses/${data.course.id}/assignments/${data.assignment.id}/pdf`,
              { method: 'HEAD', credentials: 'include' }
            );
            setHasPdf(response.ok);
          } catch {
            setHasPdf(false);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load section');
    } finally {
      setIsLoading(false);
    }
  }, [sectionId, isStudentView]);

  // Load next submission for grading
  const loadNextSubmission = useCallback(async () => {
    if (!section?.status.includes('GRADING')) return;

    try {
      const submission = await api.get<Submission | null>(`/sections/${sectionId}/submissions/next`);
      setReviewing(submission);
      
      if (submission) {
        setCode(submission.value);
        
        // For group grading, fetch the score
        if (section.status === 'GRADING_GROUPS' && groupId) {
          try {
            const scoreData = await api.get<Score>(`/sections/${sectionId}/scores/group?submissionId=${submission.id}`);
            setScore(scoreData);
            setLocalEvaluation(scoreData.evaluation);
          } catch {
            // Create new score
            setScore(null);
            setLocalEvaluation({});
          }
        } else {
          setLocalEvaluation({});
        }
      }
    } catch (err: any) {
      console.error('Failed to load next submission:', err);
    }
  }, [section, sectionId, groupId]);

  // Load group info
  const loadGroupInfo = useCallback(async () => {
    if (section?.status !== 'GRADING_GROUPS') return;

    try {
      const groupData = await api.get<{ groupId: number; members: GroupMember[] }>(`/sections/${sectionId}/group`);
      setGroupId(groupData.groupId);
      setGroupMembers(groupData.members);
    } catch {
      // Not in a group yet
    }
  }, [section?.status, sectionId]);

  // Load results
  const loadResults = useCallback(async () => {
    if (section?.status !== 'VIEWING_RESULTS') return;

    try {
      const resultsData = await api.get<GradingResult>(`/sections/${sectionId}/results`);
      setResults(resultsData);
    } catch {
      setResults(null);
    }
  }, [section?.status, sectionId]);

  useEffect(() => {
    loadSection();
  }, [loadSection]);

  useEffect(() => {
    loadNextSubmission();
  }, [section?.status, loadNextSubmission]);

  useEffect(() => {
    loadGroupInfo();
  }, [loadGroupInfo]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Socket: Section updates
  useEffect(() => {
    if (!sectionSocket || !sectionConnected) return;

    sectionSocket.on('section:updated', (updated: Partial<Section>) => {
      setSection((prev) => {
        if (!prev) return null;
        const newSection = { ...prev, ...updated };
        return newSection;
      });
    });

    sectionSocket.on('report:generated', () => {
      loadResults();
    });

    return () => {
      sectionSocket.off('section:updated');
      sectionSocket.off('report:generated');
    };
  }, [sectionSocket, sectionConnected, loadResults]);

  // Socket: Score updates (group grading)
  useEffect(() => {
    if (!scoreSocket || !scoreConnected || !groupId) return;

    // Join group room
    scoreSocket.emit('group:join', groupId);

    scoreSocket.on('score:updated', (data: { groupId: number; score: Score; consensusReached?: boolean }) => {
      if (data.groupId === groupId) {
        setScore(data.score);
        setLocalEvaluation(data.score.evaluation);
        
        // If consensus reached, load next submission
        if (data.consensusReached) {
          loadNextSubmission();
        }
      }
    });

    return () => {
      scoreSocket.off('score:updated');
    };
  }, [scoreSocket, scoreConnected, groupId, loadNextSubmission]);

  // Handle code submission
  const handleSubmitCode = async () => {
    if (!code.trim()) {
      alert('Please enter your code');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/sections/${sectionId}/submissions`, { value: code });
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle evaluation checkbox change (individual)
  const handleCheckboxChange = (criteriaId: string, checked: boolean) => {
    const newEval = { ...localEvaluation, [criteriaId]: checked };
    setLocalEvaluation(newEval);
  };

  // Handle individual score submission
  const handleSubmitIndividualScore = async () => {
    if (!reviewing || !section?.assignment?.rubric) return;

    setIsSubmitting(true);
    try {
      await api.post(`/sections/${sectionId}/scores`, {
        submissionId: reviewing.id,
        assignmentId: section.assignmentId,
        rubricId: section.assignment.rubric.id,
        evaluation: localEvaluation,
      });
      
      // Load next submission
      loadNextSubmission();
    } catch (err: any) {
      alert(err.message || 'Failed to submit score');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle group evaluation change
  const handleGroupEvaluationChange = (criteriaId: string, checked: boolean) => {
    if (!score || !scoreSocket || !groupId) return;

    const newEval = { ...localEvaluation, [criteriaId]: checked };
    setLocalEvaluation(newEval);

    // Emit to server (this clears all signatures)
    scoreSocket.emit('evaluation:update', {
      scoreId: score.id,
      evaluation: newEval,
    });
  };

  // Handle group agreement
  const handleAgree = () => {
    if (!score || !scoreSocket || !groupId) return;

    scoreSocket.emit('evaluation:agree', {
      scoreId: score.id,
      groupId,
    });
  };

  // Calculate score progress
  const getSignedCount = () => {
    if (!score?.signed) return 0;
    return Object.values(score.signed).filter(Boolean).length;
  };

  // Calculate rubric points
  const calculatePoints = () => {
    if (!section?.assignment?.rubric?.criteria) return 0;
    return section.assignment.rubric.criteria.reduce((sum, c) => {
      return sum + (localEvaluation[String(c.id)] ? c.points : 0);
    }, 0);
  };

  // Format group members string
  const formatGroupMembers = () => {
    const others = groupMembers.filter((m) => m.id !== user?.id);
    if (others.length === 0) return 'only yourself';
    if (others.length === 1) return others[0].name;
    const last = others.pop();
    return `${others.map((m) => m.name).join(', ')}, and ${last?.name}`;
  };

  const pdfUrl = section?.assignment ? 
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/courses/${section.course.id}/assignments/${section.assignment.id}/pdf` 
    : '';

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="skeleton w-12 h-12 rounded-full"></div>
          <div className="skeleton h-4 w-32 rounded"></div>
          <div className="skeleton h-4 w-48 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <p className="text-error">{error || 'Section not found'}</p>
      </div>
    );
  }

  // WAITING STATE
  if (section.status === 'WAITING') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="card max-w-md w-full">
          <div className="empty-state py-12">
            <div className="empty-state-icon">⏳</div>
            <div className="empty-state-title">Waiting for Activity</div>
            <div className="empty-state-description">
              Your teacher hasn't started an activity yet. Please wait for instructions.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WRITING STATE
  if (section.status === 'WRITING') {
    if (submitted) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <div className="empty-state py-12">
              <div className="empty-state-icon">✓</div>
              <div className="empty-state-title text-success">Submitted!</div>
              <div className="empty-state-description">
                Your response has been submitted. Please wait for the grading phase to begin.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h1 className="text-xl font-bold">{section.assignment?.name || 'Assignment'}</h1>
            <p className="text-sm text-text-muted">{section.course.name} • {section.name}</p>
          </div>
          <div className="flex gap-2">
            {hasPdf && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                View Instructions →
              </a>
            )}
            <button
              onClick={handleSubmitCode}
              disabled={isSubmitting || !code.trim()}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <MonacoEditor
            height="100%"
            defaultLanguage="java"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              tabSize: 2,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>
    );
  }

  // GRADING STATES (Individual or Group)
  if (section.status === 'GRADING_INDIVIDUAL' || section.status === 'GRADING_GROUPS') {
    const isGroupGrading = section.status === 'GRADING_GROUPS';

    // Nothing to review
    if (!reviewing) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <div className="empty-state py-12">
              <div className="empty-state-icon">🎉</div>
              <div className="empty-state-title">All Done!</div>
              <div className="empty-state-description">
                There are no more submissions to review. Please wait for the next phase.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Panel - Rubric */}
        <div className="w-96 border-r border-border-subtle flex flex-col bg-item-bg">
          <div className="p-5 border-b border-border-subtle">
            <h2 className="font-semibold text-lg text-text mb-1">
              {section.assignment?.rubric?.name || 'Rubric'}
            </h2>
            {isGroupGrading && (
              <div className="mt-2 p-2 bg-background rounded-md">
                <p className="text-sm text-text-muted">
                  <span className="font-medium text-text">Group grading:</span>{' '}
                  You're working with {formatGroupMembers()}
                </p>
              </div>
            )}
          </div>

          {/* Criteria */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {section.assignment?.rubric?.criteria.map((criteria) => (
              <label
                key={criteria.id}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  localEvaluation[String(criteria.id)]
                    ? 'bg-background border border-accent/30'
                    : 'bg-background border border-transparent hover:border-border-subtle'
                }`}
              >
                <input
                  type="checkbox"
                  checked={localEvaluation[String(criteria.id)] || false}
                  onChange={(e) => 
                    isGroupGrading 
                      ? handleGroupEvaluationChange(String(criteria.id), e.target.checked)
                      : handleCheckboxChange(String(criteria.id), e.target.checked)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-text">{criteria.name}</span>
                    <span
                      className={`font-semibold text-sm flex-shrink-0 ${
                        criteria.points >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {criteria.points > 0 ? '+' : ''}{criteria.points}
                    </span>
                  </div>
                  {criteria.description && (
                    <p className="text-sm text-text-muted leading-relaxed">{criteria.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Footer - Score & Actions */}
          <div className="p-4 border-t border-border-subtle space-y-3 bg-background">
            <div className="flex items-center justify-between p-3 bg-item-bg rounded-lg border border-border-subtle">
              <span className="font-medium text-text">Total Points:</span>
              <span className="text-xl font-bold text-text">{calculatePoints()}</span>
            </div>

            {isGroupGrading ? (
              <>
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Group consensus</span>
                    <span className="font-medium text-text">
                      {getSignedCount()}/{groupMembers.length} agreed
                    </span>
                  </div>
                  <div className="progress-bar bg-background">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${(getSignedCount() / groupMembers.length) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAgree}
                  disabled={score?.signed?.[String(user?.id)] || isSubmitting}
                  className="btn btn-primary w-full"
                >
                  {score?.signed?.[String(user?.id)]
                    ? `✓ Agreed (${getSignedCount()}/${groupMembers.length})`
                    : `Lock in score (${getSignedCount()}/${groupMembers.length})`}
                </button>
              </>
            ) : (
              <button
                onClick={handleSubmitIndividualScore}
                disabled={isSubmitting}
                className="btn btn-primary w-full"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit & Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Code Viewer */}
        <div className="flex-1 flex flex-col bg-background">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="font-semibold text-text">Code Review</h2>
          </div>
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              defaultLanguage="java"
              theme="vs-dark"
              value={code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                tabSize: 2,
                automaticLayout: true,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // VIEWING RESULTS STATE
  if (section.status === 'VIEWING_RESULTS') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Confetti trigger={!!results} duration={4000} />
        <div className="card max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎊</div>
            <h1 className="text-3xl font-bold mb-2">Results</h1>
            <p className="text-text-muted">{section.assignment?.name}</p>
          </div>

          {results ? (
            <div className="space-y-4">
              {results.weighted_average !== undefined && (
                <div className="text-center p-6 bg-background rounded-lg">
                  <p className="text-text-muted text-sm mb-1">Your Weighted Average</p>
                  <p className="text-5xl font-bold text-accent">
                    {results.weighted_average.toFixed(1)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {results.teacher_only !== undefined && (
                  <div className="p-4 bg-background rounded-lg text-center">
                    <p className="text-text-muted text-xs">Teacher Score</p>
                    <p className="text-xl font-bold">{results.teacher_only.toFixed(1)}</p>
                  </div>
                )}
                {results.students_only !== undefined && (
                  <div className="p-4 bg-background rounded-lg text-center">
                    <p className="text-text-muted text-xs">Peer Average</p>
                    <p className="text-xl font-bold">{results.students_only.toFixed(1)}</p>
                  </div>
                )}
                {results.groups_only !== undefined && (
                  <div className="p-4 bg-background rounded-lg text-center">
                    <p className="text-text-muted text-xs">Group Average</p>
                    <p className="text-xl font-bold">{results.groups_only.toFixed(1)}</p>
                  </div>
                )}
                {results.total_average !== undefined && (
                  <div className="p-4 bg-background rounded-lg text-center">
                    <p className="text-text-muted text-xs">Total Average</p>
                    <p className="text-xl font-bold">{results.total_average.toFixed(1)}</p>
                  </div>
                )}
              </div>

              {(results.highest !== undefined || results.lowest !== undefined || results.median !== undefined) && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-text-muted mb-2">Score Range</p>
                  <div className="flex justify-between text-sm">
                    <span>Lowest: {results.lowest?.toFixed(1)}</span>
                    <span>Median: {results.median?.toFixed(1)}</span>
                    <span>Highest: {results.highest?.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-muted text-center">
              Results are being calculated. Please wait...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="card max-w-md text-center">
        <p className="text-text-muted">Unknown section status: {section.status}</p>
      </div>
    </div>
  );
}

