const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const router = express.Router();

// Input validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const profileValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const passwordValidation = [
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Confirm password does not match new password')
];

// Validation middleware
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// Routes
router.post('/login', loginValidation, validate, authController.login);
router.post('/verify', authController.verifyToken);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, requireAdmin, authController.getMe);
router.put('/profile', authenticateToken, requireAdmin, profileValidation, validate, authController.updateProfile);
router.put('/password', authenticateToken, requireAdmin, passwordValidation, validate, authController.updatePassword);

module.exports = router;
