# College Event Management System

A complete full-stack College Event Management System where Admins manage events and students, and Students register for events and earn coins based on participation and winnings.

## 🎯 Features

### Admin Features
- ✅ Create Events with details (name, description, date, location, max participants, coins, number of winners)
- ✅ View Event Registrations
- ✅ Remove students from events
- ✅ Declare Winners and automatically allocate coins
- ✅ Push Notifications for new events and winner announcements
- ✅ Student Profile Query (Global search)
  - Filter by number of events participated
  - Filter by total coins earned
  - Search by name, student ID, or email
- ✅ Manual Coin Management (add/subtract coins with reason)
- ✅ Admin Dashboard with statistics

### Student Features
- ✅ Register & Login
- ✅ Profile Management
- ✅ View all upcoming events
- ✅ Register/Unregister for events
- ✅ View personal history (events participated, coin history)
- ✅ Notifications for event announcements and coin updates
- ✅ Track coins earned per event
- ✅ View manual coin changes with reasons

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB (MongoDB Atlas)
- **Frontend**: HTML, CSS, Vanilla JavaScript (No frameworks)
- **Authentication**: JWT Token-based

## 📁 Project Structure

```
Event/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Event.js
│   │   ├── Registration.js
│   │   ├── CoinHistory.js
│   │   └── Notification.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── events.js
│       ├── students.js
│       ├── admin.js
│       ├── coins.js
│       └── notifications.js
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   └── student.js
│   ├── index.html
│   ├── admin.html
│   └── student.html
├── server.js
├── package.json
├── .env
└── README.md
```

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)

### Installation Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd Event
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   
   The `.env` file is already configured with the MongoDB connection string. If you need to change it, edit the `.env` file:
   ```
   MONGODB_URI=mongodb+srv://karrishivashankarreddy5_db_user:1@cluster0.xm9kzem.mongodb.net/?appName=Cluster0
   JWT_SECRET=your_secret_key_change_in_production_12345
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   Open your browser and navigate to:
   - Main page: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin
   - Student Dashboard: http://localhost:3000/student

## 📝 Usage Guide

### First Time Setup

1. **Register an Admin Account**
   - Go to http://localhost:3000
   - Click "Register here"
   - Fill in the form:
     - Name: Your name
     - Email: Your email
     - Password: Your password (min 6 characters)
     - Role: Select "Admin"
   - Click "Register"
   - You'll be automatically logged in and redirected to the Admin Dashboard

2. **Register Student Accounts**
   - Logout if logged in as admin
   - Register with Role: "Student"
   - Provide a unique Student ID

3. **Admin Workflow**
   - Create events with all required details
   - View registrations for each event
   - Declare winners (select from registered students)
   - Coins are automatically allocated to winners
   - Search students globally
   - Manually add/subtract coins from students

4. **Student Workflow**
   - Login with student credentials
   - View upcoming events
   - Register for events
   - Unregister before event deadline (if needed)
   - View event history and coin history
   - Receive notifications for events and coin updates

## 🔐 Authentication

The system uses JWT (JSON Web Token) for authentication. Tokens are stored in localStorage and sent with each API request in the Authorization header.

## 🎨 UI Design

- **Color Scheme**: Purple, Orange, Green, Gray (NO BLUE colors used)
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean and user-friendly interface

## 📊 Database Models

### User
- Stores admin and student accounts
- Tracks coins balance and events participated

### Event
- Stores event details
- Tracks winners and status

### Registration
- Links students to events
- Tracks registration status

### CoinHistory
- Records all coin transactions
- Tracks event wins and manual adjustments
- Stores previous and new balances

### Notification
- Stores notifications for users
- Tracks read/unread status

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - Get all events
- `GET /api/events/upcoming` - Get upcoming events
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Admin only)
- `POST /api/events/:id/register` - Register for event (Student only)
- `DELETE /api/events/:id/register` - Unregister from event (Student only)
- `GET /api/events/:id/registrations` - Get event registrations (Admin only)
- `DELETE /api/events/:id/registrations/:studentId` - Remove student (Admin only)
- `POST /api/events/:id/winners` - Declare winners (Admin only)

### Students
- `GET /api/students/profile` - Get student profile (Student only)
- `GET /api/students/history` - Get student history (Student only)

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats (Admin only)
- `GET /api/admin/students` - Get all students (Admin only)
- `GET /api/admin/students/search` - Search students (Admin only)
- `GET /api/admin/students/:id` - Get student details (Admin only)

### Coins
- `GET /api/coins/history/:studentId` - Get coin history (Admin only)
- `POST /api/coins/manage` - Manage coins (Admin only)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Role-based access control (Admin/Student)
- Input validation on all endpoints

## 📝 Notes

- Students cannot edit their own coins
- Coins are only awarded by admins
- Students cannot register twice for the same event
- Event registration closes after the event date
- All coin transactions are logged with history
- Notifications are automatically created for important events

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure your MongoDB connection string is correct in `.env`
- Check if your IP is whitelisted in MongoDB Atlas
- Verify network connectivity

### Port Already in Use
- Change the PORT in `.env` file
- Or kill the process using port 3000

### CORS Issues
- CORS is enabled for all origins in development
- For production, configure CORS appropriately

## 📄 License

This project is created for educational purposes.

## 👨‍💻 Developer

Built with ❤️ using Node.js, Express, MongoDB, and Vanilla JavaScript.

---

**Enjoy managing your college events! 🎓✨**

