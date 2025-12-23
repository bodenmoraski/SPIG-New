'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { CreateCourseDialog } from '@/components/course/CreateCourseDialog';

interface Course {
  id: number;
  name: string;
  createdAt: string;
  _count: {
    sections: number;
    rubrics: number;
    assignments: number;
  };
}

export default function TeacherHomePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await api.get<Course[]>('/courses');
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseCreated = (course: Course) => {
    setCourses([course, ...courses]);
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-32 rounded"></div>
          <div className="skeleton h-10 w-32 rounded"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-6 w-3/4 mb-3 rounded"></div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded"></div>
                <div className="skeleton h-4 w-2/3 rounded"></div>
                <div className="skeleton h-4 w-1/2 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <button onClick={() => setIsDialogOpen(true)} className="btn btn-primary">
          + New Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="card">
          <div className="empty-state py-12">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-title">No courses yet</div>
            <div className="empty-state-description">
              Create your first course to get started with organizing sections, rubrics, and assignments.
            </div>
            <button onClick={() => setIsDialogOpen(true)} className="btn btn-primary mt-4">
            Create your first course
          </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className="card card-hover group"
            >
              <h3 className="text-lg font-semibold mb-3 group-hover:text-accent transition-colors">
                {course.name}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{course._count?.sections ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>{course._count?.rubrics ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{course._count?.assignments ?? 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateCourseDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreated={handleCourseCreated}
      />
    </div>
  );
}
