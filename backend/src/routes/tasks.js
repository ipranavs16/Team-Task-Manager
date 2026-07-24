const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireProjectMember, requireProjectAdmin, prisma } = require('../middleware/roleCheck');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

// Create a task in a project (admin only)
router.post(
  '/projects/:projectId/tasks',
  requireProjectAdmin(),
  [
    body('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    body('assigneeId').optional().isInt().withMessage('assigneeId must be an integer'),
    body('status').optional().isIn(STATUSES),
    body('priority').optional().isIn(PRIORITIES),
    body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { title, description, assigneeId, status, priority, dueDate } = req.body;

      if (assigneeId) {
        const isMember = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: req.projectId, userId: Number(assigneeId) } },
        });
        if (!isMember) {
          return res.status(400).json({ error: 'Assignee must be a member of this project' });
        }
      }

      const task = await prisma.task.create({
        data: {
          projectId: req.projectId,
          title,
          description: description || null,
          status: status || 'TODO',
          priority: priority || 'MEDIUM',
          dueDate: dueDate ? new Date(dueDate) : null,
          assigneeId: assigneeId ? Number(assigneeId) : null,
          createdById: req.user.id,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  }
);

// List tasks for a project (any member), with optional filters
router.get('/projects/:projectId/tasks', requireProjectMember(), async (req, res, next) => {
  try {
    const { status, assigneeId } = req.query;
    const tasks = await prisma.task.findMany({
      where: {
        projectId: req.projectId,
        ...(status && { status }),
        ...(assigneeId && { assigneeId: Number(assigneeId) }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// Helper: load a task and the requester's membership/role in its project
async function loadTaskContext(req, res, next) {
  try {
    const taskId = Number(req.params.taskId);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId: req.user.id } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this project' });

    req.task = task;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

// Update a task.
// - Admins can update any field on any task in their project.
// - Members can only update the `status` field, and only on tasks assigned to them.
router.patch(
  '/tasks/:taskId',
  loadTaskContext,
  [
    body('status').optional().isIn(STATUSES),
    body('priority').optional().isIn(PRIORITIES),
    body('title').optional().trim().isLength({ min: 2 }),
    body('assigneeId').optional({ nullable: true }).isInt(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const isAdmin = req.membership.role === 'ADMIN';
      const isAssignee = req.task.assigneeId === req.user.id;

      const requestedFields = Object.keys(req.body);
      const onlyStatus = requestedFields.every((f) => f === 'status');

      if (!isAdmin) {
        if (!isAssignee || !onlyStatus) {
          return res.status(403).json({
            error: 'Members may only update the status of tasks assigned to them',
          });
        }
      }

      const data = {};
      if (isAdmin) {
        const { title, description, priority, dueDate, assigneeId, status } = req.body;
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (priority !== undefined) data.priority = priority;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        if (assigneeId !== undefined) {
          if (assigneeId !== null) {
            const isMember = await prisma.projectMember.findUnique({
              where: { projectId_userId: { projectId: req.task.projectId, userId: Number(assigneeId) } },
            });
            if (!isMember) return res.status(400).json({ error: 'Assignee must be a member of this project' });
          }
          data.assigneeId = assigneeId ? Number(assigneeId) : null;
        }
        if (status !== undefined) data.status = status;
      } else {
        data.status = req.body.status;
      }

      const task = await prisma.task.update({
        where: { id: req.task.id },
        data,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      res.json({ task });
    } catch (err) {
      next(err);
    }
  }
);

// Delete a task (admin only)
router.delete('/tasks/:taskId', loadTaskContext, async (req, res, next) => {
  try {
    if (req.membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin role required to delete tasks' });
    }
    await prisma.task.delete({ where: { id: req.task.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
