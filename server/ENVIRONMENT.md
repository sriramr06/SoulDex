Production environment setup

Add the following environment variables to your production deployment (e.g., hosting provider secrets, Docker env, or Kubernetes secrets):

Required in production:

- MONGO_URI
- JWT_SECRET
- Either RESEND_API_KEY OR EMAIL_HOST, EMAIL_USER, EMAIL_PASS
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- ALLOWED_ORIGINS (comma-separated list of allowed origins)

Optional but recommended:

- EMAIL_FROM
- EMAIL_BASE_URL
- SERVER_URL
- DEV_AUTO_VERIFY (should be false in production)

Notes:

- The server will refuse to start in `NODE_ENV=production` if any of the required production variables are missing.
- For sending transactional email, prefer Resend (set `RESEND_API_KEY`) or provide valid SMTP credentials.
- For image uploads, configure Cloudinary credentials.
