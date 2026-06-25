const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const app = require('./app');
const { ALLOWED_ORIGINS } = require('./config/env');
const { sanitizeText } = require('./utils/sanitizer');
const Message = require('./models/Message');
const jwt = require('jsonwebtoken');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS
      ? ALLOWED_ORIGINS.split(',')
      : process.env.NODE_ENV === 'production'
        ? false
        : (origin, callback) => {
            if (!origin) {
              callback(null, true);
              return;
            }
            const allowedLocalhost = /(?:localhost|127\.0\.0\.1|\[::1\])/i.test(
              origin,
            );
            callback(null, allowedLocalhost);
          },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use((socket, next) => {
  const authorizationHeader = socket.handshake.headers?.authorization;
  const token =
    socket.handshake.auth?.token ||
    (authorizationHeader?.startsWith('Bearer ') &&
      authorizationHeader.split(' ')[1]);

  if (!token) {
    return next(new Error('Authentication error: token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Socket auth error:', error.message);
    }
    next(new Error('Authentication error: invalid token'));
  }
});

// Track online users globally
global.onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.user.userId;

  // Join personal room for cross-tab notifications
  socket.join(userId);

  // Add user to online tracking
  global.onlineUsers.set(userId, socket.id);
  
  // Broadcast status to all connected clients
  io.emit('userStatusChange', { userId, status: 'online' });
  
  // Send current online users to the newly connected client
  socket.emit('onlineUsers', Array.from(global.onlineUsers.keys()));

  socket.on('joinRoom', ({ targetUserId }) => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id && room !== userId) socket.leave(room);
    });

    if (!targetUserId) {
      socket.join('global');
    }
  });

  socket.on('sendMessage', async (messageData, callback) => {
    try {
      const { recipientId, text, imageUrl } = messageData;
      const senderId = socket.user.userId;

      if ((!text || typeof text !== 'string' || !text.trim()) && !imageUrl) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Message cannot be empty.' });
        }
        return;
      }

      const recipient =
        recipientId && recipientId !== null ? recipientId : null;
      if (recipient && !mongoose.Types.ObjectId.isValid(recipient)) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Invalid recipient.' });
        }
        return;
      }

      const newMessage = await Message.create({
        sender: senderId,
        recipient,
        text: text ? sanitizeText(text) : '',
        imageUrl: imageUrl || '',
      });

      const populatedMessage = await Message.findById(newMessage._id).populate(
        'sender',
        'displayName username profilePicture race',
      );

      if (!recipient) {
        io.to('global').emit('receiveMessage', populatedMessage);
      } else {
        io.to(senderId).to(recipient).emit('receiveMessage', populatedMessage);
      }

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Socket message save error:', error);
      }
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: 'Unable to send message. Please try again.',
        });
      }
    }
  });

  socket.on('markAsRead', async ({ senderId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(senderId)) return;
      
      const currentUserId = socket.user.userId;
      
      await Message.updateMany(
        { sender: senderId, recipient: currentUserId, read: false },
        { $set: { read: true } }
      );
      
      // Notify the sender that their messages were read
      io.to(senderId).emit('messagesRead', { recipientId: currentUserId });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  socket.on('typing', ({ recipientId, isTyping }) => {
    const senderId = socket.user.userId;
    if (!senderId) return;

    const isTypingActive = Boolean(isTyping);
    if (!recipientId) {
      socket
        .to('global')
        .emit('userTyping', { senderId, isTyping: isTypingActive });
      return;
    }

    if (
      !mongoose.Types.ObjectId.isValid(recipientId) ||
      recipientId === senderId
    ) {
      return;
    }

    socket.to(recipientId).emit('userTyping', { senderId, isTyping: isTypingActive });
  });

  socket.on('disconnect', () => {
    global.onlineUsers.delete(userId);
    io.emit('userStatusChange', { userId, status: 'offline' });
  });
});

app.set('io', io);

const PORT = process.env.PORT || 3000;
let serverInstance;

const startServer = async () => {
  await connectDB();
  serverInstance = server.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Server listening on http://localhost:${PORT}`);
    }
  });
};

startServer().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  if (serverInstance) {
    serverInstance.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
