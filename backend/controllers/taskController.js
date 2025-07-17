const Task = require('../models/taskModel');
const User = require('../models/userModel');

const createTask = async (req, res) => {
  try {
    let { title, description, priority, dueDate, assignedTo } = req.body;
    const createdBy = req.user.id;

    // Convert empty string to undefined
    if (!assignedTo || assignedTo.trim() === "") {
      assignedTo = undefined;
    }

    // Smart Assign if not assigned manually
    if (!assignedTo) {
      const users = await User.find();

      if (users.length === 0) {
        return res.status(400).json({ message: 'No users available for assignment.' });
      }

      // Count tasks for each user
      const userTaskCounts = await Promise.all(
        users.map(async (user) => {
          const taskCount = await Task.countDocuments({ assignedTo: user._id });
          return { userId: user._id, count: taskCount };
        })
      );

      // Select user with least tasks
      const leastBusyUser = userTaskCounts.reduce((prev, curr) =>
        curr.count < prev.count ? curr : prev
      );

      assignedTo = leastBusyUser.userId;
    }

    // Create task
    const task = new Task({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy,
      lastEditedBy: createdBy,
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('lastEditedBy', 'name');

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Smart Assign Error:', error);
    res.status(500).json({ message: 'Failed to create task with smart assignment' });
  }
};

module.exports = {
  createTask,
  // ... other exports
};

