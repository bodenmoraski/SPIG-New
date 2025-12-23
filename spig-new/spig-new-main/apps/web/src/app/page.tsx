'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user) {
      // Redirect based on role (matching Phoenix behavior)
      const redirectPath = user.role === 'STUDENT' ? '/section' : '/home';
      router.push(redirectPath);
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="skeleton w-12 h-12 rounded-full"></div>
          <div className="skeleton h-4 w-32 rounded"></div>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 mb-4">
            <span className="text-3xl font-bold text-accent">S</span>
          </div>
          <h1 className="text-5xl font-bold text-text mb-3 tracking-tight">SPIG</h1>
          <p className="text-lg text-text-muted">
            Student Peer Interactive Grading
          </p>
        </div>

        {/* Login Card */}
        <div className="card border-2 border-border-subtle shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-text mb-2">Welcome back</h2>
            <p className="text-sm text-text-muted">
              Sign in to continue to your account
            </p>
          </div>
        
        <GoogleLoginButton />

          <div className="mt-8 pt-6 border-t border-border-subtle">
            <p className="text-xs text-text-muted text-center leading-relaxed">
              By signing in, you agree to use your school Google account for educational purposes.
        </p>
          </div>
      </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-text-subtle">
        &copy; {new Date().getFullYear()} SPIG Platform
          </p>
      </footer>
      </div>
    </div>
  );
}
