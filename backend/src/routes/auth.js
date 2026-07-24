const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { signToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashed },
      });

      const token = signToken(user);
      res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = signToken(user);
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
