const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    // 'sir' or client ObjectId (string)
    senderId: {
      type: String,
      required: true,
    },
    senderType: {
      type: String,
      enum: ['sir', 'client'],
      required: true,
    },
    // Message content
    message: {
      type: String,
      default: '',
    },
    // File info (PDF, image, video)
    fileUrl: {
      type: String,
      default: '',
    },
    fileName: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      enum: ['text', 'image', 'pdf', 'video', 'file'],
      default: 'text',
    },
    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for fast query
messageSchema.index({ chatId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
