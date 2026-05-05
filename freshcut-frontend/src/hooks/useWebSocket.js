import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const triggerNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, { body });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
  if (navigator.vibrate) {
    // Stronger vibration pattern for high attention
    navigator.vibrate([500, 150, 500, 150, 500, 150, 500]); 
  }
  try { 
    const audio = new Audio('/alert.mp3');
    audio.play().catch(() => {});
  } catch (_) {}
};

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const stompClient = useRef(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const socket = new SockJS((import.meta.env.VITE_API_URL || 'http://localhost:8080') + '/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = function (frame) {
      setConnected(true);
    };

    client.onStompError = function (frame) {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    client.activate();
    stompClient.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, []);

  const subscribe = useCallback((topic, callback) => {
    if (connected && stompClient.current) {
      return stompClient.current.subscribe(topic, (message) => {
        callback(JSON.parse(message.body));
      });
    }
    return null;
  }, [connected]);

  return { connected, subscribe };
};
