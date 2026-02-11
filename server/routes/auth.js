const express = require('express');
const { body, validationResult } = require('express-validator');
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

module.exports = router;