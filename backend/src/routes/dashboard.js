const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { prisma } = require('../middleware/roleCheck');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    const [assignedToMe, allProjectTasks] = await Promise.all([
      prisma.task.findMany({
        where: { assigneeId: req.user.id },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.task.findMany({
        where: { projectId: { in: projectIds } },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),
    ]);

    const now = new Date();

    const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    allProjectTasks.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    const overdue = allProjectTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
    );

    const myOverdue = assignedToMe.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
    );

    res.json({
      totalProjects: projectIds.length,
      totalTasks: allProjectTasks.length,
      statusCounts,
      overdueCount: overdue.length,
      overdueTasks: overdue.slice(0, 10),
      myTasks: assignedToMe,
      myOverdueTasks: myOverdue,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
