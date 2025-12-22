'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from './AuthProvider';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function GoogleLoginButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { login } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializeGoogleSignIn = () => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 300,
    });
  };

  const handleCredentialResponse = async (response: { credential: string }) => {
    setError(null);
    setIsLoading(true);

    try {
      const { redirectTo } = await login(response.credential);
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {isLoading ? (
        <div className="w-full flex items-center justify-center py-3 px-4 rounded-lg bg-background border border-border-subtle">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-text">Signing in...</span>
        </div>
      ) : (
        <div ref={buttonRef} className="flex justify-center w-full" />
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg w-full">
          <p className="text-error text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
