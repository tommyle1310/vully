'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS, WS_ROOMS } from '@vully/shared-types';
import { useAuthStore } from '@/stores/authStore';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

// Extract base URL from API URL (remove /api/v1 suffix)
const getSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  // Remove /api/v1 or /api suffix to get base URL
  const baseUrl = apiUrl.replace(/\/api.*$/, '');
  console.log('[WebSocket] API URL:', apiUrl, '→ Base URL:', baseUrl);
  return baseUrl;
};

const SOCKET_URL = getSocketUrl();

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
  });

  const { accessToken, user } = useAuthStore();

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    if (!accessToken) {
      console.warn('[WebSocket] No access token, skipping connection');
      return null;
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    const socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[WebSocket] Connected', socket.id);
      setState({ connected: true, connecting: false, error: null });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setState({ connected: false, connecting: false, error: reason });
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setState({ connected: false, connecting: false, error: error.message });
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
      setState({ connected: true, connecting: false, error: null });
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[WebSocket] Reconnection attempt ${attemptNumber}`);
      setState((prev) => ({ ...prev, connecting: true }));
    });

    socket.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed');
      setState({
        connected: false,
        connecting: false,
        error: 'Failed to reconnect',
      });
    });

    socketRef.current = socket;
    return socket;
  }, [accessToken, reconnectionAttempts, reconnectionDelay]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[WebSocket] Disconnecting...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({ connected: false, connecting: false, error: null });
    }
  }, []);

  // Join a room
  const joinRoom = useCallback((room: string) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Not connected, cannot join room:', room);
      return;
    }

    console.log('[WebSocket] Joining room:', room);
    socketRef.current.emit(WS_EVENTS.JOIN_ROOM, { room });
  }, []);

  // Leave a room
  const leaveRoom = useCallback((room: string) => {
    if (!socketRef.current?.connected) {
      return;
    }

    console.log('[WebSocket] Leaving room:', room);
    socketRef.current.emit(WS_EVENTS.LEAVE_ROOM, { room });
  }, []);

  // Subscribe to an event
  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (!socketRef.current) {
      console.warn('[WebSocket] Socket not initialized');
      return;
    }

    console.log('[WebSocket] Subscribing to event:', event);
    socketRef.current.on(event, handler);

    // Return cleanup function
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  // Unsubscribe from an event
  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (!socketRef.current) {
      return;
    }

    if (handler) {
      socketRef.current.off(event, handler);
    } else {
      socketRef.current.off(event);
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && accessToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, accessToken, connect, disconnect]);

  // Auto-join user-specific room
  useEffect(() => {
    if (state.connected && user?.id) {
      joinRoom(WS_ROOMS.user(user.id));

      // Join role-based room (role values are lowercase from Prisma enum)
      if (user.roles?.includes('admin')) {
        joinRoom(WS_ROOMS.admin());
      } else if (user.roles?.includes('technician')) {
        joinRoom(WS_ROOMS.technician());
      }
    }
  }, [state.connected, user?.id, user?.roles, joinRoom]);

  return {
    socket: socketRef.current,
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    on,
    off,
  };
}

// Hook for subscribing to specific events with auto-cleanup
export function useWebSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { socket, connected } = useWebSocket();

  useEffect(() => {
    if (!connected || !socket) {
      return;
    }

    console.log('[WebSocket] Setting up event listener:', event);
    socket.on(event, handler);

    return () => {
      console.log('[WebSocket] Cleaning up event listener:', event);
      socket.off(event, handler);
    };
  }, [connected, socket, event, ...deps]);
}

// Utility hook for joining/leaving rooms automatically
export function useWebSocketRoom(room: string | null) {
  const { joinRoom, leaveRoom, connected } = useWebSocket();

  useEffect(() => {
    if (connected && room) {
      joinRoom(room);

      return () => {
        leaveRoom(room);
      };
    }
  }, [connected, room, joinRoom, leaveRoom]);
}
