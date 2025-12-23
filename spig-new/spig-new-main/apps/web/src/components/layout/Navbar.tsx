'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/components/auth/AuthProvider';

interface NavbarProps {
  user: User;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const roleColorClass =
    user.role === 'ADMIN'
      ? 'username-admin'
      : user.role === 'TEACHER'
        ? 'username-teacher'
        : 'username-student';

  return (
    <nav className="bg-background-light/50 backdrop-blur-sm border-b border-border-subtle sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation Links */}
          <div className="flex items-center gap-6">
            <Link 
              href={user.role === 'STUDENT' ? '/section' : '/home'} 
              className="flex items-center space-x-2 group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 group-hover:from-accent/30 group-hover:to-accent/20 transition-colors">
                <span className="text-lg font-bold text-accent">S</span>
              </div>
              <span className="text-xl font-bold text-text group-hover:text-accent transition-colors">
                SPIG
              </span>
          </Link>

            {user.role !== 'STUDENT' ? (
              <Link
                href="/home"
                className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text hover:bg-item-bg rounded-md transition-colors"
              >
                Courses
              </Link>
            ) : (
            <Link
              href="/section"
                className="px-3 py-2 text-sm font-medium text-text-muted hover:text-text hover:bg-item-bg rounded-md transition-colors"
            >
              My Sections
            </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/help"
                className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text hover:bg-item-bg rounded-md transition-colors"
              >
                Help
              </Link>
              <Link
                href="/about"
                className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text hover:bg-item-bg rounded-md transition-colors"
              >
                About
              </Link>
            </div>
            <div className="h-6 w-px bg-border-subtle hidden md:block"></div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-item-bg transition-colors">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-item-bg flex items-center justify-center">
                  <span className="text-xs font-medium text-text-muted">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className={`text-sm font-medium ${roleColorClass} hidden sm:inline`}>
                {user.name}
              </span>
            </div>
            <div className="h-6 w-px bg-border-subtle"></div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text hover:bg-item-bg rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
