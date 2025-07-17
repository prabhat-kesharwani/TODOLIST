const express = require('express');
const router = express.Router();
const Task = require('../models/taskModel');
const authMiddleware = require('../middleware/authMiddleware');

// Get all tasks (accessible to any authenticated user)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('createdBy', 'name')
      .populate('lastEditedBy', 'name')
      .populate('assignedTo', 'name');

    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const task = new Task(taskData);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name');

    const io = req.app.get('io');
    io.emit('taskCreated', populatedTask);

    res.status(201).json(populatedTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lastEditedBy: req.user._id,
      },
      { new: true }
    )
      .populate('createdBy', 'name')
      .populate('lastEditedBy', 'name')
      .populate('assignedTo', 'name');

    if (!updatedTask) return res.status(404).json({ message: 'Task not found' });

    const io = req.app.get('io');
    io.emit('taskUpdated', updatedTask);

    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) return res.status(404).json({ message: 'Task not found' });

    const io = req.app.get('io');
    io.emit('taskDeleted', deletedTask._id);

    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
