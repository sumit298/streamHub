# StreamHub Backend Architecture

> A comprehensive technical reference for the StreamHub live streaming platform backend.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Entry Point: server.js](#3-entry-point-serverjs)
4. [Database Models](#4-database-models)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Mediasoup Architecture (WebRTC)](#6-mediasoup-architecture-webrtc)
7. [Streaming Workflow End-to-End](#7-streaming-workflow-end-to-end)
8. [Chat System](#8-chat-system)
9. [Services Deep Dive](#9-services-deep-dive)
10. [Routes & API Endpoints](#10-routes--api-endpoints)
11. [Socket.io Events Reference](#11-socketio-events-reference)
12. [Recording & VOD System](#12-recording--vod-system)
13. [Security & Validation](#13-security--validation)
14. [Logging & Monitoring](#14-logging--monitoring)
15. [Performance & Scaling](#15-performance--scaling)
16. [Configuration & Environment](#16-configuration--environment)
17. [Deployment](#17-deployment)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Project Overview

StreamHub is a real-time interactive live streaming platform built with:

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express |
| Database | MongoDB (Mongoose) |
| WebRTC | mediasoup v3 |
| Realtime | Socket.io |
| Cache | Redis |
| Message Queue | RabbitMQ |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Brevo (Sendinblue) SMTP |

**Core capabilities:** Live streaming, real-time chat, stream recording, VOD (Video-on-Demand), follower notifications, moderation.

---

## 2. Project Structure

```
backend/
├── server.js                        # Main entry point, HTTP server, Socket.io handlers
├── swagger.js                       # Swagger/OpenAPI doc config
├── src/
│   ├── controllers/
│   │   ├── notification.controller.js
│   │   └── vod.controller.js
│   ├── models/
│   │   ├── User.js                  # User schema with roles
│   │   ├── Stream.js                # Stream metadata & stats
│   │   ├── ChatMessage.js           # Chat with moderation fields
│   │   ├── Follow.js                # Follow relationships
│   │   ├── Notification.js          # Push notifications
│   │   ├── Vod.js                   # VOD metadata
│   │   └── index.js                 # Model exports
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── stream.routes.js
│   │   ├── chat.routes.js
│   │   ├── follow.routes.js
│   │   ├── notification.routes.js
│   │   └── vod.routes.js
│   ├── services/
│   │   ├── MediaService.js          # mediasoup workers, routers, transports
│   │   ├── StreamService.js         # Stream lifecycle management
│   │   ├── ChatService.js           # Chat message handling
│   │   ├── CacheService.js          # Redis integration
│   │   ├── MessageQueue.js          # RabbitMQ integration
│   │   ├── R2Service.js             # Cloudflare R2 object storage
│   │   ├── EmailService.js          # Password reset / email notifications
│   │   └── MetricsService.js        # Prometheus metrics (WIP)
│   ├── middleware/
│   │   ├── middleware.auth.js       # JWT authentication & socket auth
│   │   └── middleware.requestId.js  # Per-request tracking ID
│   ├── utils/
│   │   ├── logger.js                # Winston logger setup
│   │   ├── streamStats.js           # Viewer/chat stats async updates
│   │   ├── recordingState.js        # Recording lifecycle tracking
│   │   └── fixWebmDurationNode.js   # WebM duration metadata fix
│   └── workers/
│       └── vodWorker.js             # Background VOD processing (RabbitMQ consumer)
└── logs/
    ├── error.log
    └── combined.log
```

---

## 3. Entry Point: server.js

This is the nerve center of the application. It:

1. Creates an Express app with security middleware (helmet, CORS, rate limiting)
2. Wraps it in an HTTP or HTTPS server depending on environment
3. Attaches Socket.io to that server
4. Initializes all services (MediaService, StreamService, ChatService, etc.)
5. Registers all Socket.io event handlers
6. Handles graceful shutdown

### Server bootstrap order

```
server.js starts
  │
  ├─ connectToDatabase()           // mongoose.connect()
  ├─ MediaService.initialize()     // spawn mediasoup worker pool
  ├─ CacheService.initialize()     // connect to Redis
  ├─ MessageQueue.initialize()     // connect to RabbitMQ
  ├─ R2Service constructor         // S3 client ready
  │
  ├─ Express app
  │   ├─ helmet()                  // security headers
  │   ├─ cors()                    // configurable CORS_ORIGIN
  │   ├─ rateLimiter               // per-IP request limiting
  │   ├─ express.json()
  │   ├─ requestId middleware
  │   └─ routes mounted at /api/*
  │
  └─ Socket.io server attached
      └─ All socket event handlers registered
```

### Socket.io configuration

```javascript
const io = socketIo(server, {
  cors: { origin: process.env.CORS_ORIGIN, credentials: true },
  transports: ['polling', 'websocket'],   // polling fallback for firewalled envs
  pingTimeout: 60000,
  pingInterval: 25000
});
```

### Graceful shutdown

On `SIGTERM` / `SIGINT`:
- Emits `server-shutdown` to all connected clients so they can show a reconnect UI
- Closes all mediasoup workers/rooms
- Disconnects from MongoDB, Redis, RabbitMQ

---

## 4. Database Models

### 4.1 User

| Field | Type | Notes |
|-------|------|-------|
| username | String | Unique, 3–30 chars, alphanumeric + `_` `-` |
| email | String | Unique, validated |
| password | String | bcrypt hashed, min 8 chars, requires uppercase + numbers |
| avatar | String | URL; defaults to DiceBear API avatar |
| bio | String | Max 500 chars |
| role | Enum | `viewer` / `streamer` / `admin` |
| isActive | Boolean | Account active flag |
| isVerified | Boolean | Email verification flag |
| lastLogin | Date | |
| preferences | Object | `{ notifications, privacy, theme }` |
| stats | Object | `{ totalStreams, totalViews, totalStreamTime, followers, following }` |

**Key methods:**
- `comparePassword(candidate)` — async bcrypt compare
- `getPublicProfile()` — strips sensitive fields
- `getSafeProfile()` — includes email and preferences

**Indexes:** `username`, `email`, `createdAt`, `stats.totalViews`, `role`

---

### 4.2 Stream

| Field | Type | Notes |
|-------|------|-------|
| id | String | UUID, unique |
| userId | ObjectId | ref User |
| streamUserName | String | Username at stream creation time |
| title | String | |
| description | String | |
| category | Enum | gaming, music, art, tech, education, entertainment, sports, general |
| tags | [String] | Max 10 |
| isLive | Boolean | |
| isPending | Boolean | Created but not yet producing media |
| thumbnail | String | URL |
| chatEnabled | Boolean | |
| recordingEnabled | Boolean | |
| recordingUrl | String | R2 storage URL |
| startedAt / endedAt | Date | |
| duration | Number | Milliseconds |
| stats | Object | `{ viewers, maxViewers, totalViews, chatMessages, likes, shares }` |
| settings | Object | `{ quality, maxBitrate, framerate }` |

**Key methods:**
- `canUserView(userId)` — handles private stream access logic
- `getPublicInfo()` — non-sensitive fields for API responses

**Indexes:** Compound `(userId, createdAt)`, `(category, isLive, viewers)`, text search on title/description/tags

---

### 4.3 ChatMessage

| Field | Type | Notes |
|-------|------|-------|
| id | String | UUID |
| userId | ObjectId | ref User |
| streamId | String | indexed |
| content | String | Max 500 chars, HTML-sanitized |
| mentions | [ObjectId] | Users @mentioned |
| type | Enum | text, emoji, system, gif, sticker, command |
| reactions | Map | emoji → `[{ userId, timestamp }]` |
| edited / editHistory | Boolean / Array | Edit tracking |
| deleted / deletedBy / deletedReason | Fields | Soft delete |
| moderation | Object | `{ flagged, flaggedBy[], autoModerated, confidence, reasons[] }` |
| metadata | Object | ipHash, device, contentLength, responseToMessageId |

**TTL:** Auto-deleted after 30 days.

**Key methods:** `addReaction()`, `removeReaction()`, `flagMessage()`, `getSafeMessage()`

---

### 4.4 Follow

Tracks follower→following relationships (unique compound index).

---

### 4.5 Notification

| Field | Notes |
|-------|-------|
| userId | Who receives it |
| type | `stream-live`, `chat-mention`, `new-follower` |
| title / message | Display text |
| read | Boolean |
| data | Contextual payload (streamId, followerId, etc.) |

**TTL:** Auto-deleted after 30 days.

---

### 4.6 VOD

| Field | Notes |
|-------|-------|
| streamId | ref Stream |
| userId | ref User |
| title / description / category | Copied from stream |
| filename / fileSize / duration | |
| r2Key | Cloudflare R2 object path |
| status | `recording` → `processing` → `ready` / `failed` |
| views | View counter |

---

## 5. Authentication & Authorization

**File:** [src/middleware/middleware.auth.js](src/middleware/middleware.auth.js)

### JWT Details

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Secret | `JWT_SECRET` env var |
| Expiry | 2 hours |
| Refresh window | Up to 7 days old |

### How tokens flow

```
Client login POST /api/auth/login
  └─ Returns JWT in:
       ├─ HttpOnly cookie (preferred, secure in production)
       └─ JSON response body

Subsequent requests:
  ├─ Cookie auto-sent by browser (HTTP requests)
  └─ Socket.io: passed in socket.handshake.auth.token
```

### Middleware helpers

| Middleware | Usage |
|-----------|-------|
| `authenticate` | Verify JWT, load `req.user`, check `isActive` |
| `requiredRoles(roles)` | Role-based route guard |
| `requireAdmin` | Admin-only shortcut |
| `requireStreamer` | Streamer or admin shortcut |
| `socketAuth` | Socket-level auth (allows anonymous viewers) |

---

## 6. Mediasoup Architecture (WebRTC)

**File:** [src/services/MediaService.js](src/services/MediaService.js)

### What is mediasoup?

mediasoup is a **Selective Forwarding Unit (SFU)**. Instead of sending video peer-to-peer between browser and all viewers directly, the browser sends video once to the server (mediasoup), and the server forwards it to all viewers. This is far more scalable than mesh WebRTC.

```
Streamer Browser
    │
    │  WebRTC (one upload stream)
    ▼
mediasoup SFU (server)
    │
    ├──▶ Viewer 1 (WebRTC recv)
    ├──▶ Viewer 2 (WebRTC recv)
    └──▶ Viewer N (WebRTC recv)
```

### Core mediasoup concepts

| Concept | What it is |
|---------|-----------|
| **Worker** | OS process that does the real-time media work |
| **Router** | A "room" inside a worker — routes media between participants |
| **Transport** | The network connection between browser and server (WebRTC path) |
| **Producer** | A media track being sent (e.g., webcam video) |
| **Consumer** | A media track being received (viewer's copy of a producer) |

### Worker pool

```javascript
// Auto-scales to CPU count, capped at 8
const numWorkers = Math.min(os.cpus().length, 8);

// Per-worker port range for ICE/RTP
rtcMinPort: 40000,
rtcMaxPort: 49999   // 10k ports per worker
```

Each worker is assigned to rooms in a round-robin fashion. If a worker crashes, it is automatically re-spawned.

### Codec support

- **Audio:** Opus (48 kHz, stereo) — most compatible codec for real-time audio
- **Video:** VP8 (preferred, royalty-free) + H.264 (hardware-accelerated on most devices)

### Room structure (in memory)

```javascript
rooms.get(streamId) = {
  id: streamId,
  router,                  // mediasoup Router instance
  participants: Map,       // userId → { transports, producers, consumers }
  createdAt: Date,
  workerIndex: number
}
```

**Idle room cleanup:** Every 5 minutes, rooms with no participants are closed and deleted.

### Transport lifecycle

```
1. Client asks: "create-transport" { direction: "send" or "recv" }
2. Server calls: router.createWebRtcTransport({
     listenIps: [{ ip: "0.0.0.0", announcedIp: PUBLIC_IP }],
     enableUdp: true,
     enableTcp: true,               // TCP fallback for firewalls
     preferUdp: true,
     initialAvailableOutgoingBitrate: 1_000_000  // 1 Mbps
   })
3. Server sends back: { iceParameters, iceCandidates, dtlsParameters }
4. Client uses these to set up its local RTCPeerConnection
5. Client sends "connect-transport" with dtlsParameters (the handshake)
6. DTLS handshake completes → encrypted media tunnel established
```

### Produce / consume flow

```
STREAMER side:
  ├─ Creates send transport
  ├─ Calls transport.produce({ kind: "video", rtpParameters })
  │    rtpParameters = what the browser is sending (codec, SSRC, etc.)
  └─ Server gets a Producer object; broadcasts "new-producer" to room

VIEWER side:
  ├─ Creates recv transport
  ├─ Receives "existing-producers" list on join
  ├─ For each producer:
  │    client sends "consume" { producerId, rtpCapabilities }
  │    server calls router.consume({ producerId, rtpCapabilities, paused: true })
  │    server sends back Consumer credentials (id, kind, rtpParameters)
  ├─ Client sets up remote track using these credentials
  └─ Client sends "resume-consumer" → consumer.resume() + requestKeyFrame()
        (consumers start paused to avoid wasted bandwidth before client is ready)
```

### NAT traversal

```
listenIps: [{ ip: "0.0.0.0", announcedIp: ANNOUNCED_IP }]
```

`0.0.0.0` means listen on all interfaces. `announcedIp` is the public/LAN IP sent in ICE candidates so remote browsers can connect back. Without this, WebRTC connections fail behind NAT.

---

## 7. Streaming Workflow End-to-End

### Phase 1 — Stream creation

```
Streamer:  socket.emit("create-stream", { title, description, category, ... })
              │
              ▼
Server:    StreamService.createStream(userId, data)
              ├─ Generate UUID for streamId
              ├─ Create mediasoup room (MediaService.createRoom)
              ├─ Save Stream doc to MongoDB (isLive: false, isPending: true)
              └─ Return stream object
              │
              ▼
Server:    socket.emit("stream-created", stream)
```

### Phase 2 — Transport setup (streamer)

```
Streamer:  socket.emit("create-transport", { roomId, direction: "send" })
              │
              ▼
Server:    MediaService.createWebRtcTransport(roomId, userId, "send")
              └─ Returns { id, iceParameters, iceCandidates, dtlsParameters }

Streamer:  socket.emit("connect-transport", { transportId, dtlsParameters })
              └─ transport.connect(dtlsParameters)  // DTLS handshake
```

### Phase 3 — Producing media

```
Streamer:  socket.emit("produce", { transportId, kind, rtpParameters })
              │
              ▼
Server:    StreamService.produce()
              ├─ transport.produce({ kind, rtpParameters })
              ├─ Stream.updateOne({ isLive: true, isPending: false, startedAt: now })
              ├─ Notify followers (create Notification docs + emit "notification")
              └─ io.to(room).emit("new-producer", { producerId, userId, kind })
```

### Phase 4 — Viewers joining

```
Viewer:    socket.emit("join-stream", { streamId })
              │
              ▼
Server:    socket.join("room:streamId")
              ├─ Fetch existing producers from room
              ├─ socket.emit("existing-producers", [{ producerId, userId, kind }])
              └─ Broadcast viewer-count to room

Viewer:    socket.emit("create-transport", { direction: "recv" })
              │  (get recv transport credentials)

Viewer:    for each producer:
              socket.emit("consume", { producerId, rtpCapabilities })
              │
              ▼
Server:    router.canConsume() check
              └─ transport.consume({ producerId, paused: true })
              └─ socket.emit back consumer credentials

Viewer:    socket.emit("resume-consumer", { consumerId })
              └─ consumer.resume() + requestKeyFrame()
                 (stream starts playing)
```

### Phase 5 — Stream ending

```
Streamer:  socket.emit("stream-ended", { streamId })
              │
              ▼
Server:    Gather all finalized .webm recordings for stream
              ├─ Validate via ffprobe (size ≥ 1KB, valid WebM)
              ├─ Queue to RabbitMQ "vod.conversion" (dev)
              └─ Or upload directly to R2 (prod)
              │
              ▼
           StreamService.endStream(streamId, userId)
              ├─ Close all participant transports (MediaService.closeParticipant)
              ├─ Stream.updateOne({ isLive: false, endedAt: now, duration: ms })
              ├─ Update maxViewers, totalViews, chatMessages
              └─ Cache entry deleted after 30s
              │
              ▼
           io.to(room).emit("stream-ended")
```

### Viewer count tracking

```javascript
// Count unique users in the socket room
const sockets = await io.in(`room:${streamId}`).fetchSockets();
const uniqueUsers = new Set(sockets.map(s => s.userId)).size;
const viewerCount = uniqueUsers - 1; // exclude streamer

io.to(`room:${streamId}`).emit("viewer-count", viewerCount);
```

Updates are also written async to `Stream.stats.viewers` in MongoDB.

---

## 8. Chat System

**File:** [src/services/ChatService.js](src/services/ChatService.js)

### Message send flow

```
Client:    socket.emit("send-message", { roomId, content, type })
              │
Rate limit check (Redis):
  ├─ Max 3 messages per 3 seconds per user
  ├─ Check isUserTimedOut(userId)
  └─ Enforce slow mode delay if enabled
              │
              ▼
           ChatService.sendMessage(userId, streamId, content, type, username)
              ├─ Validate length (1–500 chars)
              ├─ Parse @mentions with regex
              ├─ Strip HTML (sanitize-html, no allowed tags)
              ├─ Save ChatMessage to MongoDB
              └─ Return message object
              │
              ▼
           io.to(room).emit("new-message", message)
              │
              ├─ For each @mention:
              │    ├─ Create Notification doc
              │    └─ io.to("user:userId").emit("notification", ...)
              └─ Stream.stats.chatMessages++
```

### Moderation features

| Feature | How it works |
|---------|-------------|
| Timeout | Redis key `timeout:${userId}` with TTL; all send-message events check this |
| Ban | 1-hour timeout (or custom) via same Redis key |
| Slow mode | Per-stream config in Redis; minimum seconds between messages per user |
| Message deletion | Soft delete — sets `deleted: true`, content hidden |
| Flagging | Stores `moderation.flaggedBy` array for manual review |
| Reactions | Stored in `reactions` Map on ChatMessage document |

### Moderation socket events

| Event | Who | Action |
|-------|-----|--------|
| `mod-action` | Streamer / mod | Timeout or ban a user |
| `slow-mode` | Streamer / mod | Set delay between messages |
| `unban-user` | Streamer / mod | Remove timeout |
| `announce` | Streamer / mod | Send a system message to room |
| `delete-message` | Streamer / message owner | Soft delete a message |

---

## 9. Services Deep Dive

### 9.1 MediaService

Manages the entire mediasoup layer. No other file should call mediasoup directly.

```
Key methods:
  initialize()                         Spawn worker pool
  createRoom(streamId)                 Create router in round-robin worker
  createWebRtcTransport(roomId, userId, direction)
  connectTransport(roomId, userId, transportId, dtlsParameters)
  produce(roomId, userId, transportId, rtpParameters, kind, isScreenShare)
  consume(roomId, userId, transportId, producerId, rtpCapabilities)
  closeProducer(roomId, userId, producerId)
  closeParticipant(roomId, userId)     Clean up all transports/producers/consumers
  getProducers(roomId)                 List active producers in room
  cleanup()                            Shutdown all workers
```

**Max consumers per router:** 400 (configurable)

---

### 9.2 StreamService

Owns stream lifecycle. Delegates media operations to MediaService and persistence to MongoDB.

```
Key methods:
  createStream(userId, data)           Create stream doc + room
  joinStream(userId, streamId)         Mark user as joined, return producers
  createTransport(...)                 Delegate to MediaService
  connectTransport(...)                Delegate to MediaService
  produce(...)                         Delegate + update DB + notify followers
  consume(...)                         Delegate to MediaService
  endStream(streamId, userId)          Mark stream ended + calculate duration
  handleUserDisconnect(userId)         Clean up all rooms user was in
  getActiveStreams(filters)            MongoDB query with category/search filters
  getStreamInfo(streamId)              Fetch stream + populate user
```

---

### 9.3 ChatService

```
Key methods:
  sendMessage(userId, streamId, content, type, username)
  getMessages(streamId, limit, before)  Paginated chat history
  deleteMessage(messageId, userId, isMod)
  addReaction(messageId, emoji, userId)
  removeReaction(messageId, emoji, userId)
  isUserTimedOut(userId)               Check Redis timeout key
  flagMessage(messageId, userId, reason)
```

---

### 9.4 CacheService (Redis)

Provides a thin wrapper around the Redis client with connection error handling and graceful degradation (operations are no-ops if Redis is unavailable).

```
Key methods:
  setUserSession(userId, data, ttl)
  getUserSession(userId)
  checkRateLimit(key, max, windowMs)   Sliding window counter
  setex(key, ttl, value)               Raw Redis SETEX
  del(key)                             Raw Redis DEL
  get(key) / set(key, value)
```

**Config:**
```javascript
{
  host: REDIS_HOST || 'localhost',
  port: 6379,
  password: REDIS_PASSWORD,
  connectTimeout: 10000,
  commandTimeout: 5000
}
```

---

### 9.5 MessageQueue (RabbitMQ)

Declares topic/fanout exchanges and durable queues for async processing.

| Exchange | Type | Purpose |
|----------|------|---------|
| `stream.events` | topic | Stream started/ended events |
| `chat.message` | fanout | Chat fan-out |
| `analytics.event` | direct | View/engagement analytics |
| `user.presence` | topic | Online/offline tracking |

| Queue | TTL | Purpose |
|-------|-----|---------|
| `stream.started` / `stream.ended` | 1 day | Stream lifecycle |
| `analytics.views` / `analytics.engagement` | — | Stats |
| `vod.conversion` | — | VOD processing jobs |

> **Note:** Most publishing is currently disabled in testing mode.

---

### 9.6 R2Service (Cloudflare R2)

S3-compatible object storage backed by Cloudflare R2.

```javascript
// Client setup
new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey }
});
```

```
Key methods:
  uploadBuffer(buffer, key, contentType)   Upload from memory
  uploadFile(filePath, key)                Upload from disk (auto-detects MIME)
  getSignedUrl(key, expiresIn)             Presigned URL for time-limited access
```

**Storage layout:**
```
vods/{streamId}/{filename}.webm    Raw recordings
vods/{streamId}/{filename}.mp4     Processed VODs
avatars/{userId}/{filename}        User avatars
```

---

### 9.7 EmailService

SMTP via Brevo (Sendinblue) for transactional email.

```javascript
{
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: { user: BREVO_LOGIN, pass: BREVO_KEY }
}
```

Used for: password reset emails.

---

## 10. Routes & API Endpoints

All routes are mounted under `/api/`. Swagger docs at `/api-docs`.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login, returns JWT cookie |
| POST | `/refresh-token` | — | Refresh JWT (up to 7 days old) |
| GET | `/me` | JWT | Get current user profile |
| PUT | `/me` | JWT | Update profile + upload avatar |
| GET | `/me/stats` | JWT | Streaming statistics |
| POST | `/logout` | JWT | Clear auth cookie |
| POST | `/forgot-password` | — | Send reset email |
| POST | `/reset-password` | — | Reset password with token |

---

### Streams (`/api/streams`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List active streams |
| GET | `/:id` | Optional | Get stream details |
| POST | `/` | JWT | Create stream |
| PUT | `/:id` | JWT | Update stream |
| DELETE | `/:id` | JWT | Delete stream (owner only) |

**Query params for `GET /`:** `category`, `search`, `sortBy` (viewers/created/title), `filter` (my/community), `limit`, `offset`

---

### Chat (`/api/chat`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:streamId` | JWT | Paginated chat history |
| POST | `/:streamId` | JWT | Send message |
| DELETE | `/:streamId/:messageId` | JWT | Delete message |
| POST | `/:streamId/:messageId/react` | JWT | Add/remove emoji |
| POST | `/:streamId/:messageId/flag` | JWT | Flag for moderation |
| POST | `/:streamId/:messageId/moderate` | Admin | Apply moderation action |
| GET | `/:streamId/stats` | JWT | Chat statistics |

---

### Follow (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/following/live` | JWT | Live streams from people I follow |
| GET | `/:userId` | Optional | Public user profile |
| POST | `/:userId/follow` | JWT | Follow user |
| DELETE | `/:userId/follow` | JWT | Unfollow user |

---

### Notifications (`/api/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | User notifications (paginated) |
| PUT | `/:id/read` | JWT | Mark as read |
| DELETE | `/:id` | JWT | Delete notification |

---

### VOD (`/api/vods`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | List VODs |
| GET | `/:id` | Optional | VOD details + R2 key |
| POST | `/:id/view` | Optional | Increment view count |
| POST | `/upload-chunk` | — | Upload recording chunk |
| POST | `/recording-end` | — | Finalize recording |

---

## 11. Socket.io Events Reference

### Stream lifecycle

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `create-stream` | Client → Server | `{ title, description, category, tags }` | Create new stream |
| `stream-created` | Server → Client | Stream object | Confirm creation |
| `join-stream` | Client → Server | `{ streamId }` | Join as viewer |
| `stream-joined` | Server → Client | `{ success: true }` | Confirmed |
| `stream-ended` | Client → Server | `{ streamId }` | End stream |
| `viewer-count` | Server → Room | `count` | Broadcast viewer count |
| `viewer-joined` | Server → Room | `{ userId, viewers }` | New viewer |
| `viewer-left` | Server → Room | `{ userId }` | Viewer exited |

---

### WebRTC signaling

| Event | Direction | Description |
|-------|-----------|-------------|
| `get-router-capabilities` | C → S | Request codec/RTP capabilities |
| `create-transport` | C → S | Request send or recv transport |
| `connect-transport` | C → S | Send DTLS fingerprint (handshake) |
| `produce` | C → S | Start publishing a media track |
| `new-producer` | S → Room | Announce new producer to viewers |
| `get-producers` | C → S | Request list of current producers |
| `close-producer` | C → S | Stop a media track |
| `producer-closed` | S → Room | Notify producer closed |
| `consume` | C → S | Subscribe to a producer |
| `resume-consumer` | C → S | Resume paused consumer |
| `existing-producers` | S → Client | Producers already in room on join |
| `stream-start-time` | S → Client | Stream start timestamp for elapsed timer |

---

### Chat

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join-chat` | C → S | `{ streamId }` | Join chat room |
| `send-message` | C → S | `{ roomId, content, type }` | Send message |
| `new-message` | S → Room | Message object | Broadcast message |
| `delete-message` | C → S | `{ streamId, messageId }` | Delete message |
| `message-deleted` | S → Room | `{ messageId }` | Notify deletion |

---

### Moderation

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `mod-action` | C → S | `{ streamId, action, target, duration }` | Timeout/ban |
| `slow-mode` | C → S | `{ streamId, seconds }` | Enable slow mode |
| `unban-user` | C → S | `{ streamId, target }` | Lift timeout |
| `announce` | C → S | `{ streamId, message }` | System announcement |

---

### Recording

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `recording-chunk` | C → S | `{ streamId, recordingId, chunk }` | Binary WebM chunk |
| `recording-end` | C → S | `{ streamId, recordingId, durationMs }` | Finalize recording |

---

### Notifications

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `notification` | S → Client | `{ type, title, message, data }` | Push notification |

Users subscribe to their own notification channel via joining room `user:${userId}` on connect.

---

## 12. Recording & VOD System

### Client-side recording

The browser uses the `MediaRecorder` API to capture the local stream and emits chunks over the socket:

```
Browser:
  MediaRecorder records audio + video
  Every ~1–10 KB: socket.emit("recording-chunk", { streamId, recordingId, chunk })
  When done:       socket.emit("recording-end", { streamId, recordingId, durationMs })
```

### Server-side chunk handling

```
recording-chunk received:
  ├─ Validate recordingId format (UUID-timestamp regex)
  ├─ Resolve path: /tmp/recordings/{recordingId}.webm
  ├─ Verify path is inside RECORDINGS_ROOT (path traversal protection)
  ├─ Open/reuse WriteStream for that file
  └─ Write chunk buffer

recording-end received:
  ├─ Close the WriteStream
  ├─ Run fixWebmDurationNode (patches WebM duration metadata)
  └─ Add to finalizedRecordings Set
```

### WebM duration fix

When `MediaRecorder` produces a `.webm` file, the duration metadata is missing (unknown at record time). `fixWebmDurationNode` parses and rewrites the EBML header to inject the correct duration. This makes the file seekable in video players.

### VOD processing pipeline

```
socket.emit("stream-ended")
    │
    ├─ Gather all .webm files matching stream
    ├─ ffprobe validate each file
    └─ For each valid file:

        PATH A — Development (RabbitMQ available):
          └─ Publish to "vod.conversion" queue
               └─ vodWorker.js picks up:
                    ├─ ffmpeg: WebM → MP4 (libx264 + aac)
                    ├─ Create Vod doc in MongoDB
                    ├─ Upload .mp4 to R2
                    └─ status: "ready"

        PATH B — Production (direct):
          ├─ Upload .webm directly to R2
          ├─ Create Vod doc in MongoDB
          └─ status: "ready"
```

### VOD Worker (`workers/vodWorker.js`)

A separate Node.js process (run with `npm run worker`) that:
1. Connects to RabbitMQ
2. Listens on `vod.conversion` queue
3. For each job: converts WebM → MP4 with ffmpeg, uploads to R2, updates Vod doc
4. Acks message on success, nacks (requeues) on failure

---

## 13. Security & Validation

### Input validation

- **express-validator** on all REST routes
- **sanitize-html** strips all HTML tags from chat messages
- **Bcrypt** (12 rounds) for password hashing

### Rate limiting

| Endpoint / Operation | Limit |
|---------------------|-------|
| Auth routes | 10 req / 15 min per IP |
| Stream creation | 5 / hour |
| Chat send | 30 / min per user, burst: 3 / 3 sec |
| General API | 10,000 / 15 min |

### File security

```javascript
// RecordingId must match UUID-timestamp format
/^[a-f0-9]{8}-[a-f0-9]{4}-...-\d+$/i

// Path traversal protection
const resolved = path.resolve(RECORDINGS_ROOT, filename);
if (!resolved.startsWith(RECORDINGS_ROOT)) throw new Error("Invalid path");

// No shell execution — uses execFile() not exec()
execFile('ffprobe', [...args], callback);
```

### Authentication security

- Tokens stored in **HttpOnly cookies** (inaccessible to JavaScript)
- `Secure` flag set in production
- `SameSite` cookie attribute set
- JWT expiry: 2 hours; refresh window: 7 days

---

## 14. Logging & Monitoring

**File:** [src/utils/logger.js](src/utils/logger.js)

Winston logger with:

```javascript
transports: [
  Console,
  File({ filename: 'logs/error.log', level: 'error' }),
  File({ filename: 'logs/combined.log' })
]
```

All logs include `requestId` (injected by `middleware.requestId.js`) for request tracing.

**MetricsService** is initialized but not yet fully implemented (Prometheus endpoint planned).

---

## 15. Performance & Scaling

### Concurrency model

- **Worker pool:** mediasoup uses one process per CPU core (max 8) — media processing never blocks the Node.js event loop
- **Non-blocking I/O:** async/await throughout, no synchronous disk or DB calls on hot paths
- **Background tasks:** viewer stat updates and notification delivery are fire-and-forget async

### Caching strategy

| Data | Cache | TTL |
|------|-------|-----|
| User sessions | Redis | Configurable |
| Rate limit counters | Redis | Per-window |
| User timeouts/bans | Redis | Timeout duration |
| Stream metadata | Redis | While live + 30s |

### MongoDB optimizations

- Compound indexes for all common query patterns
- `.lean()` on read-only queries (returns plain objects, skips Mongoose overhead)
- Connection pooling: `maxPoolSize: 10`

### Resource limits

- Max 400 consumers per mediasoup router
- Idle rooms cleaned up every 5 minutes
- Chat messages TTL: 30 days
- Notifications TTL: 30 days

### Horizontal scaling readiness

- Socket.io is configured to support a Redis adapter for multi-server deployments
- Mediasoup workers are stateless per-worker (rooms can be distributed)
- RabbitMQ decouples VOD processing from the live server

---

## 16. Configuration & Environment

```bash
# Server
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/streamHub

# Auth
JWT_SECRET=your-secret-here

# WebRTC (CRITICAL — must match your LAN/public IP)
ANNOUNCED_IP=192.168.x.x

# Client
CORS_ORIGIN=http://localhost:3000
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Redis (optional — graceful degradation if unavailable)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ (optional)
RABBITMQ_URL=amqp://localhost:5672

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=https://pub.example.com   # optional CDN URL

# Email (Brevo SMTP)
MAIL_FROM=noreply@streamhub.com
BREVO_SMTP_LOGIN=
BREVO_SMTP_KEY=
```

---

## 17. Deployment

### Scripts

```bash
npm start            # Production server
npm run dev          # Dev with --watch flag
npm run worker       # VOD worker process (separate)
npm run seed         # Seed test data
```

### Docker

A `Dockerfile` and `docker-compose.yml` are provided, bringing up:
- Node.js backend
- MongoDB
- Redis
- RabbitMQ

### HTTPS

```javascript
// Automatically switches to HTTPS in production if certs are present
if (NODE_ENV === 'production' && fs.existsSync('./fullchain.pem')) {
  server = https.createServer({ key, cert }, app);
}
```

---

## 18. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| WebRTC never connects | `ANNOUNCED_IP` wrong or not set | Set to LAN/public IP |
| No audio/video for viewers | Firewall blocks UDP 40000–49999 | Open port range or enable TCP fallback |
| Recording file 0 bytes | /tmp/recordings not writable | Check filesystem permissions |
| R2 upload fails | Wrong credentials | Verify all `R2_*` env vars |
| Chat rate limit too strict | Redis unavailable | Start Redis or loosen in-memory limits |
| `consumer-closed` spam | Transport closed before consumer resumed | Ensure resume-consumer called before close |
| Idle rooms not cleaned | Timer not firing | Check `setInterval` in MediaService.initialize() |

---

*Generated: 2026-03-28 | StreamHub Backend v1.0.0*
