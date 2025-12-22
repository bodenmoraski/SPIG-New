'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface CreateCourseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (course: any) => void;
}

export function CreateCourseDialog({ isOpen, onClose, onCreated }: CreateCourseDialogProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const course = await api.post('/courses', { name });
      onCreated(course);
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create course');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div 
        className="relative card w-full max-w-md animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="dialog-title" className="text-xl font-semibold">Create New Course</h2>
          <button
            onClick={onClose}
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
              Course Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., AP Computer Science"
              required
              minLength={2}
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-text-muted mt-1.5">
              Choose a clear, descriptive name for your course
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
              onClick={onClose}
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
              {isLoading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
