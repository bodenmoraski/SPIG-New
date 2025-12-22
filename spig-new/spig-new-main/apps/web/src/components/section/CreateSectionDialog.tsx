'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface CreateSectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (section: any) => void;
  courseId: number;
}

export function CreateSectionDialog({
  isOpen,
  onClose,
  onCreated,
  courseId,
}: CreateSectionDialogProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const [name, setName] = useState('');
  const [year, setYear] = useState(currentYear);
  const [semester, setSemester] = useState(currentMonth < 6 ? 'Spring' : 'Fall');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const section = await api.post(`/courses/${courseId}/sections`, {
        name,
        year,
        semester,
      });
      onCreated(section);
      // Reset form
      setName('');
      setYear(currentYear);
      setSemester(currentMonth < 6 ? 'Spring' : 'Fall');
    } catch (err: any) {
      setError(err.message || 'Failed to create section');
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
        aria-labelledby="section-dialog-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="section-dialog-title" className="text-xl font-semibold">Create New Section</h2>
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
              Section Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Period 1"
              required
              minLength={1}
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-text mb-2">
                Semester
              </label>
              <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="input"
                required
              >
                <option value="Fall">Fall</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Winter">Winter</option>
              </select>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-text mb-2">
                Year
              </label>
              <input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="input"
                min={2020}
                max={2100}
                required
              />
            </div>
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
              {isLoading ? 'Creating...' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

