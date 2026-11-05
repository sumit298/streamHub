# StreamHub

A live-streaming platform. Streamers broadcast camera, mic and screen from the browser; viewers watch with low latency over WebRTC; everyone chats live; streams can be recorded into VODs. It also has two AI features: an AI streamer that talks to chat, and AI-generated two-host podcasts.

Built with Next.js, Node/Express, mediasoup (WebRTC SFU), Socket.IO, MongoDB, Redis and Cloudflare R2.

> **Status:** active development.

## Features

**Live streaming**
- Camera, microphone and screen sharing (with system audio) over WebRTC via mediasoup
- Live viewer count and stream timer
- Browse live streams by category, follow streamers, see who's live

**Chat**
- Real-time chat with emoji, GIFs (GIPHY) and @mentions
- Streamer moderation: timeout, ban, slow mode, announcements

**Recording and VODs**
- Record a stream from the browser (MediaRecorder, about 2 Mbps, 30-second chunks)
- Recordings stored in Cloudflare R2, browsable at `/vods` with a custom player and view counts

**Accounts and notifications**
- Register, login, password reset by email
- Profiles with avatars and stats, streamer dashboard
- Real-time notifications for go-live, mentions and new followers

**AI**
- **AI streamer:** a persona that hosts a live audio stream and replies to chat (Gemini + Google Text-to-Speech, streamed into mediasoup with ffmpeg)
- **AI podcast:** generate a two-host audio episode on any topic

## Tech stack

| | |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query, mediasoup-client, socket.io-client |
| Backend | Node.js 22, Express 5, TypeScript, mediasoup 3, Socket.IO 4, Mongoose (MongoDB), ioredis (Redis) |
| Storage | Cloudflare R2 (S3 API) for avatars, VODs and podcast audio |
| Queue | RabbitMQ (optional), VOD conversion worker with ffmpeg |
| AI | Gemini (`@google/genai`), Google Cloud Text-to-Speech |
| Monitoring | Prometheus metrics at `/metrics`, Grafana dashboards (`backend/prometheus`, `backend/grafana`) |

## Getting started

**Prerequisites:** Node.js 22, Yarn 1 (the repo uses `yarn.lock`, not npm), MongoDB, Redis, and `ffmpeg` on your PATH. RabbitMQ, R2 and the AI keys are optional for basic streaming, except `GEMINI_API_KEY`, which the backend currently needs to start.

```bash
# Backend (http://localhost:3001)
cd backend
yarn install --frozen-lockfile
cp .env.example .env.local      # fill in the values; every variable is documented in the file
yarn dev

# Frontend (http://localhost:3000), in another terminal
cd frontend
yarn install --frozen-lockfile
cp .env.example .env.local
yarn dev
```

Need MongoDB, Redis and RabbitMQ locally? `cd backend && yarn docker:up` starts them with Docker (Mongo on port 27018).

### Environment variables

Each app has an `.env.example` listing every variable the code reads, with comments and placeholder values:

- [backend/.env.example](backend/.env.example): database, JWT, Redis, mediasoup, R2, email, AI
- [frontend/.env.example](frontend/.env.example): backend URL and GIPHY key

Real values go in `.env.local` (development) and on the server (production). All other `.env*` files are gitignored. When code adds a new `process.env.X`, add it to the matching `.env.example` in the same change.

### Scripts

| Where | Command | Does |
|---|---|---|
| backend | `yarn dev` | Dev server with reload (loads `.env.local`) |
| backend | `yarn build` / `yarn start` | Compile to `dist/` / run it (loads `.env`) |
| backend | `yarn worker` | VOD conversion worker (needs RabbitMQ) |
| backend | `yarn docker:up` / `docker:down` | Local MongoDB, Redis, RabbitMQ, Prometheus, Grafana |
| frontend | `yarn dev` / `yarn build` / `yarn start` | Next.js dev / production build / serve |
| frontend | `yarn lint` | ESLint |

## Project structure

```
streamHub/
├── backend/
│   ├── server.ts              # entry: HTTP server, Socket.IO, MongoDB, services, routes
│   └── src/
│       ├── config/            # app, db, mediasoup, server settings
│       ├── routes/            # REST routes (auth, streams, chat, users, notifications, vods, ai-*)
│       ├── controllers/       # request handlers
│       ├── services/          # MediaService (mediasoup), StreamService, ChatService, CacheService,
│       │                      # R2Service, EmailService, LLMService, TTSService, AI/
│       ├── socket/            # Socket.IO server and handlers (webrtc, stream, chat, recording)
│       ├── models/            # Mongoose models
│       ├── middleware/        # auth, metrics, request id
│       └── workers/           # vodWorker (RabbitMQ → ffmpeg → R2)
├── frontend/
│   ├── app/                   # pages: browse, watch/[id], stream/[id] (studio), dashboard,
│   │                          # following, profile, vods, ai-streamer, ai-podcast, auth pages
│   ├── components/            # ChatPanel, NotificationBell, controls, dialogs, ui/
│   └── lib/                   # AuthContext (tokens + API client), NotificationContext, utils
├── docs/                      # notifications design, bug audit
└── docker-compose.yml         # full stack in Docker
```

## How it works (short version)

- **Streaming:** the browser connects to mediasoup over WebRTC. The streamer *produces* video and audio tracks; mediasoup forwards them to every viewer, who *consumes* them. Socket.IO carries the signaling (`get-router-capabilities`, `create-transport`, `produce`, `consume`, …) and chat.
- **Auth:** JWT access token (15 min) plus refresh token (7 days), stored in `sessionStorage` and sent as `Authorization: Bearer`. Sockets authenticate with the access token.
- **Recording:** the streamer's browser records with MediaRecorder and uploads 30-second chunks to `/api/vods/upload-chunk`. When the stream ends the server finalizes the file and uploads it to R2 (in development it can go through RabbitMQ and ffmpeg to MP4 first).
- **Notifications:** stored in MongoDB and pushed live to the `user:<id>` socket room. Details in [docs/notifications.md](docs/notifications.md).
- **Single instance:** mediasoup rooms, in-progress recordings and AI streamers live in the backend's memory, so run one backend process.

## Deployment

The backend runs on a self-managed server (Oracle Cloud VM) with PM2:

```bash
cd backend
git pull
yarn install --frozen-lockfile
rm -rf dist && yarn build
pm2 restart all
```

Production checklist:

- `backend/.env` on the server with `NODE_ENV=production` and real values for every `[required]` variable in `.env.example`
- `ANNOUNCED_IP` set to the server's **public IP**; otherwise viewers connect but get no video
- UDP **and** TCP ports `40000–49999` open in the cloud firewall (Oracle security list) and on the VM itself
- `ffmpeg` installed (recordings, AI streamer)
- The server's IP allowed in MongoDB Atlas network access
- Frontend built with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` set to the backend's public URL (values are baked in at build time)

## Security notes

- Secrets live only in `.env` files on each machine and are never committed. The Google Cloud key file belongs outside the repo, referenced by an absolute path.
- Tokens are kept in `sessionStorage`, so the app depends on avoiding XSS. Moving the refresh token to an httpOnly cookie is planned.
- Helmet, CORS limited to the frontend origin, request validation with express-validator, and rate limiting are enabled; WebRTC media is encrypted (DTLS/SRTP).

## License

MIT
