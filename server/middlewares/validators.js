/**
 * Request validation middleware and schemas
 * Uses express-validator for validation
 */

const { body, param, query, validationResult } = require('express-validator');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.param,
        message: e.msg,
      })),
    });
  }
  next();
};

// User validation schemas
const validateRegister = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const validateUpdateProfile = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name must be less than 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Bio must be less than 300 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and periods')
    .custom((value) => {
      if (value.endsWith('.')) {
        throw new Error('Username cannot end with a period');
      }
      return true;
    }),
  body('race')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Race must be less than 50 characters'),
  handleValidationErrors,
];

// Character validation schemas
const validateCreateCharacter = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Character name is required')
    .isLength({ max: 255 })
    .withMessage('Character name must be less than 255 characters'),
  body('race')
    .trim()
    .notEmpty()
    .withMessage('Race is required')
    .isLength({ max: 50 })
    .withMessage('Race must be less than 50 characters'),
  body('gender')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Gender must be less than 30 characters'),
  body('age')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Age must be less than 30 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  handleValidationErrors,
];

const validateUpdateCharacter = [
  param('id').isMongoId().withMessage('Invalid character ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Character name must be less than 255 characters'),
  body('race')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Race must be less than 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  handleValidationErrors,
];

// Post validation schemas
const validateCreatePost = [
  body('caption')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Caption must be less than 500 characters'),
  handleValidationErrors,
];

const validateAddComment = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Comment must be less than 500 characters'),
  param('postId').isMongoId().withMessage('Invalid post ID'),
  handleValidationErrors,
];

const validatePostId = [
  param('postId').isMongoId().withMessage('Invalid post ID'),
  handleValidationErrors,
];

const validateCommentId = [
  param('commentId').isMongoId().withMessage('Invalid comment ID'),
  handleValidationErrors,
];

// Message validation schemas
const validateSendMessage = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 1000 })
    .withMessage('Message must be less than 1000 characters'),
  handleValidationErrors,
];

// ID validation
const validateObjectId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors,
];

const validateCharacterId = [
  param('characterId').isMongoId().withMessage('Invalid character ID'),
  handleValidationErrors,
];

const validateUserId = [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  handleValidationErrors,
];

// Email verification
const validateVerifyEmail = [
  query('token').notEmpty().withMessage('Verification token is required'),
  handleValidationErrors,
];

// Password reset request
const validateRequestPasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors,
];

// Password reset confirmation
const validateResetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain a special character'),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateCreateCharacter,
  validateUpdateCharacter,
  validateCreatePost,
  validateAddComment,
  validatePostId,
  validateCommentId,
  validateSendMessage,
  validateObjectId,
  validateCharacterId,
  validateUserId,
  validateVerifyEmail,
  validateRequestPasswordReset,
  validateResetPassword,
  handleValidationErrors,
};
