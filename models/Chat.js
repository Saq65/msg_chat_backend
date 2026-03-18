const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    // Sir (owner) ka reference - hardcoded single sir
    sirId: {
      type: String,
      default: 'SIR_OWNER',
    },
    // Client ka reference
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    // Last message for preview
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
    },
    lastMessageType: {
      type: String,
      enum: ['text', 'image', 'pdf', 'video', 'file'],
      default: 'text',
    },
    // Unread count for client
    unreadByClient: {
      type: Number,
      default: 0,
    },
    // Unread count for sir
    unreadBySir: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chat', chatSchema);
