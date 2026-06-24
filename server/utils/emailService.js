/**
 * Email sending service using Resend in production when configured,
 * with Nodemailer fallback for development and SMTP when Resend is not set up.
 */

const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const isProduction = process.env.NODE_ENV === 'production';
const fromAddress = process.env.EMAIL_FROM || 'noreply@souldex.com';

let transporter;
let resendClient;

const hasSmtpConfig =
  process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

// Prefer SMTP when SMTP credentials are provided. Resend is used only when
// there is no SMTP config or when explicitly requested via USE_RESEND.
const shouldUseResend =
  !!process.env.RESEND_API_KEY &&
  (!hasSmtpConfig || process.env.USE_RESEND === 'true');

if (process.env.RESEND_API_KEY) {
  // Only initialize the Resend client if it's actually intended to be used.
  if (shouldUseResend) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log('EmailService: Resend configured and will be used');
  } else {
    console.log('EmailService: Resend configured but SMTP will be preferred');
  }
}

if (hasSmtpConfig) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log('EmailService: SMTP configured');
} else if (!isProduction) {
  transporter = nodemailer.createTestAccount().then(async (testAccount) => {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  });
  console.log('EmailService: Ethereal test account configured');
}

const buildHtml = ({ title, intro, buttonText, buttonLink, footer }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>${title}</h2>
    <p>${intro}</p>
    <p>
      <a href="${buttonLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        ${buttonText}
      </a>
    </p>
    <p>Or copy and paste this link:</p>
    <p>${buttonLink}</p>
    <p style="color: #666; font-size: 12px;">${footer}</p>
  </div>
`;

const sendEmail = async ({ to, subject, html }) => {
  if (resendClient) {
    console.log('Sending email via Resend to', to);
    try {
      const response = await resendClient.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });
      console.log('Resend send response:', response);
      return true;
    } catch (error) {
      console.error('Resend email error:', error);
      throw error;
    }
  }

  if (!transporter) {
    throw new Error('No email transport configured');
  }

  if (typeof transporter.then === 'function') {
    transporter = await transporter;
  }

  console.log('Sending email via SMTP to', to, 'from', fromAddress);

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    console.log('SMTP send info:', info);
    return true;
  } catch (error) {
    if (error && error.code === 'EAUTH') {
      console.error(
        'SMTP authentication failed. Check EMAIL_USER and EMAIL_PASS, or use a valid SMTP provider/app password for Gmail.',
      );
    }
    console.error('SMTP send error:', error);
    throw error;
  }
};

const sendVerificationEmail = async (
  email,
  verificationToken,
  verificationBaseUrl,
) => {
  const base = (verificationBaseUrl || '').replace(/\/$/, '');
  const verificationLink = `${base}/api/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: email,
    subject: 'Verify Your SoulDex Email',
    html: buildHtml({
      title: 'Welcome to SoulDex!',
      intro: 'Please verify your email address to complete your registration.',
      buttonText: 'Verify Email',
      buttonLink: verificationLink,
      footer:
        'This link will expire in 24 hours. If you did not create an account, ignore this email.',
    }),
  });
};

const sendPasswordResetEmail = async (email, resetToken, baseUrl) => {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: 'Reset Your SoulDex Password',
    html: buildHtml({
      title: 'Password Reset Request',
      intro: 'Click the link below to reset your password.',
      buttonText: 'Reset Password',
      buttonLink: resetLink,
      footer:
        'This link will expire in 1 hour. If you did not request a password reset, ignore this email.',
    }),
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
