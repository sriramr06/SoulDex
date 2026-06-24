import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getAuthToken } from '../api/tokenStorage';
import { useAuth } from '../hooks/useAuth';

export const SocketContext = createContext({ socket: null, onlineUsers: new Set(), typingUsers: {}, totalUnread: 0 });

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '');

// Request browser notification permission once
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const fireNotification = (title, body, icon) => {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    const n = new Notification(title, { body, icon, badge: icon });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 6000);
  }
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const { user, authLoading } = useAuth();
  const socketRef = useRef(null);

  // Request notification permission when user is logged in
  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

  const incrementUnread = useCallback(() => setTotalUnread(p => p + 1), []);
  const resetUnread = useCallback(() => setTotalUnread(0), []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setOnlineUsers(new Set());
      setTypingUsers({});
    }

    if (authLoading || !user) {
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Handle online status
    newSocket.on('onlineUsers', (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on('userStatusChange', ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    // Handle typing status globally
    newSocket.on('userTyping', ({ senderId, isTyping }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: isTyping }));
    });

    // Global message listener — fire browser notification for DMs not in active tab
    newSocket.on('receiveMessage', (msg) => {
      const isFromMe = msg.sender?._id === user?._id;
      const isDM = !!msg.recipient;
      if (!isFromMe && isDM) {
        incrementUnread();
        const senderName = msg.sender?.displayName || msg.sender?.username || 'Someone';
        const body = msg.imageUrl ? '📷 Sent an image' : (msg.text || '');
        fireNotification(`💬 ${senderName}`, body, msg.sender?.profilePicture);
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.off('onlineUsers');
      newSocket.off('userStatusChange');
      newSocket.off('userTyping');
      newSocket.off('receiveMessage');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, typingUsers, totalUnread, resetUnread }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
