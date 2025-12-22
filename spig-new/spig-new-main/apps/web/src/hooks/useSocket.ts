'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSectionsSocket, getScoresSocket } from '@/lib/socket';

interface UseSocketOptions {
  namespace: 'sections' | 'scores';
  autoConnect?: boolean;
}

export function useSocket({ namespace, autoConnect = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Get appropriate socket based on namespace
    const socket =
      namespace === 'sections' ? getSectionsSocket() : getScoresSocket();
    socketRef.current = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (autoConnect && !socket.connected) {
      socket.connect();
    }

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [namespace, autoConnect]);

  return {
    socket: socketRef.current,
    isConnected,
  };
}

/**
 * Hook for section-related socket events
 */
export function useSectionSocket(sectionId: number) {
  const { socket, isConnected } = useSocket({ namespace: 'sections' });

  useEffect(() => {
    if (!socket || !isConnected || !sectionId) return;

    // Join section room
    socket.emit('section:join', sectionId);

    return () => {
      socket.emit('section:leave', sectionId);
    };
  }, [socket, isConnected, sectionId]);

  return { socket, isConnected };
}

/**
 * Hook for score-related socket events (group grading)
 */
export function useScoreSocket() {
  return useSocket({ namespace: 'scores' });
}

/**
 * Hook for group-related socket events
 */
export function useGroupSocket(groupId: number | null) {
  const { socket, isConnected } = useSocket({ namespace: 'scores' });

  useEffect(() => {
    if (!socket || !isConnected || !groupId) return;

    // Join group room
    socket.emit('group:join', groupId);

    return () => {
      socket.emit('group:leave', groupId);
    };
  }, [socket, isConnected, groupId]);

  return { socket, isConnected };
}
