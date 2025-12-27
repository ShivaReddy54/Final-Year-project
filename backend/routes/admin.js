const express = require('express');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const CoinHistory = require('../models/CoinHistory');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get admin dashboard stats
router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalEvents = await Event.countDocuments();
    
    // Get total coins distributed
    const coinHistory = await CoinHistory.aggregate([
      { $match: { type: 'event_win' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCoinsDistributed = coinHistory[0]?.total || 0;

    // Get current coins held by students
    const students = await User.find({ role: 'student' });
    const totalCoinsHeld = students.reduce((sum, student) => sum + student.coins, 0);

    // Get upcoming events count
    const upcomingEvents = await Event.countDocuments({
      date: { $gte: new Date() },
      status: 'upcoming'
    });

    res.json({
      stats: {
        totalStudents,
        totalEvents,
        upcomingEvents,
        totalCoinsDistributed,
        totalCoinsHeld
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search students (Global search - not event specific)
router.get('/students/search', authenticate, isAdmin, async (req, res) => {
  try {
    const { minEvents, maxEvents, minCoins, maxCoins, search } = req.query;
    
    let query = { role: 'student' };

    // Search by name or student ID
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query).select('-password');

    // Filter by events participated
    let filteredStudents = students;
    if (minEvents !== undefined || maxEvents !== undefined) {
      filteredStudents = students.filter(student => {
        const events = student.eventsParticipated || 0;
        const min = minEvents ? parseInt(minEvents) : 0;
        const max = maxEvents ? parseInt(maxEvents) : Infinity;
        return events >= min && events <= max;
      });
    }

    // Filter by coins
    if (minCoins !== undefined || maxCoins !== undefined) {
      filteredStudents = filteredStudents.filter(student => {
        const coins = student.coins || 0;
        const min = minCoins ? parseInt(minCoins) : 0;
        const max = maxCoins ? parseInt(maxCoins) : Infinity;
        return coins >= min && coins <= max;
      });
    }

    // Get detailed information for each student
    const studentsWithDetails = await Promise.all(
      filteredStudents.map(async (student) => {
        const registrations = await Registration.find({ student: student._id })
          .populate('event', 'name date status')
          .sort({ registeredAt: -1 });

        const coinHistory = await CoinHistory.find({ student: student._id })
          .populate('event', 'name')
          .populate('changedBy', 'name')
          .sort({ createdAt: -1 })
          .limit(10);

        return {
          ...student.toObject(),
          registrations,
          recentCoinHistory: coinHistory
        };
      })
    );

    res.json({ students: studentsWithDetails });
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all students (simplified)
router.get('/students', authenticate, isAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ name: 1 });

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single student details
router.get('/students/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const registrations = await Registration.find({ student: student._id })
      .populate('event', 'name date location status coinsAllocated')
      .sort({ registeredAt: -1 });

    const coinHistory = await CoinHistory.find({ student: student._id })
      .populate('event', 'name')
      .populate('changedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      student,
      registrations,
      coinHistory
    });
  } catch (error) {
    console.error('Get student details error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

