import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface WebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const connect = () => {
    const token = authService.getToken();
    if (!token) {
      console.warn('WebSocket接続にはトークンが必要です');
      return;
    }

    try {
      // WebSocketのURLにトークンを含める
      const wsUrl = `${url}?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        // console.log('WebSocket接続しました');
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (err) {
          console.error('WebSocketメッセージパースエラー:', err);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        // console.log('WebSocket切断されました');
        onDisconnect?.();

        // 自動再接続
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          // console.log(`WebSocket再接続試行 ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * reconnectAttemptsRef.current);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('WebSocket再接続の最大試行回数に達しました');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocketエラー:', error);
        setError('WebSocket接続エラーが発生しました');
        onError?.(error);
      };
    } catch (err) {
      console.error('WebSocket接続失敗:', err);
      setError('WebSocket接続に失敗しました');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocketが接続されていません');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [authService.getToken()]);

  return {
    isConnected,
    error,
    sendMessage,
    connect,
    disconnect,
  };
};