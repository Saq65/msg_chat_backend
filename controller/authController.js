const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Sir = require('../models/Sir');

// ─── Generate JWT Token ────────────────────────────────────────────────────────
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─── CLIENT REGISTER ──────────────────────────────────────────────────────────
// POST /api/auth/client/register
const registerClient = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email aur password required hain.',
      });
    }

    // Check if already exists
    const exists = await Client.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Is email se account pehle se hai.',
      });
    }

    const client = await Client.create({ name, email, password, phone });

    const token = generateToken(client._id, 'client');

    res.status(201).json({
      success: true,
      message: 'Client registered successfully.',
      token,
      user: {
        _id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        role: 'client',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CLIENT LOGIN ─────────────────────────────────────────────────────────────
// POST /api/auth/client/login
const loginClient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email aur password dono chahiye.',
      });
    }

    const client = await Client.findOne({ email }).select('+password');
    if (!client) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai.' });
    }

    const isMatch = await client.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai.' });
    }

    if (!client.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated hai.' });
    }

    const token = generateToken(client._id, 'client');

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        profilePic: client.profilePic,
        role: 'client',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SIR REGISTER (only once, first time setup) ───────────────────────────────
// POST /api/auth/sir/register
const registerSir = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email aur password required.' });
    }

    // Sir ek hi hona chahiye
    const existingSir = await Sir.findOne({});
    if (existingSir) {
      return res.status(400).json({
        success: false,
        message: 'Sir ka account pehle se registered hai.',
      });
    }

    const sir = await Sir.create({ name: name || 'Sir', email, password });
    const token = generateToken(sir._id, 'owner');

    res.status(201).json({
      success: true,
      message: 'Sir registered successfully.',
      token,
      user: {
        _id: sir._id,
        name: sir.name,
        email: sir.email,
        role: 'owner',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SIR LOGIN ────────────────────────────────────────────────────────────────
// POST /api/auth/sir/login
const loginSir = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email aur password chahiye.' });
    }

    const sir = await Sir.findOne({ email }).select('+password');
    if (!sir) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai.' });
    }

    const isMatch = await sir.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email ya password galat hai.' });
    }

    const token = generateToken(sir._id, 'owner');

    res.status(200).json({
      success: true,
      message: 'Sir login successful.',
      token,
      user: {
        _id: sir._id,
        name: sir.name,
        email: sir.email,
        role: 'owner',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────
// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
      role: req.role,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerClient,
  loginClient,
  registerSir,
  loginSir,
  getMe,
};
