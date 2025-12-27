const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend with no-cache headers for JS and CSS
app.use(express.static(path.join(__dirname, 'frontend'), {
  etag: false,
  maxAge: 0,
  lastModified: false,
  setHeaders: (res, path) => {
    // Aggressive no-cache for JS, CSS, and HTML files
    if (path.match(/\.(js|css|html)$/)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Last-Modified', new Date().toUTCString());
    }
  }
}));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://karrishivashankarreddy5_db_user:1@cluster0.xm9kzem.mongodb.net/EventManagement?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/events', require('./backend/routes/events'));
app.use('/api/students', require('./backend/routes/students'));
app.use('/api/admin', require('./backend/routes/admin'));
app.use('/api/coins', require('./backend/routes/coins'));
app.use('/api/notifications', require('./backend/routes/notifications'));

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'student.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

