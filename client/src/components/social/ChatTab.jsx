import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { FiSend, FiGlobe } from 'react-icons/fi';
import { getGlobalMessages, getConversation } from '../../api/social';
import { getUserProfile, getAuthToken } from '../../api/auth';
import styles from './ChatTab.module.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ChatTab = () => {
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]); // Will populate from "following" list
  const [activeContact, setActiveContact] = useState('global'); // 'global' or user._id

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messageListRef = useRef(null);

  // New States for Enhancements
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState(new Set());
  const socketRef = useRef(null);

  // Initialize and load user
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const res = await getUserProfile();
        if (!mounted) return;
        setCurrentUser(res.data);
        setContacts(res.data.following || []);

        const newSocket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = newSocket;
        setSocket(newSocket);
      } catch (err) {
        console.error('Failed to load user profile for chat list', err);
      }
    };
    init();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Fetch Messages when contact changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        let res;
        if (activeContact === 'global') {
          res = await getGlobalMessages();
        } else {
          res = await getConversation(activeContact);
        }
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    if (currentUser) {
      fetchMessages();

      // Join Socket Room
      if (socket) {
        socket.emit('joinRoom', {
          userId: currentUser._id,
          targetUserId: activeContact === 'global' ? null : activeContact,
        });
      }
    }
  }, [activeContact, currentUser, socket]);

  // Listen for incoming messages & typing
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleReceiveMessage = (newMessage) => {
      const isGlobal = !newMessage.recipient;
      const isForCurrentChat = isGlobal
        ? activeContact === 'global'
        : activeContact === newMessage.sender._id;

      if (isForCurrentChat) {
        setMessages((prev) => [...prev, newMessage]);
      } else {
        // Increment unread count if not currently viewing this chat
        const senderId = isGlobal ? 'global' : newMessage.sender._id;
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    const handleUserTyping = ({ senderId, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(senderId);
        else next.delete(senderId);
        return next;
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('userTyping', handleUserTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, activeContact, currentUser]);

  // Clear unreads when active contact changes
  useEffect(() => {
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[activeContact];
      return newCounts;
    });
  }, [activeContact]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !currentUser) return;

    socket.emit('sendMessage', {
      senderId: currentUser._id,
      recipientId: activeContact === 'global' ? null : activeContact,
      text: inputText,
    });

    // Clear typing status on send
    socket.emit('typing', {
      senderId: currentUser._id,
      recipientId: activeContact === 'global' ? null : activeContact,
      isTyping: false,
    });

    setInputText('');
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!socket || !currentUser) return;

    socket.emit('typing', {
      senderId: currentUser._id,
      recipientId: activeContact === 'global' ? null : activeContact,
      isTyping: e.target.value.length > 0,
    });
  };

  if (!currentUser) return <div>Loading chat...</div>;

  return (
    <div className={styles.container}>
      {/* Sidebar: Contacts */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>Chats</div>
        <div className={styles.contactList}>
          {/* Global Chat Item */}
          <div
            className={`${styles.contactItem} ${activeContact === 'global' ? styles.activeContact : ''}`}
            onClick={() => setActiveContact('global')}
          >
            <div
              className={styles.contactAvatar}
              style={{ backgroundColor: 'var(--primary-blue)' }}
            >
              <FiGlobe />
            </div>
            <div className={styles.contactInfo}>
              <div className={styles.contactName}>Global Chat</div>
            </div>
            {unreadCounts['global'] > 0 && (
              <div className={styles.unreadBadge}>{unreadCounts['global']}</div>
            )}
          </div>

          {/* User Contacts */}
          {contacts.map((contact) => (
            <div
              key={contact._id}
              className={`${styles.contactItem} ${activeContact === contact._id ? styles.activeContact : ''}`}
              onClick={() => setActiveContact(contact._id)}
            >
              <img
                src={contact.profilePicture}
                alt="avatar"
                className={styles.contactAvatar}
              />
              <div className={styles.contactInfo}>
                <div className={styles.contactName}>{contact.displayName}</div>
                {typingUsers.has(contact._id) &&
                  activeContact !== contact._id && (
                    <div className={styles.typingIndicatorSmall}>typing...</div>
                  )}
              </div>
              {unreadCounts[contact._id] > 0 && (
                <div className={styles.unreadBadge}>
                  {unreadCounts[contact._id]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          {activeContact === 'global' ? (
            <>
              <FiGlobe size={20} />{' '}
              <span className={styles.chatHeaderName}>Global Chat</span>
            </>
          ) : (
            <span className={styles.chatHeaderName}>Direct Message</span>
          )}
        </div>

        <div className={styles.messageList} ref={messageListRef}>
          {messages.map((msg, index) => {
            const isMe = msg.sender._id === currentUser._id;
            return (
              <div
                key={index}
                className={`${styles.message} ${isMe ? styles.myMessage : styles.otherMessage}`}
              >
                {!isMe && (
                  <span className={styles.messageSender}>
                    {msg.sender?.displayName || msg.sender?.username}
                  </span>
                )}
                <div className={styles.messageBubble}>{msg.text}</div>
              </div>
            );
          })}
          {activeContact !== 'global' && typingUsers.has(activeContact) && (
            <div className={`${styles.message} ${styles.otherMessage}`}>
              <div className={`${styles.messageBubble} ${styles.typingBubble}`}>
                User is typing...
              </div>
            </div>
          )}
        </div>

        <div className={styles.messageInputArea}>
          <form className={styles.inputForm} onSubmit={handleSendMessage}>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Type a message..."
              value={inputText}
              onChange={handleTyping}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!inputText.trim()}
            >
              <FiSend />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatTab;
