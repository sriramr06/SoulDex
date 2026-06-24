import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import { FiBell } from 'react-icons/fi';
import styles from './NotificationsDropdown.module.css';

const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // Initial fetch to get unread count
    fetchNotifications();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark as read', err);
      }
    }

    setIsOpen(false);

    if (notification.type === 'FOLLOW') {
      navigate(`/profile/${notification.sender?._id}`);
    } else if (notification.relatedModel === 'Character') {
      navigate(`/characters/${notification.relatedId}`);
    } else if (notification.relatedModel === 'Post') {
      navigate('/explore'); 
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button className={styles.iconBtn} onClick={() => setIsOpen(!isOpen)}>
        <FiBell />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.header}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markAllReadBtn} onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>
          {loading && notifications.length === 0 ? (
            <div className={styles.empty}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>No notifications yet.</div>
          ) : (
            <ul className={styles.list}>
              {notifications.map((n) => {
                let text = '';
                if (n.type === 'LIKE_CHARACTER') text = 'liked your character.';
                else if (n.type === 'COMMENT_CHARACTER') text = `commented: "${n.message}"`;
                else if (n.type === 'LIKE_POST') text = 'liked your post.';
                else if (n.type === 'COMMENT_POST') text = `commented on your post: "${n.message}"`;
                else if (n.type === 'FOLLOW') text = 'started following you.';

                return (
                  <li
                    key={n._id}
                    className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <img
                      src={n.sender?.profilePicture || 'https://via.placeholder.com/40'}
                      alt="Avatar"
                      className={styles.avatar}
                    />
                    <div className={styles.textContainer}>
                      <span className={styles.sender}>{n.sender?.username || 'Someone'}</span>{' '}
                      {text}
                      <div className={styles.time}>
                        {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
