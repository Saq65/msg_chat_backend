const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sir ek hi hoga - single owner account
const sirSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Sir',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      default: 'owner',
    },
    socketId: {
      type: String,
      default: '',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

sirSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

sirSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Sir', sirSchema);
