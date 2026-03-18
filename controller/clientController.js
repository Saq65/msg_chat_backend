const Client = require('../models/Client');
const Chat = require('../models/Chat');

// ─── GET ALL CLIENTS (Sir dekhe) ─────────────────────────────────────────────
// GET /api/clients
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    // Har client ke saath unread count bhi bhejo
    const clientsWithChat = await Promise.all(
      clients.map(async (client) => {
        const chat = await Chat.findOne({ clientId: client._id });
        return {
          ...client.toObject(),
          unreadBySir: chat ? chat.unreadBySir : 0,
          lastMessage: chat ? chat.lastMessage : '',
          lastMessageTime: chat ? chat.lastMessageTime : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: clients.length,
      clients: clientsWithChat,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SINGLE CLIENT ────────────────────────────────────────────────────────
// GET /api/clients/:id
const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).select('-password');
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client nahi mila.' });
    }
    res.status(200).json({ success: true, client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE CLIENT ACTIVE STATUS (Sir block/unblock kare) ────────────────────
// PATCH /api/clients/:id/status
const updateClientStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client nahi mila.' });
    }

    res.status(200).json({
      success: true,
      message: `Client ${isActive ? 'activated' : 'blocked'} ho gaya.`,
      client,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE CLIENT ────────────────────────────────────────────────────────────
// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client nahi mila.' });
    }
    // Chat bhi delete karo
    await Chat.findOneAndDelete({ clientId: req.params.id });

    res.status(200).json({ success: true, message: 'Client delete ho gaya.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CLIENT APNA PROFILE UPDATE KARE ─────────────────────────────────────────
// PATCH /api/clients/profile
const updateMyProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (req.file) updateData.profilePic = `/uploads/${req.file.filename}`;

    const client = await Client.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    }).select('-password');

    res.status(200).json({ success: true, client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  updateClientStatus,
  deleteClient,
  updateMyProfile,
};
