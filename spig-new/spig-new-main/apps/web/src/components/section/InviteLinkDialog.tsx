'use client';

import { useState } from 'react';

interface User {
  id: number;
  name: string;
  avatar: string | null;
}

interface InviteLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  joinableCode: string;
  linkActive: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
  students: User[];
}

export function InviteLinkDialog({
  isOpen,
  onClose,
  joinableCode,
  linkActive,
  onToggle,
  onRegenerate,
  students,
}: InviteLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const [recentJoin, setRecentJoin] = useState(false);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/section/join/${joinableCode}`
    : `/section/join/${joinableCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.querySelector<HTMLInputElement>('#invite-url');
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

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
        className={`relative card w-full max-w-lg animate-slide-up ${
          recentJoin ? 'animate-rainbow-border border-2' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-dialog-title"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="invite-dialog-title" className="text-xl font-semibold">Invite Students</h2>
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

        <div className="space-y-5">
          <div>
            <label htmlFor="invite-url" className="block text-sm font-medium text-text mb-2">
              Invite Link
            </label>
            <div className="flex gap-2">
              <input
                id="invite-url"
                type="text"
                readOnly
                value={inviteUrl}
                className="input flex-1 font-mono text-sm"
                onFocus={(e) => e.target.select()}
              />
              <button 
                onClick={handleCopy} 
                className="btn btn-secondary whitespace-nowrap"
                aria-label={copied ? 'Copied to clipboard' : 'Copy link'}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              Share this link with students to join the section
            </p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onToggle} 
              className={`btn flex-1 ${linkActive ? 'btn-secondary' : 'btn-primary'}`}
            >
              {linkActive ? 'Deactivate Link' : 'Activate Link'}
            </button>
            <button 
              onClick={onRegenerate} 
              className="btn btn-secondary flex-1"
            >
              Regenerate
            </button>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-3 text-text">
              Students <span className="text-text-muted font-normal">({students.length})</span>
            </h3>
            {students.length === 0 ? (
              <div className="text-center py-6">
              <p className="text-text-muted text-sm">No students have joined yet.</p>
                <p className="text-text-subtle text-xs mt-1">Share the invite link above to get started.</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-2.5 bg-background rounded-md hover:bg-item-hover transition-colors"
                  >
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-item-hover flex items-center justify-center text-sm font-medium text-text-muted">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-text">{student.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

