'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Rubric {
  id: number;
  name: string;
}

interface Assignment {
  id: number;
  name: string;
  instructions: string | null;
  rubricId: number | null;
  rubric: Rubric | null;
  courseId: number;
}

export default function AssignmentPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const assignmentId = Number(params.assignId);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [hasPdf, setHasPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssignment = useCallback(async () => {
    try {
      setIsLoading(true);
      const [assignmentData, rubricsData] = await Promise.all([
        api.get<Assignment>(`/courses/${courseId}/assignments/${assignmentId}`),
        api.get<Rubric[]>(`/courses/${courseId}/rubrics`),
      ]);
      setAssignment(assignmentData);
      setRubrics(rubricsData);
      
      // Check if PDF exists
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/courses/${courseId}/assignments/${assignmentId}/pdf`,
          { method: 'HEAD', credentials: 'include' }
        );
        setHasPdf(response.ok);
      } catch {
        setHasPdf(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, assignmentId]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const handleRubricChange = async (rubricId: number | null) => {
    try {
      const updated = await api.put<Assignment>(
        `/courses/${courseId}/assignments/${assignmentId}/rubric`,
        { rubricId }
      );
      setAssignment((prev) => prev ? { ...prev, ...updated } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to update rubric');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.upload(`/courses/${courseId}/assignments/${assignmentId}/pdf`, formData);
      setHasPdf(true);
    } catch (err: any) {
      alert(err.message || 'Failed to upload PDF');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePdf = async () => {
    if (!confirm('Are you sure you want to delete the PDF?')) return;

    try {
      await api.delete(`/courses/${courseId}/assignments/${assignmentId}/pdf`);
      setHasPdf(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete PDF');
    }
  };

  const handleDeleteAssignment = async () => {
    if (!confirm('Are you sure you want to delete this assignment? This cannot be undone.')) return;

    try {
      await api.delete(`/courses/${courseId}/assignments/${assignmentId}`);
      window.location.href = `/course/${courseId}`;
    } catch (err: any) {
      alert(err.message || 'Failed to delete assignment');
    }
  };

  const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/courses/${courseId}/assignments/${assignmentId}/pdf`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading assignment...</div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error">{error || 'Assignment not found'}</p>
        <Link href={`/course/${courseId}`} className="btn btn-secondary">
          ← Back to Course
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/course/${courseId}`}
            className="text-text-muted hover:text-accent text-sm mb-2 block"
          >
            ← Back to Course
          </Link>
          <h1 className="text-3xl font-bold">{assignment.name}</h1>
        </div>
        <button onClick={handleDeleteAssignment} className="btn btn-danger">
          Delete Assignment
        </button>
      </div>

      {/* Rubric Assignment */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Rubric</h2>
        
        {rubrics.length === 0 ? (
          <p className="text-text-muted">
            No rubrics available.{' '}
            <Link href={`/course/${courseId}`} className="text-accent hover:underline">
              Create one first.
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="rubric" className="block text-sm font-medium mb-1">
                Assigned Rubric
              </label>
              <select
                id="rubric"
                value={assignment.rubricId || ''}
                onChange={(e) => handleRubricChange(e.target.value ? Number(e.target.value) : null)}
                className="input"
              >
                <option value="">No rubric assigned</option>
                {rubrics.map((rubric) => (
                  <option key={rubric.id} value={rubric.id}>
                    {rubric.name}
                  </option>
                ))}
              </select>
            </div>

            {assignment.rubric && (
              <Link
                href={`/course/${courseId}/rubric/${assignment.rubric.id}`}
                className="text-accent hover:underline text-sm"
              >
                Edit rubric criteria →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* PDF Instructions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">PDF Instructions</h2>

        {hasPdf ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                View PDF →
              </a>
              <button onClick={handleDeletePdf} className="btn btn-danger">
                Delete PDF
              </button>
            </div>
            <p className="text-sm text-text-muted">
              Students will see this PDF during the writing phase.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-text-muted">No PDF uploaded yet.</p>
            
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className={`btn btn-primary cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
              >
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </label>
            </div>

            {isUploading && (
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <p className="text-sm text-text-muted">
              Maximum file size: 10MB. Only PDF files are accepted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

