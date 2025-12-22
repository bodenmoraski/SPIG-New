'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Section {
  id: number;
  name: string;
  year: number;
  semester: string;
  status: string;
  course: {
    id: number;
    name: string;
  };
  teacher: {
    id: number;
    name: string;
  };
  assignment: {
    id: number;
    name: string;
  } | null;
  _count: {
    memberships: number;
  };
}

export default function StudentSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      const data = await api.get<Section[]>('/sections');
      setSections(data);
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-gray-500';
      case 'WRITING':
        return 'bg-blue-500';
      case 'GRADING_INDIVIDUAL':
        return 'bg-yellow-500';
      case 'GRADING_GROUPS':
        return 'bg-orange-500';
      case 'VIEWING_RESULTS':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading sections...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Sections</h1>

      {sections.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-muted mb-4">You haven&apos;t joined any sections yet.</p>
          <p className="text-sm text-text-muted">
            Ask your teacher for a join link to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/section/${section.id}`}
              className="card hover:bg-item-hover transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold">{section.course.name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${getStatusBadgeColor(section.status)} text-white`}
                >
                  {formatStatus(section.status)}
                </span>
              </div>
              <p className="text-text-muted text-sm mb-2">
                {section.name} • {section.semester} {section.year}
              </p>
              <p className="text-text-muted text-sm">
                Teacher: {section.teacher.name}
              </p>
              {section.assignment && (
                <p className="text-accent text-sm mt-2">
                  Current: {section.assignment.name}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
