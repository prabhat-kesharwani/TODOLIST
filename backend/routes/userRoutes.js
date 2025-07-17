const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const { registerUser, loginUser } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);

// Get all users - for dropdown and lastModifiedBy display
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, 'name _id'); // only id and name
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
