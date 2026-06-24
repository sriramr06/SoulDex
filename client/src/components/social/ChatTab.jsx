import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiGlobe, FiSearch, FiWifi, FiWifiOff, FiPaperclip, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import { BiCheckDouble } from 'react-icons/bi';
import { getGlobalMessages, getConversation, uploadMessageImage, getUnreadCounts, deleteMessage as deleteMessageAPI, getLastMessagePreviews } from '../../api/social';
import { getUserProfile, getAuthToken } from '../../api/auth';
import { useToast } from '../../hooks/useToast';
import styles from './ChatTab.module.css';

// ── Helpers ────────────────────────────────────────────
const getRelativeTime = (dateStr) => {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ChatTab ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: '#fff', zIndex: 9999, position: 'relative' }}>
          <h2>Chat UI Crashed</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ fontSize: '10px' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const ChatTabContent = ({ initialContact }) => {
  const navigate = useNavigate();
  const { socket, onlineUsers = new Set(), typingUsers = {} } = useSocket() || {};
  const { resetUnread } = useSocket() || {};
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(initialContact || null);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messageListRef = useRef(null);

  const { showToast } = useToast();

  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({}); // { contactId: { text, createdAt, isMe } }
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize and load user
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setChatError('Not authenticated');
          return;
        }
        const res = await getUserProfile();
        if (!mounted) return;
        setCurrentUser(res.data);
        setContacts(res.data.following || []);
        
        // Fetch unread counts and message previews
        try {
          const [unreadRes, previewsRes] = await Promise.all([
            getUnreadCounts(),
            getLastMessagePreviews()
          ]);
          if (mounted) {
            setUnreadCounts(unreadRes.data || {});
            setLastMessages(prev => ({
              ...prev,
              ...previewsRes.data
            }));
          }
        } catch (err) {
          console.error('Failed to get unread counts or previews', err);
        }
      } catch (err) {
        console.error('Failed to load user profile for chat list', err);
        if (mounted) setChatError('Unable to load chat. Please refresh or login again.');
      } finally {
        if (mounted) setChatLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [showToast]);

  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') { setConnectionStatus('disconnected'); return; }
    if (socket.connected) setConnectionStatus('connected');

    const onConnect = () => { setConnectionStatus('connected'); showToast('Connected to chat.', 'success'); };
    const onDisconnect = () => { setConnectionStatus('disconnected'); showToast('Chat connection lost. Reconnecting...'); };
    const onReconnectAttempt = () => setConnectionStatus('connecting');
    const onConnectError = (err) => { setConnectionStatus('error'); showToast('Unable to connect to chat server.'); console.error('Chat socket error:', err); };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('connect_error', onConnectError);
    };
  }, [socket, showToast]);

  const markAsRead = (targetUserId) => {
    if (!socket || typeof socket.emit !== 'function' || !targetUserId || targetUserId === 'global') return;
    
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[targetUserId];
      return next;
    });

    socket.emit('markAsRead', { senderId: targetUserId });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeContact) {
        setMessages([]);
        return;
      }
      try {
        let res;
        if (activeContact === 'global') {
          res = await getGlobalMessages();
        } else {
          res = await getConversation(activeContact);
          markAsRead(activeContact);
        }
        setMessages(res.data);
        // Update last message preview for this contact
        if (res.data.length > 0) {
          const last = res.data[res.data.length - 1];
          setLastMessages(prev => ({
            ...prev,
            [activeContact]: {
              text: last.imageUrl ? '📷 Image' : last.text,
              createdAt: last.createdAt,
              isMe: last.sender?._id === currentUser?._id,
            },
          }));
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    if (currentUser) {
      fetchMessages();
      if (socket && typeof socket.emit === 'function' && activeContact) {
        socket.emit('joinRoom', {
          userId: currentUser._id,
          targetUserId: activeContact === 'global' ? null : activeContact,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContact, currentUser, socket]);

  useEffect(() => {
    if (!socket || typeof socket.on !== 'function' || !currentUser) return;

    const getRecipientId = (message) => {
      if (!message.recipient) return null;
      if (typeof message.recipient === 'string') return message.recipient;
      if (message.recipient._id) return message.recipient._id;
      return message.recipient.toString();
    };

    const handleReceiveMessage = (newMessage) => {
      const recipientId = getRecipientId(newMessage);
      const isGlobal = !recipientId;
      const isMyMessage = newMessage.sender._id === currentUser._id;
      const senderId = isGlobal ? 'global' : newMessage.sender._id;
      const isForCurrentChat = isGlobal
        ? activeContact === 'global'
        : activeContact === senderId || (isMyMessage && activeContact === recipientId);

      if (isForCurrentChat) {
        setMessages((prev) => [...prev, newMessage]);
        if (!isMyMessage && !isGlobal && typeof socket.emit === 'function') {
          socket.emit('markAsRead', { senderId });
        }
      } else {
        if (!isMyMessage) {
          setUnreadCounts((prev) => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
        }
      }
      // Always update last message preview for the conversation
      const previewKey = isGlobal ? 'global' : (isMyMessage ? (getRecipientId(newMessage) || senderId) : senderId);
      setLastMessages(prev => ({
        ...prev,
        [previewKey]: {
          text: newMessage.imageUrl ? '📷 Image' : newMessage.text,
          createdAt: newMessage.createdAt,
          isMe: isMyMessage,
        },
      }));
    };

    const handleMessagesRead = ({ recipientId }) => {
      if (activeContact === recipientId) {
        setMessages(prev => prev.map(msg => 
          (!msg.read && msg.sender._id === currentUser._id) ? { ...msg, read: true } : msg
        ));
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messagesRead', handleMessagesRead);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('receiveMessage', handleReceiveMessage);
        socket.off('messagesRead', handleMessagesRead);
      }
    };
  }, [socket, activeContact, currentUser]);

  // Auto-scroll
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, imagePreview]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmedText = inputText.trim();
    if (!trimmedText && !imageFile) return;
    if (!socket || typeof socket.emit !== 'function' || !currentUser) return;
    if (!socket.connected) { showToast('Unable to send message while disconnected.'); return; }

    setIsUploading(true);
    let imageUrl = '';

    if (imageFile) {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await uploadMessageImage(formData);
        imageUrl = uploadRes.data.imageUrl;
      } catch (err) {
        setIsUploading(false);
        showToast('Failed to upload image.', 'error');
        return;
      }
    }

    // Safety timeout — reset uploading state if callback never fires
    const uploadTimeout = setTimeout(() => setIsUploading(false), 5000);

    socket.emit('sendMessage', {
      senderId: currentUser._id,
      recipientId: activeContact === 'global' ? null : activeContact,
      text: trimmedText,
      imageUrl,
    }, (response) => {
      clearTimeout(uploadTimeout);
      setIsUploading(false);
      if (!response?.success) { showToast(response?.error || 'Message failed to send.'); return; }
      setInputText('');
      clearImage();
    });

    socket.emit('typing', {
      senderId: currentUser._id,
      recipientId: activeContact === 'global' ? null : activeContact,
      isTyping: false,
    });
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!socket || typeof socket.emit !== 'function' || !currentUser) return;
    socket.emit('typing', {
      senderId: currentUser._id,
      recipientId: activeContact === 'global' ? null : activeContact,
      isTyping: e.target.value.length > 0,
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getActiveContactInfo = () => {
    if (activeContact === 'global') return null;
    return contacts.find(c => c._id === activeContact);
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await deleteMessageAPI(msgId);
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch (err) {
      showToast('Failed to delete message.', 'error');
    }
  };

  const filteredContacts = contacts.filter(c =>
    !contactSearch || c.displayName?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  if (chatLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingPulse} />
        <span>Establishing connection...</span>
      </div>
    );
  }

  if (chatError) {
    return <div className={styles.errorState}>{chatError}</div>;
  }

  if (!currentUser) {
    return <div className={styles.errorState}>No chat user available.</div>;
  }

  const activeContactInfo = getActiveContactInfo();

  return (
    <div className={`${styles.container} ${activeContact ? styles.chatActive : styles.chatInactive}`}>
      {/* ── SIDEBAR ── */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Transmissions</span>
          <span className={`${styles.statusDot} ${styles[connectionStatus]}`} title={connectionStatus} />
        </div>

        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} size={14} />
          <input
            className={styles.searchInput}
            placeholder="Search contacts..."
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
          />
        </div>

        <div className={styles.contactList}>
          {/* Global */}
          <div
            className={`${styles.contactItem} ${activeContact === 'global' ? styles.activeContact : ''}`}
            onClick={() => setActiveContact('global')}
          >
            <div className={`${styles.contactAvatar} ${styles.globalAvatar}`}>
              <FiGlobe size={18} />
            </div>
            <div className={styles.contactInfo}>
              <span className={styles.contactName}>Global Chat</span>
              <span className={styles.contactPreview}>Soul Society bulletin board</span>
            </div>
          </div>

          {/* Divider */}
          {filteredContacts.length > 0 && (
            <div className={styles.contactDivider}>Direct Messages</div>
          )}

          {/* User Contacts */}
          {filteredContacts.length === 0 && contactSearch ? (
            <div className={styles.emptyContacts}>
              <span>No contacts found.</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className={styles.emptyContacts}>
              <div className={styles.emptyStateTitle}>No contacts yet</div>
              <div className={styles.emptyStateText}>
                Follow other users to start direct messages.
              </div>
            </div>
          ) : (
            filteredContacts.map(contact => {
              if (!contact) return null;
              const isOnline = onlineUsers.has(contact._id);
              const isTyping = typingUsers[contact._id];
              const hasUnread = (unreadCounts[contact._id] || 0) > 0;
              
              return (
                <div
                  key={contact._id}
                  className={`${styles.contactItem} ${activeContact === contact._id ? styles.activeContact : ''} ${hasUnread ? styles.unreadContact : ''}`}
                  onClick={() => setActiveContact(contact._id)}
                >
                  <div className={styles.avatarWrap}>
                    {contact.profilePicture ? (
                      <img src={contact.profilePicture} alt="avatar" className={styles.contactAvatar} />
                    ) : (
                      <div className={`${styles.contactAvatar} ${styles.initialsAvatar}`}>
                        {getInitials(contact.displayName)}
                      </div>
                    )}
                    {/* Status ring overrides online dot if typing */}
                    {isTyping && activeContact !== contact._id ? (
                      <span className={styles.typingRing} />
                    ) : isOnline ? (
                      <span className={styles.onlineBadge} />
                    ) : null}
                  </div>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactNameRow}>
                      <span className={`${styles.contactName} ${hasUnread ? styles.unreadContactName : ''}`}>{contact.displayName}</span>
                      {lastMessages[contact._id]?.createdAt && (
                        <span className={styles.contactTime}>
                          {getRelativeTime(lastMessages[contact._id].createdAt)}
                        </span>
                      )}
                    </div>
                    {isTyping && activeContact !== contact._id ? (
                      <span className={styles.contactPreview} style={{ color: 'var(--accent-primary)', fontStyle: 'italic' }}>typing...</span>
                    ) : lastMessages[contact._id] ? (
                      <span className={`${styles.contactPreview} ${hasUnread ? styles.unreadContactPreview : ''}`}>
                        {lastMessages[contact._id].isMe ? 'You: ' : ''}{lastMessages[contact._id].text}
                      </span>
                    ) : (
                      <span className={styles.contactPreview}>Direct message</span>
                    )}
                  </div>
                  {unreadCounts[contact._id] > 0 && (
                    <div className={styles.unreadBadge}>{unreadCounts[contact._id]}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      {activeContact ? (
        <div className={styles.chatArea}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderLeft}>
              <button className={styles.backBtn} onClick={() => setActiveContact(null)} title="Back to contacts">
                <FiArrowLeft size={20} />
              </button>
              {activeContact === 'global' ? (
              <>
                <div className={`${styles.headerAvatar} ${styles.globalAvatar}`}>
                  <FiGlobe size={16} />
                </div>
                <div>
                  <div className={styles.chatHeaderName}>Global Chat</div>
                  <div className={styles.chatHeaderSub}>Soul Society bulletin board</div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.avatarWrap}>
                  {activeContactInfo?.profilePicture ? (
                    <img src={activeContactInfo.profilePicture} alt="avatar" className={styles.headerAvatar} />
                  ) : (
                    <div className={`${styles.headerAvatar} ${styles.initialsAvatar}`}>
                      {getInitials(activeContactInfo?.displayName)}
                    </div>
                  )}
                  {onlineUsers.has(activeContact) && <span className={styles.onlineBadgeHeader} />}
                </div>
                <div>
                  <div className={styles.chatHeaderName}>{activeContactInfo?.displayName || 'Direct Message'}</div>
                  <div className={styles.chatHeaderSub}>
                    {onlineUsers.has(activeContact) ? 'Online' : 'Offline'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messageList} ref={messageListRef}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <FiGlobe size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <span>No transmissions yet. Be the first to speak.</span>
            </div>
          ) : (
            messages.map((msg, index) => {
              const senderId = msg.sender?._id || null;
              const isMe = senderId === currentUser._id;
              const senderName = msg.sender?.displayName || msg.sender?.username || 'Unknown';
              const prevMsg = messages[index - 1];
              const showSender = !isMe && (!prevMsg || prevMsg.sender?._id !== senderId);
              const showDateSep = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
              const senderId_profile = msg.sender?._id;

              const handleProfileClick = () => {
                if (senderId_profile && senderId_profile !== currentUser._id) {
                  navigate(`/profile/${senderId_profile}`);
                }
              };

              return (
                <React.Fragment key={msg._id || index}>
                  {/* Date Separator */}
                  {showDateSep && (
                    <div className={styles.dateSeparator}>
                      <span>{getDateLabel(msg.createdAt)}</span>
                    </div>
                  )}

                  <div
                    className={`${styles.messageRow} ${isMe ? styles.myMessageRow : styles.otherMessageRow}`}
                  >
                    {!isMe && (
                      <div className={styles.msgAvatarCol}>
                        {showSender ? (
                          msg.sender?.profilePicture ? (
                            <img
                              src={msg.sender.profilePicture}
                              alt={senderName}
                              className={`${styles.msgAvatar} ${styles.clickable}`}
                              onClick={handleProfileClick}
                              title={`View ${senderName}'s profile`}
                            />
                          ) : (
                            <div
                              className={`${styles.msgAvatar} ${styles.initialsAvatar} ${styles.msgInitials} ${styles.clickable}`}
                              onClick={handleProfileClick}
                              title={`View ${senderName}'s profile`}
                            >
                              {getInitials(senderName)}
                            </div>
                          )
                        ) : (
                          <div className={styles.msgAvatarSpacer} />
                        )}
                      </div>
                    )}
                    <div className={styles.messageBubbleWrap}>
                      {showSender && !isMe && (
                        <span
                          className={`${styles.messageSender} ${styles.clickable}`}
                          onClick={handleProfileClick}
                        >
                          {senderName}
                        </span>
                      )}

                      {msg.imageUrl && (
                        <div
                          className={`${styles.messageBubble} ${isMe ? styles.myBubble : styles.otherBubble} ${styles.imageBubble}`}
                          onClick={() => setLightboxImage(msg.imageUrl)}
                        >
                          <img src={msg.imageUrl} alt="Attachment" className={styles.chatImage} />
                          {msg.text && <div className={styles.chatImageCaption}>{msg.text}</div>}
                        </div>
                      )}

                      {!msg.imageUrl && msg.text && (
                        <div className={`${styles.messageBubble} ${isMe ? styles.myBubble : styles.otherBubble}`}>
                          {msg.text}
                        </div>
                      )}

                      <div className={`${styles.messageTimeWrap} ${isMe ? styles.myTimeWrap : ''}`}>
                        <span
                          className={styles.messageTime}
                          title={new Date(msg.createdAt).toLocaleString()}
                        >
                          {getRelativeTime(msg.createdAt)}
                        </span>
                        {isMe && activeContact !== 'global' && (
                          <span className={styles.readReceipt}>
                            {msg.read ? <BiCheckDouble size={18} color="#60a5fa" /> : <FiCheck size={14} />}
                          </span>
                        )}
                        {isMe && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteMessage(msg._id)}
                            title="Delete message"
                          >
                            <FiX size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Typing indicator */}
          {activeContact !== 'global' && typingUsers[activeContact] && (
            <div className={`${styles.messageRow} ${styles.otherMessageRow}`}>
              <div className={styles.msgAvatarCol}>
                <div className={styles.msgAvatarSpacer} />
              </div>
              <div className={styles.messageBubbleWrap}>
                <div className={`${styles.messageBubble} ${styles.otherBubble} ${styles.typingBubble}`}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>
          {imagePreview && (
            <div className={styles.imagePreviewContainer}>
              <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
              <button className={styles.removeImageBtn} onClick={clearImage} title="Remove image">
                <FiX size={14} />
              </button>
            </div>
          )}
          <form className={styles.inputForm} onSubmit={handleSendMessage}>
            <button 
              type="button" 
              className={styles.attachBtn} 
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
            >
              <FiPaperclip size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />
            <input
              type="text"
              className={styles.inputField}
              placeholder={isUploading ? 'Sending...' : 'Transmit a message...'}
              value={inputText}
              onChange={handleTyping}
              autoComplete="off"
              disabled={isUploading}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={isUploading || (!inputText.trim() && !imageFile)}
              title="Send"
            >
              <FiSend size={16} />
            </button>
          </form>
        </div>
      </div>
      ) : (
        <div className={styles.chatAreaPlaceholder}>
          <div className={styles.placeholderIconWrap}>
            <FiGlobe size={48} />
          </div>
          <h3 className={styles.placeholderTitle}>Your Messages</h3>
          <p className={styles.placeholderText}>Select a contact or join the global chat to start messaging.</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxImage(null)}>
          <button className={styles.lightboxCloseBtn} onClick={() => setLightboxImage(null)}>
            <FiX size={24} />
          </button>
          <img src={lightboxImage} alt="Fullscreen" className={styles.lightboxImage} />
        </div>
      )}
    </div>
  );
};

const ChatTab = (props) => (
  <ChatErrorBoundary>
    <ChatTabContent {...props} />
  </ChatErrorBoundary>
);

export default ChatTab;
