const express = require('express');
const User = require('../models/User');
const Registration = require('../models/Registration');
const CoinHistory = require('../models/CoinHistory');
const { authenticate, isStudent } = require('../middleware/auth');

const router = express.Router();

// Get student profile (Student only)
router.get('/profile', authenticate, isStudent, async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select('-password');
    
    // Get registrations
    const registrations = await Registration.find({ student: req.user._id })
      .populate('event', 'name date location status')
      .sort({ registeredAt: -1 });

    // Get coin history
    const coinHistory = await CoinHistory.find({ student: req.user._id })
      .populate('event', 'name')
      .populate('changedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      student,
      registrations,
      coinHistory
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student history (Student only)
router.get('/history', authenticate, isStudent, async (req, res) => {
  try {
    const registrations = await Registration.find({ student: req.user._id })
      .populate('event', 'name date location coinsAllocated winners')
      .populate('event.winners', 'name studentId')
      .sort({ registeredAt: -1 });

    const coinHistory = await CoinHistory.find({ student: req.user._id })
      .populate('event', 'name')
      .populate('changedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      registrations,
      coinHistory
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

