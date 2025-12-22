'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface CreateRubricDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (rubric: any) => void;
  courseId: number;
}

export function CreateRubricDialog({
  isOpen,
  onClose,
  onCreated,
  courseId,
}: CreateRubricDialogProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const rubric = await api.post(`/courses/${courseId}/rubrics`, { name });
      onCreated(rubric);
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create rubric');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div 
        className="relative card w-full max-w-md animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rubric-dialog-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="rubric-dialog-title" className="text-xl font-semibold">Create New Rubric</h2>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text transition-colors p-1 rounded hover:bg-item-hover"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
              Rubric Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Java Code Quality"
              required
              minLength={1}
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-text-muted mt-1.5">
              You can add criteria after creating the rubric.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-md">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Rubric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

