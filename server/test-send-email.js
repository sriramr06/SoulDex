require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: 'SoulDex SMTP test',
      text: 'This is a test email from SoulDex SMTP settings.',
    });

    console.log('Email sent:', info.messageId || info.response || info);
  } catch (err) {
    console.error(
      'Failed to send test email:',
      err && err.message ? err.message : err,
    );
    process.exit(1);
  }
})();
