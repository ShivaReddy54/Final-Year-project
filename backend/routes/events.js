const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const User = require('../models/User');
const CoinHistory = require('../models/CoinHistory');
const { authenticate, isAdmin, isStudent } = require('../middleware/auth');

const router = express.Router();

// Get all events (students can view, admins can view)
router.get('/', authenticate, async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .populate('winners', 'name studentId')
      .sort({ date: 1 });

    // Get registration count for each event
    const eventsWithRegistrations = await Promise.all(
      events.map(async (event) => {
        const registrations = await Registration.countDocuments({ 
          event: event._id, 
          status: { $in: ['registered', 'participated', 'winner'] }
        });
        return {
          ...event.toObject(),
          currentRegistrations: registrations
        };
      })
    );

    res.json({ events: eventsWithRegistrations });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming events (for students)
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({ 
      date: { $gte: now },
      status: 'upcoming'
    })
    .populate('createdBy', 'name')
    .sort({ date: 1 });

    const eventsWithRegistrations = await Promise.all(
      events.map(async (event) => {
        const registrations = await Registration.countDocuments({ 
          event: event._id, 
          status: { $in: ['registered', 'participated', 'winner'] }
        });
        const isRegistered = await Registration.findOne({
          event: event._id,
          student: req.user._id
        });
        return {
          ...event.toObject(),
          currentRegistrations: registrations,
          isRegistered: !!isRegistered
        };
      })
    );

    res.json({ events: eventsWithRegistrations });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single event
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('winners', 'name studentId');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const registrations = await Registration.countDocuments({ 
      event: event._id, 
      status: { $in: ['registered', 'participated', 'winner'] }
    });

    const isRegistered = await Registration.findOne({
      event: event._id,
      student: req.user._id
    });

    res.json({
      event: {
        ...event.toObject(),
        currentRegistrations: registrations,
        isRegistered: !!isRegistered
      }
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create event (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, date, location, maxParticipants, coinsAllocated, numberOfWinners } = req.body;

    if (!name || !description || !date || !location || !maxParticipants || !coinsAllocated || !numberOfWinners) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const event = new Event({
      name,
      description,
      date: new Date(date),
      location,
      maxParticipants: parseInt(maxParticipants),
      coinsAllocated: parseInt(coinsAllocated),
      numberOfWinners: parseInt(numberOfWinners),
      createdBy: req.user._id
    });

    await event.save();

    // Create notifications for all students
    const students = await User.find({ role: 'student' });
    if (students.length > 0) {
      const notifications = students.map(student => ({
        user: student._id,
        title: 'New Event Created',
        message: `A new event "${name}" has been created. Register now!`,
        type: 'event_created',
        event: event._id
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      message: 'Event created successfully',
      event: await Event.findById(event._id).populate('createdBy', 'name')
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register for event (Student only)
router.post('/:id/register', authenticate, isStudent, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event deadline passed
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ error: 'Event registration deadline has passed' });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      event: event._id,
      student: req.user._id
    });

    if (existingRegistration && existingRegistration.status !== 'cancelled') {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Check if event is full
    const currentRegistrations = await Registration.countDocuments({
      event: event._id,
      status: { $in: ['registered', 'participated', 'winner'] }
    });

    if (currentRegistrations >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Create or update registration
    if (existingRegistration) {
      existingRegistration.status = 'registered';
      existingRegistration.registeredAt = new Date();
      await existingRegistration.save();
    } else {
      const registration = new Registration({
        student: req.user._id,
        event: event._id
      });
      await registration.save();
    }

    // Create notification
    await Notification.create({
      user: req.user._id,
      title: 'Registration Confirmed',
      message: `You have successfully registered for "${event.name}"`,
      type: 'registration_confirmed',
      event: event._id
    });

    res.json({ message: 'Successfully registered for event' });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unregister from event (Student only)
router.delete('/:id/register', authenticate, isStudent, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event deadline passed
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ error: 'Cannot unregister after event deadline' });
    }

    const registration = await Registration.findOne({
      event: event._id,
      student: req.user._id
    });

    if (!registration || registration.status === 'cancelled') {
      return res.status(400).json({ error: 'Not registered for this event' });
    }

    registration.status = 'cancelled';
    await registration.save();

    res.json({ message: 'Successfully unregistered from event' });
  } catch (error) {
    console.error('Unregister from event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get event registrations (Admin only)
router.get('/:id/registrations', authenticate, isAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const registrations = await Registration.find({
      event: event._id,
      status: { $in: ['registered', 'participated', 'winner'] }
    })
    .populate('student', 'name email studentId coins')
    .sort({ registeredAt: 1 });

    res.json({ registrations });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove student from event (Admin only)
router.delete('/:id/registrations/:studentId', authenticate, isAdmin, async (req, res) => {
  try {
    const registration = await Registration.findOne({
      event: req.params.id,
      student: req.params.studentId
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    registration.status = 'cancelled';
    await registration.save();

    res.json({ message: 'Student removed from event' });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Declare winners (Admin only)
router.post('/:id/winners', authenticate, isAdmin, async (req, res) => {
  try {
    const { winnerIds } = req.body;

    if (!winnerIds || !Array.isArray(winnerIds) || winnerIds.length === 0) {
      return res.status(400).json({ error: 'Winner IDs are required' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (winnerIds.length > event.numberOfWinners) {
      return res.status(400).json({ error: `Cannot have more than ${event.numberOfWinners} winners` });
    }

    // Verify all winners are registered
    const registrations = await Registration.find({
      event: event._id,
      student: { $in: winnerIds },
      status: { $in: ['registered', 'participated'] }
    });

    if (registrations.length !== winnerIds.length) {
      return res.status(400).json({ error: 'Some selected students are not registered for this event' });
    }

    // Calculate coins per winner
    const coinsPerWinner = Math.floor(event.coinsAllocated / winnerIds.length);

    // Update event winners
    event.winners = winnerIds;
    event.status = 'completed';
    await event.save();

    // Allocate coins and update registrations
    for (const winnerId of winnerIds) {
      const student = await User.findById(winnerId);
      if (student) {
        const previousBalance = student.coins;
        student.coins += coinsPerWinner;
        student.eventsParticipated += 1;
        await student.save();

        // Update registration status
        await Registration.findOneAndUpdate(
          { event: event._id, student: winnerId },
          { status: 'winner' }
        );

        // Create coin history
        await CoinHistory.create({
          student: winnerId,
          event: event._id,
          amount: coinsPerWinner,
          reason: `Winner in event: ${event.name}`,
          type: 'event_win',
          changedBy: req.user._id,
          previousBalance,
          newBalance: student.coins
        });

        // Create notification
        await Notification.create({
          user: winnerId,
          title: 'Winner Announcement',
          message: `Congratulations! You won ${coinsPerWinner} coins in "${event.name}"`,
          type: 'winner_announced',
          event: event._id
        });
      }
    }

    res.json({ 
      message: 'Winners declared and coins allocated successfully',
      winners: await User.find({ _id: { $in: winnerIds } }).select('name studentId coins')
    });
  } catch (error) {
    console.error('Declare winners error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

