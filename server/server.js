const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const { ALLOWED_ORIGINS } = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',') : '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(limiter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
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
    const decoded = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET,
    );
    socket.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'user:', socket.user?.userId);

  socket.on('joinRoom', ({ targetUserId }) => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    const userId = socket.user.userId;
    if (!targetUserId) {
      socket.join('global');
      console.log(`User ${userId} joined global chat`);
      return;
    }

    if (
      !mongoose.Types.ObjectId.isValid(targetUserId) ||
      targetUserId === userId
    ) {
      return;
    }

    const room = [userId, targetUserId].sort().join('_');
    socket.join(room);
    console.log(`User ${userId} joined room ${room}`);
  });

  socket.on('sendMessage', async (messageData) => {
    try {
      const { recipientId, text } = messageData;
      const senderId = socket.user.userId;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return;
      }

      const recipient =
        recipientId && recipientId !== null ? recipientId : null;
      if (recipient && !mongoose.Types.ObjectId.isValid(recipient)) {
        return;
      }

      const newMessage = await Message.create({
        sender: senderId,
        recipient,
        text: text.trim(),
      });

      const populatedMessage = await Message.findById(newMessage._id).populate(
        'sender',
        'displayName username profilePicture race',
      );

      if (!recipient) {
        io.to('global').emit('receiveMessage', populatedMessage);
      } else {
        const room = [senderId, recipient].sort().join('_');
        io.to(room).emit('receiveMessage', populatedMessage);
      }
    } catch (error) {
      console.error('Socket message save error:', error);
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

    const room = [senderId, recipientId].sort().join('_');
    socket.to(room).emit('userTyping', { senderId, isTyping: isTypingActive });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.set('io', io);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const userRoutes = require('./routes/userRoutes');
app.use('/api', userRoutes);

const characterRoutes = require('./routes/characterRoutes');
app.use('/api/characters', characterRoutes);

const postRoutes = require('./routes/postRoutes');
app.use('/api/posts', postRoutes);

const messageRoutes = require('./routes/messageRoutes');
app.use('/api/messages', messageRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
let serverInstance;

const startServer = async () => {
  await connectDB();
  serverInstance = server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
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
