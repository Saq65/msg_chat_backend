const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const messageRoutes = require('./routes/messageRoutes');

// ─── Socket handler ───────────────────────────────────────────────────────────
const socketHandler = require('./sockets/index');

// ─── Init ─────────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.io setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',            // React Native - sab allow
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25001,
});

// ─── Connect MongoDB ──────────────────────────────────────────────────────────
connectDB();

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files (uploaded PDFs, images, videos) ────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/messages', messageRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ MSG Chat Backend is running!',
    version: '1.0.0',
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route nahi mila.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Server error.' });
});

// ─── Socket.io handler attach karo ───────────────────────────────────────────
socketHandler(io);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌍 http://localhost:${PORT}`);
});

module.exports = { app, server, io };
