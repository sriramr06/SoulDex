const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { ALLOWED_ORIGINS } = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

app.use(
  cors({
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
    credentials: true,
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(limiter);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const userRoutes = require('./routes/userRoutes');
app.use('/api', userRoutes);

// Health check — used by UptimeRobot to keep the server warm
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const characterRoutes = require('./routes/characterRoutes');
app.use('/api/characters', characterRoutes);

const postRoutes = require('./routes/postRoutes');
app.use('/api/posts', postRoutes);

const messageRoutes = require('./routes/messageRoutes');
app.use('/api/messages', messageRoutes);

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
const serveClient = fs.existsSync(clientBuildPath);

if (serveClient) {
  app.use(express.static(clientBuildPath));
}

if (serveClient) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
