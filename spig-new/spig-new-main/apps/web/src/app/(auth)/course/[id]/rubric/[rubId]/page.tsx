'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Criteria {
  id: number;
  name: string;
  description: string | null;
  points: number;
  rubricId: number;
}

interface Rubric {
  id: number;
  name: string;
  courseId: number;
  criteria: Criteria[];
}

export default function RubricEditorPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const rubricId = Number(params.rubId);

  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New criteria form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPoints, setNewPoints] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPoints, setEditPoints] = useState(0);

  const loadRubric = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get<Rubric>(`/courses/${courseId}/rubrics/${rubricId}`);
      setRubric(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rubric');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, rubricId]);

  useEffect(() => {
    loadRubric();
  }, [loadRubric]);

  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const criteria = await api.post<Criteria>(`/courses/${courseId}/rubrics/${rubricId}/criteria`, {
        name: newName,
        description: newDescription || null,
        points: newPoints,
      });
      
      setRubric((prev) => prev ? {
        ...prev,
        criteria: [...prev.criteria, criteria],
      } : null);
      
      // Reset form
      setNewName('');
      setNewDescription('');
      setNewPoints(1);
    } catch (err: any) {
      alert(err.message || 'Failed to add criteria');
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEdit = (criteria: Criteria) => {
    setEditingId(criteria.id);
    setEditName(criteria.name);
    setEditDescription(criteria.description || '');
    setEditPoints(criteria.points);
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;

    try {
      const updated = await api.put<Criteria>(
        `/courses/${courseId}/rubrics/${rubricId}/criteria/${editingId}`,
        {
          name: editName,
          description: editDescription || null,
          points: editPoints,
        }
      );

      setRubric((prev) => prev ? {
        ...prev,
        criteria: prev.criteria.map((c) => c.id === editingId ? updated : c),
      } : null);

      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update criteria');
    }
  };

  const handleDeleteCriteria = async (criteriaId: number) => {
    if (!confirm('Are you sure you want to delete this criteria?')) return;

    try {
      await api.delete(`/courses/${courseId}/rubrics/${rubricId}/criteria/${criteriaId}`);
      setRubric((prev) => prev ? {
        ...prev,
        criteria: prev.criteria.filter((c) => c.id !== criteriaId),
      } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete criteria');
    }
  };

  const totalPoints = rubric?.criteria.reduce((sum, c) => sum + c.points, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading rubric...</div>
      </div>
    );
  }

  if (error || !rubric) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error">{error || 'Rubric not found'}</p>
        <Link href={`/course/${courseId}`} className="btn btn-secondary">
          ← Back to Course
        </Link>
      </div>
    );
  }

  // Separate positive and negative criteria
  const positiveCriteria = rubric.criteria.filter((c) => c.points >= 0);
  const negativeCriteria = rubric.criteria.filter((c) => c.points < 0);
  const positiveTotal = positiveCriteria.reduce((sum, c) => sum + c.points, 0);
  const negativeTotal = negativeCriteria.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header with Breadcrumbs */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-sm text-text-muted">
          <Link href="/home" className="hover:text-accent transition-colors">
            Courses
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/course/${courseId}`} className="hover:text-accent transition-colors">
            Course
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-text">Rubric</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
      <div>
            <h1 className="text-3xl font-bold mb-2">{rubric.name}</h1>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span>{rubric.criteria.length} criteria</span>
              <span>•</span>
              <span className="font-medium text-text">
                {totalPoints > 0 ? '+' : ''}{totalPoints.toFixed(1)} total points
              </span>
            </div>
          </div>
          {rubric.criteria.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-text-muted mb-1">Points breakdown</div>
              <div className="flex items-center gap-3">
                <span className="text-success font-semibold">+{positiveTotal.toFixed(1)}</span>
                {negativeTotal !== 0 && (
                  <>
                    <span className="text-text-muted">/</span>
                    <span className="text-error font-semibold">{negativeTotal.toFixed(1)}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-6">
        {rubric.criteria.length === 0 ? (
          <div className="card">
            <div className="empty-state py-8">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No criteria yet</div>
              <div className="empty-state-description">
                Add criteria below to define how submissions will be graded.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Positive Criteria */}
            {positiveCriteria.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-text">Positive Points</h2>
                <div className="space-y-2">
                  {positiveCriteria.map((criteria) => (
              <div
                key={criteria.id}
                      className="card bg-background border-border-subtle hover:border-border transition-all"
              >
                {editingId === criteria.id ? (
                  // Edit mode
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">
                              Criteria Name
                            </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input"
                              placeholder="e.g., Correct output"
                              autoFocus
                    />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">
                              Description <span className="text-text-subtle">(optional)</span>
                            </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="input"
                              placeholder="Additional details..."
                    />
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-text-muted mb-1.5">
                                Points
                              </label>
                      <input
                        type="number"
                        value={editPoints}
                        onChange={(e) => setEditPoints(Number(e.target.value))}
                                className="input"
                        step="0.5"
                                min="-100"
                                max="100"
                      />
                    </div>
                    <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="btn btn-primary btn-sm"
                              >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                            </div>
                    </div>
                  </div>
                ) : (
                  // View mode
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <h3 className="font-medium text-text">{criteria.name}</h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`text-base font-semibold ${
                                    criteria.points >= 0 ? 'text-success' : 'text-error'
                                  }`}
                                >
                                  {criteria.points > 0 ? '+' : ''}{criteria.points}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleStartEdit(criteria)}
                                    className="text-text-muted hover:text-accent transition-colors p-1.5 rounded hover:bg-item-hover"
                                    title="Edit"
                                    aria-label="Edit criteria"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCriteria(criteria.id)}
                                    className="text-text-muted hover:text-error transition-colors p-1.5 rounded hover:bg-item-hover"
                                    title="Delete"
                                    aria-label="Delete criteria"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                      {criteria.description && (
                              <p className="text-sm text-text-muted mt-1">{criteria.description}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Negative Criteria */}
            {negativeCriteria.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-text">Deductions</h2>
                <div className="space-y-2">
                  {negativeCriteria.map((criteria) => (
                    <div
                      key={criteria.id}
                      className="card bg-background border-border-subtle hover:border-border transition-all"
                    >
                      {editingId === criteria.id ? (
                        // Edit mode (same as positive)
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">
                              Criteria Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="input"
                              placeholder="e.g., Missing comments"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">
                              Description <span className="text-text-subtle">(optional)</span>
                            </label>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="input"
                              placeholder="Additional details..."
                            />
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-text-muted mb-1.5">
                                Points
                              </label>
                              <input
                                type="number"
                                value={editPoints}
                                onChange={(e) => setEditPoints(Number(e.target.value))}
                                className="input"
                                step="0.5"
                                min="-100"
                                max="100"
                              />
                    </div>
                    <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="btn btn-primary btn-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="btn btn-secondary btn-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // View mode (same as positive)
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <h3 className="font-medium text-text">{criteria.name}</h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-base font-semibold text-error">
                                  {criteria.points}
                                </span>
                                <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(criteria)}
                                    className="text-text-muted hover:text-accent transition-colors p-1.5 rounded hover:bg-item-hover"
                        title="Edit"
                                    aria-label="Edit criteria"
                      >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCriteria(criteria.id)}
                                    className="text-text-muted hover:text-error transition-colors p-1.5 rounded hover:bg-item-hover"
                        title="Delete"
                                    aria-label="Delete criteria"
                      >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                      </button>
                    </div>
                              </div>
                            </div>
                            {criteria.description && (
                              <p className="text-sm text-text-muted mt-1">{criteria.description}</p>
                            )}
                          </div>
                        </div>
                )}
              </div>
            ))}
          </div>
              </div>
            )}
          </>
        )}

        {/* Add Criteria Form */}
        <div className="card bg-background border-2 border-dashed border-border-subtle hover:border-border transition-colors">
          <form onSubmit={handleAddCriteria} className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Add New Criteria</h3>
              <p className="text-xs text-text-muted">
                Use negative points for deductions (e.g., -2 for "Missing comments")
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="new-name" className="block text-xs font-medium text-text-muted mb-1.5">
                  Criteria Name <span className="text-text-subtle">*</span>
                </label>
              <input
                  id="new-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input"
                placeholder="e.g., Correct output"
                required
              />
            </div>
            <div>
                <label htmlFor="new-description" className="block text-xs font-medium text-text-muted mb-1.5">
                  Description
                </label>
              <input
                  id="new-description"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="input"
                  placeholder="Optional details..."
              />
            </div>
            <div>
                <label htmlFor="new-points" className="block text-xs font-medium text-text-muted mb-1.5">
                  Points <span className="text-text-subtle">*</span>
                </label>
              <div className="flex gap-2">
                <input
                    id="new-points"
                  type="number"
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                  className="input"
                  step="0.5"
                    min="-100"
                    max="100"
                  required
                />
                <button
                  type="submit"
                    className="btn btn-primary whitespace-nowrap"
                  disabled={isAdding || !newName.trim()}
                >
                  {isAdding ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

