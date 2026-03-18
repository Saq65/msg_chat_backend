const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Sir = require('../models/Sir');

// ─── Protect any route (client or sir) ────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token missing.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if sir or client
    if (decoded.role === 'owner') {
      const sir = await Sir.findById(decoded.id);
      if (!sir) {
        return res.status(401).json({ success: false, message: 'Sir not found.' });
      }
      req.user = sir;
      req.role = 'owner';
    } else {
      const client = await Client.findById(decoded.id);
      if (!client) {
        return res.status(401).json({ success: false, message: 'Client not found.' });
      }
      if (!client.isActive) {
        return res.status(401).json({ success: false, message: 'Account deactivated.' });
      }
      req.user = client;
      req.role = 'client';
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// ─── Only Sir (owner) can access ──────────────────────────────────────────────
const onlySir = (req, res, next) => {
  if (req.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only Sir can do this.',
    });
  }
  next();
};

// ─── Only Client can access ───────────────────────────────────────────────────
const onlyClient = (req, res, next) => {
  if (req.role !== 'client') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only clients can do this.',
    });
  }
  next();
};

// ─── Socket.io token verify (called inside socket handler) ────────────────────
const verifySocketToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
};

module.exports = { protect, onlySir, onlyClient, verifySocketToken };
