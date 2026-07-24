const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireProjectMember, requireProjectAdmin, prisma } = require('../middleware/roleCheck');

const router = express.Router();
router.use(requireAuth);

// Create a project - creator becomes ADMIN automatically
router.post(
  '/',
  [body('name').trim().isLength({ min: 2 }).withMessage('Project name must be at least 2 characters')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, description } = req.body;
      const project = await prisma.project.create({
        data: {
          name,
          description: description || null,
          ownerId: req.user.id,
          members: {
            create: { userId: req.user.id, role: 'ADMIN' },
          },
        },
        include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      });

      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// List all projects the current user belongs to
router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      include: {
        project: {
          include: {
            _count: { select: { tasks: true, members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const projects = memberships.map((m) => ({
      ...m.project,
      myRole: m.role,
    }));

    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// Get a single project with members and tasks
router.get('/:projectId', requireProjectMember(), async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.projectId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json({ project, myRole: req.membership.role });
  } catch (err) {
    next(err);
  }
});

// Update project details (admin only)
router.patch(
  '/:projectId',
  requireProjectAdmin(),
  [body('name').optional().trim().isLength({ min: 2 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, description } = req.body;
      const project = await prisma.project.update({
        where: { id: req.projectId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      });

      res.json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// Delete a project (admin only)
router.delete('/:projectId', requireProjectAdmin(), async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.projectId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Add a member to the project by email (admin only)
router.post(
  '/:projectId/members',
  requireProjectAdmin(),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, role } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ error: 'No user found with that email' });

      const existing = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: req.projectId, userId: user.id } },
      });
      if (existing) return res.status(409).json({ error: 'User is already a member of this project' });

      const membership = await prisma.projectMember.create({
        data: { projectId: req.projectId, userId: user.id, role: role || 'MEMBER' },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      res.status(201).json({ membership });
    } catch (err) {
      next(err);
    }
  }
);

// Update a member's role (admin only)
router.patch(
  '/:projectId/members/:userId',
  requireProjectAdmin(),
  [body('role').isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const targetUserId = Number(req.params.userId);
      const membership = await prisma.projectMember.update({
        where: { projectId_userId: { projectId: req.projectId, userId: targetUserId } },
        data: { role: req.body.role },
      });

      res.json({ membership });
    } catch (err) {
      next(err);
    }
  }
);

// Remove a member from the project (admin only)
router.delete('/:projectId/members/:userId', requireProjectAdmin(), async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.userId);

    const project = await prisma.project.findUnique({ where: { id: req.projectId } });
    if (project.ownerId === targetUserId) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: req.projectId, userId: targetUserId } },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
