const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ensures req.user is a member of the project (id from req.params.projectId,
 * or resolved via req.task for task-scoped routes). Attaches req.membership.
 */
function requireProjectMember() {
  return async (req, res, next) => {
    try {
      const projectId = Number(req.params.projectId || req.body.projectId);
      if (!projectId) return res.status(400).json({ error: 'projectId is required' });

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: req.user.id } },
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }

      req.membership = membership;
      req.projectId = projectId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Ensures req.user is an ADMIN of the project. Must run after requireProjectMember,
 * or it will resolve membership itself.
 */
function requireProjectAdmin() {
  return async (req, res, next) => {
    try {
      let membership = req.membership;
      if (!membership) {
        const projectId = Number(req.params.projectId || req.body.projectId);
        if (!projectId) return res.status(400).json({ error: 'projectId is required' });
        membership = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: req.user.id } },
        });
        req.projectId = projectId;
      }

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }
      if (membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin role required for this action' });
      }

      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireProjectMember, requireProjectAdmin, prisma };
