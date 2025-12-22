'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSectionSocket } from '@/hooks/useSocket';

interface SectionInfo {
  id: number;
  name: string;
  linkActive: boolean;
  course: { id: number; name: string };
  teacher: { id: number; name: string };
}

export default function JoinSectionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const code = params.code as string;

  const [sectionInfo, setSectionInfo] = useState<SectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Socket for real-time link activation updates
  const { socket, isConnected } = useSectionSocket(sectionInfo?.id || 0);

  const loadSectionInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get<SectionInfo>(`/sections/join/${code}`);
      setSectionInfo(data);
    } catch (err: any) {
      if (err.status === 404) {
        setError('This invite link is invalid or has expired.');
      } else {
        setError(err.message || 'Failed to load section info');
      }
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadSectionInfo();
  }, [loadSectionInfo]);

  // Listen for link activation changes
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('joinLink:toggled', (isActive: boolean) => {
      setSectionInfo((prev) => prev ? { ...prev, linkActive: isActive } : null);
    });

    return () => {
      socket.off('joinLink:toggled');
    };
  }, [socket, isConnected]);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      await api.post(`/sections/join/${code}`, {});
      setJoined(true);
      // Redirect to section after a short delay
      setTimeout(() => {
        router.push(`/section/${sectionInfo?.id}`);
      }, 1500);
    } catch (err: any) {
      if (err.status === 409) {
        setError('You are already enrolled in this section.');
        // Still redirect since they're enrolled
        setTimeout(() => {
          router.push(`/section/${sectionInfo?.id}`);
        }, 1500);
      } else if (err.status === 403) {
        setError('This invite link is no longer active.');
      } else {
        setError(err.message || 'Failed to join section');
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  if (!sectionInfo) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-text-muted mb-4">{error}</p>
          <button
            onClick={() => router.push('/section')}
            className="btn btn-secondary"
          >
            Go to My Sections
          </button>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-success mb-2">Success!</h1>
          <p className="text-text-muted">
            You've joined <span className="font-bold">{sectionInfo.name}</span>.
          </p>
          <p className="text-sm text-text-muted mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-2">Join Section</h1>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-text-muted">Course:</span>
            <span className="font-medium">{sectionInfo.course.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Section:</span>
            <span className="font-medium">{sectionInfo.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Teacher:</span>
            <span className="font-medium">{sectionInfo.teacher.name}</span>
          </div>
        </div>

        {error && (
          <div className="bg-error/10 border border-error text-error rounded-md p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {!sectionInfo.linkActive ? (
          <div className="bg-background rounded-md p-4 text-center">
            <p className="text-text-muted mb-2">
              This invite link is currently <span className="text-error font-bold">inactive</span>.
            </p>
            <p className="text-sm text-text-muted">
              Please ask your teacher to activate the invite link.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-background rounded-md p-4 text-sm text-text-muted">
              <p>
                You're about to join this section as{' '}
                <span className="font-bold text-text">{user?.name}</span> ({user?.email}).
              </p>
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="btn btn-primary w-full"
            >
              {isJoining ? 'Joining...' : 'Join Section'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

