# StreamHub - Live Streaming Platform

A scalable real-time live streaming platform with VOD recording built with Node.js, WebRTC (MediaSoup), Socket.IO, MongoDB, and Cloudflare R2.

## 🚀 Features

### Live Streaming
- **WebRTC Streaming** - Real-time video streaming via MediaSoup
- **Screen Sharing** - Share desktop/application screens with system audio
- **Manual Recording Control** - Toggle recording on/off during streams
- **Multi-Device Support** - Camera and microphone selection
- **Mobile Responsive** - Optimized for desktop and mobile browsers
- **Real-time Chat** - Socket.IO-based live chat during streams
- **Viewer Analytics** - Live viewer count and stream duration tracking
- **Browse Streams** - Discover live streams with category filters
- **Following System** - Follow streamers and get notifications

### VOD (Video on Demand)
- **Client-Side Recording** - MediaRecorder API with optimized 480p quality
- **Cloudflare R2 Storage** - Cost-effective object storage for recordings
- **Automatic Conversion** - WebM to MP4 with FFmpeg for seeking support
- **VOD Library** - Browse recorded streams with pagination
- **Custom Video Player** - Full-featured player with controls
- **Thumbnail Support** - Stream thumbnails in VOD listings
- **View Tracking** - Track views for each recording

### User Management
- **JWT Authentication** - Secure token-based auth with httpOnly cookies
- **User Profiles** - Profile pages with streaming statistics
- **Stream Management** - Create, update, delete streams
- **Dashboard** - Streamer dashboard with analytics
- **Notifications** - Real-time notifications for followers
- **Avatar System** - User avatars with fallback generation

### Performance Optimizations
- **Optimized Recording** - 1 Mbps bitrate, 90s chunks to reduce CPU load
- **Redis Caching** - Performance optimization for frequently accessed data
- **RabbitMQ Queue** - Event processing and analytics (optional)
- **Auto IP Detection** - Automatic ANNOUNCED_IP detection for development

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB
- **Cache**: Redis (optional)
- **Message Queue**: RabbitMQ (optional)
- **WebRTC**: MediaSoup
- **Real-time**: Socket.IO
- **Storage**: Cloudflare R2 (S3-compatible)
- **Video Processing**: FFmpeg

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **WebRTC Client**: mediasoup-client
- **Real-time**: Socket.IO Client
- **Notifications**: react-hot-toast

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB
- FFmpeg
- Cloudflare R2 account (or S3-compatible storage)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start MongoDB (if not running)
mongod

# Start server
npm start
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Start development server
npm run dev
```

## 🔧 Environment Variables

### Backend `.env`

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/streamhub
JWT_SECRET=your-secret-key-here
NODE_ENV=development

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Optional: Redis & RabbitMQ
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672

# MediaSoup (auto-detected in development)
ANNOUNCED_IP=your-server-ip
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile
- `GET /api/auth/me/stats` - Get user statistics
- `POST /api/auth/logout` - User logout

### Streams (`/api/streams`)
- `GET /api/streams` - Get all streams (with filters)
- `POST /api/streams` - Create new stream
- `GET /api/streams/:id` - Get specific stream
- `PATCH /api/streams/:id` - Update stream
- `DELETE /api/streams/:id` - Delete stream
- `POST /api/streams/:id/end` - End stream

### VODs (`/api/vods`)
- `GET /api/vods` - Get all VODs (with pagination)
- `GET /api/vods/:id` - Get specific VOD with playback URL
- `POST /api/vods/:id/view` - Increment view count
- `POST /api/vods/upload-chunk` - Upload recording chunk

### Chat (`/api/chat`)
- `GET /api/chat/:streamId` - Get chat messages
- `POST /api/chat/:streamId` - Send chat message
- `DELETE /api/chat/:streamId/:messageId` - Delete message

## 🔌 Socket.IO Events

### Client → Server
- `join-stream` - Join a stream room
- `get-router-capabilities` - Get MediaSoup router capabilities
- `create-transport` - Create WebRTC transport
- `connect-transport` - Connect WebRTC transport
- `produce` - Start producing media (video/audio/screen)
- `consume` - Start consuming media
- `close-producer` - Close a producer (stop screen share)
- `stream-ended` - Notify stream has ended

### Server → Client
- `new-message` - New chat message received
- `viewer-count` - Updated viewer count
- `stream-start-time` - Stream start timestamp
- `new-producer` - New producer available to consume

## 🏗️ Project Structure

```
streamhub/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB schemas (User, Stream, Vod, Chat)
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Route controllers
│   │   ├── services/        # Business logic (R2Service)
│   │   └── middleware/      # Auth & validation
│   ├── server.js            # Entry point with MediaSoup & Socket.IO
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── browse/          # Browse live streams
│   │   ├── dashboard/       # Dashboard page
│   │   ├── following/       # Following page
│   │   ├── stream/[id]/     # Stream studio page
│   │   ├── watch/[id]/      # Watch stream page
│   │   ├── vods/            # VOD listing & player
│   │   ├── profile/         # User profile
│   │   ├── login/           # Login page
│   │   └── register/        # Register page
│   ├── components/          # React components
│   │   ├── ui/              # UI components
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   ├── ChatPanel.tsx    # Live chat component
│   │   ├── BottomControlBar.tsx  # Stream controls
│   │   └── ViewerStats.tsx  # Viewer statistics
│   ├── lib/                 # Utilities & context
│   │   ├── AuthContext.tsx  # Authentication context
│   │   ├── NotificationContext.tsx  # Notifications
│   │   └── avatar.ts        # Avatar utilities
│   └── package.json
│
└── README.md
```

## 🎥 Recording Architecture

### Client-Side Recording
- **MediaRecorder API** - Browser-native recording
- **Quality**: 480p @ 1 Mbps (optimized for CPU)
- **Chunk Interval**: 90 seconds
- **Format**: WebM (VP8 + Opus)
- **Upload**: HTTP POST with FormData

### Server-Side Processing
- **Storage**: Chunks appended to `/tmp/recordings/{streamId}.webm`
- **Conversion**: FFmpeg converts WebM → MP4 with `-movflags +faststart`
- **Upload**: Final MP4 uploaded to Cloudflare R2
- **Cleanup**: Temporary files deleted after upload

### Recording Features
- **Manual Control**: Streamer toggles recording on/off
- **Screen Share Support**: Automatically switches between camera and screen
- **Dynamic Switching**: Seamlessly switches streams when screen sharing starts/stops

## 🚀 Deployment

### Backend Deployment
1. Set `NODE_ENV=production`
2. Configure `ANNOUNCED_IP` to your server's public IP
3. Ensure FFmpeg is installed
4. Set up Cloudflare R2 bucket with public access
5. Use PM2 or similar for process management

### Frontend Deployment
1. Build: `npm run build`
2. Deploy to Vercel, Netlify, or similar
3. Update environment variables for production URLs

## 📊 Performance Tips

- **Recording**: 480p @ 1 Mbps reduces CPU by 60-70%
- **Chunk Interval**: 90s reduces upload frequency and lag
- **R2 Storage**: More cost-effective than S3
- **Redis**: Enable for caching frequently accessed data
- **RabbitMQ**: Enable for async processing at scale

## 🔒 Security

- JWT tokens stored in httpOnly cookies
- CORS configured for specific origins
- Input validation on all endpoints
- Rate limiting recommended for production
- Secure WebRTC with DTLS

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Support

For issues and questions, please open a GitHub issue.
test
