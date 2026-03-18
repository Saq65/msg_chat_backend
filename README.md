# MSG Chat Backend 🚀

Secure chat app — Sir (Owner) aur Clients ke beech messaging, file sharing (PDF, Image, Video).

## Setup

```bash
npm install
# .env mein MONGO_URI aur JWT_SECRET set karo
npm run dev
```

## Folder Structure

```
msg_chat_backend/
├── config/
│   └── db.js               # MongoDB connection
├── controller/
│   ├── authController.js   # Register/Login
│   ├── clientController.js # Client management
│   └── messageController.js # Messages + file upload
├── middleware/
│   └── authMiddleware.js   # JWT verify
├── models/
│   ├── Sir.js              # Owner model
│   ├── Client.js           # Client model
│   ├── Chat.js             # Chat room
│   └── Message.js          # Messages
├── routes/
│   ├── authRoutes.js
│   ├── clientRoutes.js
│   └── messageRoutes.js
├── sockets/
│   └── index.js            # Real-time Socket.io
├── uploads/                # Files yahan save honge
├── .env
└── server.js
```

---

## REST API Endpoints

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/sir/register | Sir ka first-time registration |
| POST | /api/auth/sir/login | Sir login |
| POST | /api/auth/client/register | Client register |
| POST | /api/auth/client/login | Client login |
| GET  | /api/auth/me | Apna profile dekho |

### Clients (Sir only)
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/clients | Sab clients list |
| GET | /api/clients/:id | Ek client |
| PATCH | /api/clients/:id/status | Block/Unblock |
| DELETE | /api/clients/:id | Client delete |

### Messages
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/messages/chats | Sir: sab chat rooms |
| GET | /api/messages/:clientId | Chat history |
| POST | /api/messages/send | Text message bhejo |
| POST | /api/messages/upload | File upload (PDF/Image/Video) |
| DELETE | /api/messages/:messageId | Message delete |

---

## Socket.io Events

### Frontend se Server ko emit karo:
| Event | Data | Description |
|-------|------|-------------|
| `sendMessage` | `{ clientId, message, fileUrl, fileName, fileType, fileSize }` | Message ya file bhejo |
| `typing` | `{ clientId, isTyping }` | Typing indicator |
| `markRead` | `{ chatId, clientId }` | Messages read karo |

### Server se Frontend ko aata hai:
| Event | Description |
|-------|-------------|
| `newMessage` | Naya message aaya |
| `messageSent` | Apna message confirm hua |
| `messageError` | Message send mein error |
| `chatUpdated` | Chat list update (unread count) |
| `typing` | Samne wala type kar raha hai |
| `messagesRead` | Messages read ho gaye (blue tick) |
| `clientOnline` | Client online/offline |
| `sirOnline` | Sir online/offline |
| `onlineUsers` | Online users list |

---

## File Upload

- Max size: **50MB**
- Allowed types: JPG, PNG, GIF, WEBP, **PDF**, MP4, MOV, AVI, MKV
- Files `/uploads/` folder mein save honge
- URL: `http://your-server:5001/uploads/filename.pdf`

### Flow:
1. `POST /api/messages/upload` se file upload karo
2. Response mein `fileUrl` milega
3. `socket.emit('sendMessage', { clientId, fileUrl, fileType, fileName })` se bhejo

---

## Socket Connection (React Native)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://YOUR_IP:5001', {
  auth: {
    token: 'your_jwt_token_here'
  },
  transports: ['websocket']
});

socket.on('connect', () => console.log('Connected!'));
socket.on('newMessage', (msg) => console.log('New message:', msg));
```
