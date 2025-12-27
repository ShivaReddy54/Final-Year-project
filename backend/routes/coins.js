const express = require('express');
const User = require('../models/User');
const CoinHistory = require('../models/CoinHistory');
const Notification = require('../models/Notification');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get coin history for a student
router.get('/history/:studentId', authenticate, isAdmin, async (req, res) => {
  try {
    const coinHistory = await CoinHistory.find({ student: req.params.studentId })
      .populate('event', 'name')
      .populate('changedBy', 'name')
      .populate('student', 'name studentId')
      .sort({ createdAt: -1 });

    res.json({ coinHistory });
  } catch (error) {
    console.error('Get coin history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually add or subtract coins (Admin only)
router.post('/manage', authenticate, isAdmin, async (req, res) => {
  try {
    const { studentId, amount, reason, type } = req.body;

    if (!studentId || !amount || !reason || !type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['add', 'subtract'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "add" or "subtract"' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const coinAmount = parseInt(amount);
    if (coinAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const previousBalance = student.coins;
    let newBalance;

    if (type === 'add') {
      newBalance = previousBalance + coinAmount;
    } else {
      if (previousBalance < coinAmount) {
        return res.status(400).json({ error: 'Insufficient coins to subtract' });
      }
      newBalance = previousBalance - coinAmount;
    }

    // Update student coins
    student.coins = newBalance;
    await student.save();

    // Create coin history
    const coinHistory = await CoinHistory.create({
      student: studentId,
      event: null,
      amount: type === 'add' ? coinAmount : -coinAmount,
      reason,
      type: type === 'add' ? 'manual_add' : 'manual_subtract',
      changedBy: req.user._id,
      previousBalance,
      newBalance
    });

    // Create notification
    await Notification.create({
      user: studentId,
      title: 'Coin Balance Updated',
      message: `Your coin balance has been ${type === 'add' ? 'increased' : 'decreased'} by ${coinAmount}. Reason: ${reason}`,
      type: 'coin_update'
    });

    res.json({
      message: `Coins ${type === 'add' ? 'added' : 'subtracted'} successfully`,
      coinHistory: await CoinHistory.findById(coinHistory._id)
        .populate('student', 'name studentId')
        .populate('changedBy', 'name')
    });
  } catch (error) {
    console.error('Manage coins error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

