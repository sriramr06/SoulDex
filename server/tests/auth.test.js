const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');

jest.mock('../utils/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

const emailService = require('../utils/emailService');

describe('Auth flows', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: 'souldex_test',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
  });

  it('registers a new user and sends verification email', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        email: 'test@example.com',
        password: 'Password!1',
      })
      .expect(201);

    expect(response.body.message).toMatch(/please check your email/i);
    expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);

    const createdUser = await User.findOne({ email: 'test@example.com' });
    expect(createdUser).toBeTruthy();
    expect(createdUser.isEmailVerified).toBe(false);
    expect(createdUser.emailVerificationToken).toBeTruthy();
  });

  it('prevents login before email verification and verifies email', async () => {
    await request(app)
      .post('/api/register')
      .send({
        email: 'verify@example.com',
        password: 'Password!1',
      })
      .expect(201);

    const registerCall = emailService.sendVerificationEmail.mock.calls[0];
    const verificationToken = registerCall[1];

    await request(app)
      .post('/api/login')
      .send({
        email: 'verify@example.com',
        password: 'Password!1',
      })
      .expect(403);

    await request(app)
      .get('/api/verify-email')
      .query({ token: verificationToken })
      .expect(200);

    const loggedIn = await request(app)
      .post('/api/login')
      .send({
        email: 'verify@example.com',
        password: 'Password!1',
      })
      .expect(200);

    expect(loggedIn.body.token).toBeTruthy();
    expect(loggedIn.body.refreshToken).toBeTruthy();
  });

  it('handles password reset request and resets password successfully', async () => {
    await request(app)
      .post('/api/register')
      .send({
        email: 'reset@example.com',
        password: 'Password!1',
      })
      .expect(201);

    const verifyToken = emailService.sendVerificationEmail.mock.calls[0][1];
    await request(app)
      .get('/api/verify-email')
      .query({ token: verifyToken })
      .expect(200);

    await request(app)
      .post('/api/request-password-reset')
      .send({ email: 'reset@example.com' })
      .expect(200);

    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const resetToken = emailService.sendPasswordResetEmail.mock.calls[0][1];

    await request(app)
      .post('/api/reset-password')
      .send({ token: resetToken, password: 'NewPassword!1' })
      .expect(200);

    const loginResponse = await request(app)
      .post('/api/login')
      .send({ email: 'reset@example.com', password: 'NewPassword!1' })
      .expect(200);

    expect(loginResponse.body.token).toBeTruthy();
  });
});
