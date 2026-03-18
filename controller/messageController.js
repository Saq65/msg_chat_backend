const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Client = require('../models/Client');
const path = require('path');

// ─── Helper: Get or Create Chat room ─────────────────────────────────────────
const getOrCreateChat = async (clientId) => {
  let chat = await Chat.findOne({ clientId });
  if (!chat) {
    chat = await Chat.create({ clientId });
  }
  return chat;
};

// ─── GET ALL CHATS (Sir ka dashboard - client list with last msg) ─────────────
// GET /api/messages/chats
const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({})
      .populate('clientId', 'name email profilePic isActive lastSeen socketId')
      .sort({ lastMessageTime: -1 });

    res.status(200).json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MESSAGES OF A CHAT ───────────────────────────────────────────────────
// GET /api/messages/:clientId?page=1&limit=30
const getMessages = async (req, res) => {
  try {
    const { clientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const chat = await getOrCreateChat(clientId);

    const messages = await Message.find({
      chatId: chat._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Messages ko chronological order mein bhejo
    messages.reverse();

    // Mark messages as read
    const isClient = req.role === 'client';
    await Message.updateMany(
      {
        chatId: chat._id,
        isRead: false,
        senderType: isClient ? 'sir' : 'client',
      },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread count
    if (isClient) {
      chat.unreadByClient = 0;
    } else {
      chat.unreadBySir = 0;
    }
    await chat.save();

    const total = await Message.countDocuments({ chatId: chat._id, isDeleted: false });

    res.status(200).json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: total > page * limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SEND TEXT MESSAGE (REST fallback, main via Socket) ──────────────────────
// POST /api/messages/send
const sendMessage = async (req, res) => {
  try {
    const { clientId, message } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'clientId required.' });
    }

    const chat = await getOrCreateChat(clientId);

    const isSir = req.role === 'owner';

    const newMsg = await Message.create({
      chatId: chat._id,
      senderId: isSir ? 'SIR_OWNER' : req.user._id.toString(),
      senderType: isSir ? 'sir' : 'client',
      message: message || '',
      fileType: 'text',
    });

    // Update chat last message
    chat.lastMessage = message || '';
    chat.lastMessageTime = new Date();
    chat.lastMessageType = 'text';
    if (isSir) chat.unreadByClient += 1;
    else chat.unreadBySir += 1;
    await chat.save();

    res.status(201).json({ success: true, message: newMsg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPLOAD FILE (PDF / Image / Video) ───────────────────────────────────────
// POST /api/messages/upload
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File upload nahi hua.' });
    }

    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'clientId required.' });
    }

    // File type detect karo
    const ext = path.extname(req.file.originalname).toLowerCase();
    let fileType = 'file';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) fileType = 'image';
    else if (ext === '.pdf') fileType = 'pdf';
    else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) fileType = 'video';

    const fileUrl = `/uploads/${req.file.filename}`;
    const isSir = req.role === 'owner';

    const chat = await getOrCreateChat(clientId);

    const newMsg = await Message.create({
      chatId: chat._id,
      senderId: isSir ? 'SIR_OWNER' : req.user._id.toString(),
      senderType: isSir ? 'sir' : 'client',
      message: '',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType,
    });

    // Update chat preview
    chat.lastMessage = `📎 ${req.file.originalname}`;
    chat.lastMessageTime = new Date();
    chat.lastMessageType = fileType;
    if (isSir) chat.unreadByClient += 1;
    else chat.unreadBySir += 1;
    await chat.save();

    res.status(201).json({
      success: true,
      message: newMsg,
      fileUrl,
      fileType,
      fileName: req.file.originalname,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE MESSAGE (soft delete) ────────────────────────────────────────────
// DELETE /api/messages/:messageId
const deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Message nahi mila.' });

    // Only sender delete kar sakta hai
    const senderId = req.role === 'owner' ? 'SIR_OWNER' : req.user._id.toString();
    if (msg.senderId !== senderId) {
      return res.status(403).json({ success: false, message: 'Sirf apna message delete kar sakte ho.' });
    }

    msg.isDeleted = true;
    await msg.save();

    res.status(200).json({ success: true, message: 'Message delete ho gaya.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllChats,
  getMessages,
  sendMessage,
  uploadFile,
  deleteMessage,
};
