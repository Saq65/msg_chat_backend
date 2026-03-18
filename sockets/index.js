const { verifySocketToken } = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Client = require('../models/Client');
const Sir = require('../models/Sir');

// Track online users: { userId: socketId }
const onlineUsers = new Map();

const getOrCreateChat = async (clientId) => {
  let chat = await Chat.findOne({ clientId });
  if (!chat) chat = await Chat.create({ clientId });
  return chat;
};

module.exports = (io) => {
  // ─── Middleware: Har connection pe token verify karo ─────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = verifySocketToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  });

  // ─── Connection ──────────────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const { userId, userRole } = socket;
    console.log(`🔗 Connected: ${userRole} | ${userId} | socket: ${socket.id}`);

    // User ko track karo
    onlineUsers.set(userId, socket.id);

    // ── User apne room mein join kare (own userId = room name) ────────────────
    socket.join(userId);

    // ── Sir ke liye special room ───────────────────────────────────────────────
    if (userRole === 'owner') {
      socket.join('sir_room');
      await Sir.findByIdAndUpdate(userId, { socketId: socket.id, isOnline: true });
      // Saare clients ko batao sir online hai
      io.emit('sirOnline', { isOnline: true });
    } else {
      // Client ka socketId save karo
      await Client.findByIdAndUpdate(userId, {
        socketId: socket.id,
        lastSeen: new Date(),
      });
      // Sir ko batao client online hai
      io.to('sir_room').emit('clientOnline', { clientId: userId, isOnline: true });
    }

    // ── Online users list bhejo ────────────────────────────────────────────────
    socket.emit('onlineUsers', Array.from(onlineUsers.keys()));

    // ═══════════════════════════════════════════════════════════════════════════
    // SEND MESSAGE (Text ya File URL)
    // Frontend se: socket.emit('sendMessage', { clientId, message, fileUrl, fileName, fileType, fileSize })
    // ═══════════════════════════════════════════════════════════════════════════
    socket.on('sendMessage', async (data) => {
      try {
        const { clientId, message, fileUrl, fileName, fileType, fileSize } = data;

        if (!clientId) return;
        if (!isSir && socket.userId !== clientId) {
          return socket.emit('messageError', { message: 'Unauthorized' });
        }

        const isSir = userRole === 'owner';
        const chat = await getOrCreateChat(clientId);

        // Message DB mein save karo
        const newMsg = await Message.create({
          chatId: chat._id,
          senderId: isSir ? userId : userId,
          senderType: isSir ? 'sir' : 'client',
          message: message || '',
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          fileType: fileType || 'text',
        });

        // Chat ka last message update karo
        const preview = fileUrl ? `📎 ${fileName || 'File'}` : message;
        chat.lastMessage = preview;
        chat.lastMessageTime = new Date();
        chat.lastMessageType = fileType || 'text';

        if (isSir) {
          chat.unreadByClient += 1;
        } else {
          chat.unreadBySir += 1;
        }
        await chat.save();

        // Message response object
        const msgPayload = {
          _id: newMsg._id,
          chatId: chat._id,
          senderId: userId,
          senderType: isSir ? 'sir' : 'client',
          message: message || '',
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          fileType: fileType || 'text',
          isRead: false,
          createdAt: newMsg.createdAt,
        };

        // ── Sir ne message bheja → Client ko deliver karo ─────────────────────
        if (isSir) {
          // Client ke room mein bhejo
          io.to(clientId).emit('newMessage', msgPayload);
          // Sir ko bhi confirm karo (apne screen pe bhi dikhega)
          socket.emit('messageSent', msgPayload);

          // Sir ke dashboard mein unread badge update
          socket.emit('chatUpdated', {
            clientId,
            lastMessage: preview,
            lastMessageTime: chat.lastMessageTime,
            unreadBySir: chat.unreadBySir,
          });
        }

        // ── Client ne message bheja → Sir ko deliver karo ─────────────────────
        else {
          // Sir ke room mein bhejo
          io.to('sir_room').emit('newMessage', msgPayload);
          // Client ko confirm karo
          socket.emit('messageSent', msgPayload);

          // Sir ke dashboard mein unread badge
          io.to('sir_room').emit('chatUpdated', {
            clientId: userId,
            lastMessage: preview,
            lastMessageTime: chat.lastMessageTime,
            unreadBySir: chat.unreadBySir,
          });
        }

      } catch (error) {
        console.error('sendMessage error:', error.message);
        socket.emit('messageError', { message: 'Message send nahi hua.' });
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // TYPING INDICATOR
    // ═══════════════════════════════════════════════════════════════════════════
    socket.on('typing', (data) => {
      const { clientId, isTyping } = data;
      if (userRole === 'owner') {
        io.to(clientId).emit('typing', { isTyping, senderType: 'sir' });
      } else {
        io.to('sir_room').emit('typing', {
          isTyping,
          clientId: userId,
          senderType: 'client',
        });
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // MESSAGE READ (blue ticks)
    // ═══════════════════════════════════════════════════════════════════════════
    socket.on('markRead', async (data) => {
      try {
        const { chatId, clientId } = data;
        const isClient = userRole === 'client';

        await Message.updateMany(
          {
            chatId,
            isRead: false,
            senderType: isClient ? 'sir' : 'client',
          },
          { isRead: true, readAt: new Date() }
        );

        // Reset unread count
        const chat = await Chat.findById(chatId);
        if (chat) {
          if (isClient) chat.unreadByClient = 0;
          else chat.unreadBySir = 0;
          await chat.save();
        }

        // Sender ko batao messages read ho gaye
        if (isClient) {
          io.to('sir_room').emit('messagesRead', { chatId, clientId: userId });
        } else {
          io.to(clientId).emit('messagesRead', { chatId });
        }
      } catch (error) {
        console.error('markRead error:', error.message);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // DISCONNECT
    // ═══════════════════════════════════════════════════════════════════════════
    socket.on('disconnect', async () => {
      console.log(`❌ Disconnected: ${userRole} | ${userId}`);
      onlineUsers.delete(userId);

      if (userRole === 'owner') {
        await Sir.findByIdAndUpdate(userId, { isOnline: false });
        io.emit('sirOnline', { isOnline: false });
      } else {
        await Client.findByIdAndUpdate(userId, { lastSeen: new Date() });
        io.to('sir_room').emit('clientOnline', {
          clientId: userId,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    });
  });
};
