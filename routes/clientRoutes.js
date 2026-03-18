const express = require('express');
const router = express.Router();
const {
  getAllClients,
  getClientById,
  updateClientStatus,
  deleteClient,
  updateMyProfile,
} = require('../controller/clientController');
const { protect, onlySir, onlyClient } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer for profile pic
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Sir only routes
router.get('/', protect, onlySir, getAllClients);
router.get('/:id', protect, onlySir, getClientById);
router.patch('/:id/status', protect, onlySir, updateClientStatus);
router.delete('/:id', protect, onlySir, deleteClient);

// Client own profile
router.patch('/profile/update', protect, onlyClient, upload.single('profilePic'), updateMyProfile);

module.exports = router;
