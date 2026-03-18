const express = require('express');
const router = express.Router();
const {
  getAllChats,
  getMessages,
  sendMessage,
  uploadFile,
  deleteMessage,
} = require('../controller/messageController');
const { protect, onlySir } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// ─── Multer config for file uploads ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allowed: images, PDF, video
  const allowed = /jpeg|jpg|png|gif|webp|pdf|mp4|mov|avi|mkv/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (ext || mime) {
    cb(null, true);
  } else {
    cb(new Error('Sirf image, PDF ya video allowed hai.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Routes
router.get('/chats', protect, onlySir, getAllChats);           // Sir: all client chats
router.get('/:clientId', protect, getMessages);                // Sir + Client: chat messages
router.post('/send', protect, sendMessage);                    // Text message (REST)
router.post('/upload', protect, upload.single('file'), uploadFile); // File upload
router.delete('/:messageId', protect, deleteMessage);          // Delete message

module.exports = router;
