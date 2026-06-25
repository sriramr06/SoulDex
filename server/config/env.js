require('dotenv').config();

// Basic required secret
const required = ['JWT_SECRET'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}`,
  );
  process.exit(1);
}

// In production ensure critical external integrations are configured.
if (process.env.NODE_ENV === 'production') {
  const prodRequired = [];
  if (!process.env.MONGO_URI) prodRequired.push('MONGO_URI');
  if (!process.env.JWT_SECRET) prodRequired.push('JWT_SECRET');

  // Email config: require either RESEND_API_KEY or SMTP settings
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSmtp = !!(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  );
  if (!hasResend && !hasSmtp) {
    prodRequired.push('RESEND_API_KEY or EMAIL_HOST/EMAIL_USER/EMAIL_PASS');
  }

  // Cloudinary required for uploads in production
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    prodRequired.push(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
    );
  }

  if (prodRequired.length) {
    console.warn('⚠️ WARNING: Missing recommended production environment variables:');
    prodRequired.forEach((v) => console.warn(` - ${v}`));
    console.warn(
      'The server will start, but features relying on these variables (like Email Sending or Image Uploads) will fail if used.',
    );
  }
}

module.exports = {
  // MONGO_URI is optional in development; database.js will fallback to an
  // in-memory MongoDB when appropriate.
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
};
