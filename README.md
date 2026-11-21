# Collab Meet

Video meetings for up to six people, with a shared whiteboard, screen sharing, chat and file sharing.
It runs in the browser, so there is nothing to install.

Built with the MERN stack, WebRTC and Socket.IO.

<!-- Add your live link here: https://your-app.vercel.app -->

## Features

- **Video calls** for up to six people, with mute and camera controls and a speaking indicator in each person's own color
- **Preview screen** to check your camera and microphone before joining
- **Screen sharing** of a window or a tab, with the cameras moved to a side strip
- **Shared whiteboard** with pen, eraser, colors, brush sizes, per-person undo, clear and save as an image
- **Chat** and **file sharing** (up to 10 MB per file)
- **Accounts** with email and password, and invite links that survive the login step
- **Automatic reconnect** if the connection drops, and self-repair of failed video links
- **Keyboard shortcuts** and join/leave notices
- **Landing page**, responsive down to phone width, with reduced-motion support

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, Framer Motion, React Router |
| Backend | Node.js, Express 4, Socket.IO |
| Database | MongoDB Atlas with Mongoose |
| Real-time media | WebRTC (peer-to-peer mesh), STUN and optional TURN |
| Auth | bcrypt password hashing, JWT |
| Hosting | Vercel (client), Railway (server), MongoDB Atlas (database) |

## Project structure

```
collab-meet/
├── client/
│   ├── public/                 favicon
│   ├── src/
│   │   ├── api/                fetch helper, upload and download
│   │   ├── components/         UI pieces (VideoTile, Whiteboard, SidePanel, ...)
│   │   ├── context/            AuthContext
│   │   ├── hooks/              useRoom (the call), useSpeaking
│   │   ├── lib/                socket, rtc (ICE servers), people (colors)
│   │   └── pages/              Landing, Login, Register, Lobby, Room
│   ├── vercel.json             single-page-app rewrite
│   └── .env.example
└── server/
    ├── src/
    │   ├── config/             env validation, database
    │   ├── jobs/               old-file cleanup
    │   ├── middleware/         auth, validation, rate limits, errors
    │   ├── models/             User, Room, File
    │   ├── routes/             auth, rooms, files, ice
    │   ├── sockets/            rooms and signaling, whiteboard, rate limits
    │   └── utils/              token, ice (TURN credentials)
    └── .env.example
```

## Run it locally

You need Node.js 20 or newer and a free MongoDB Atlas cluster.

1. **Atlas:** create a cluster, add a database user, and allow your IP under Network Access.
2. **Server:**
   ```bash
   cd server
   cp .env.example .env     # then fill in MONGO_URI and JWT_SECRET
   npm install
   npm run dev              # http://localhost:5000
   ```
   Generate a secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. **Client** (in a second terminal):
   ```bash
   cd client
   cp .env.example .env     # VITE_API_URL=http://localhost:5000
   npm install
   npm run dev              # http://localhost:5173
   ```
4. Open http://localhost:5173, create an account, and start a meeting. To test a call with yourself, open the invite link in a private window and register a second account.

Use headphones when testing with two windows, or you will get feedback.

## Environment variables

**Server (`server/.env`)**

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | Atlas connection string, including a database name |
| `JWT_SECRET` | yes | At least 32 random characters |
| `CLIENT_URL` | yes in production | Allowed frontend origin(s), comma separated, no trailing slash |
| `PORT` | no | Defaults to 5000 (Railway sets it for you) |
| `NODE_ENV` | no | Set to `production` when deployed |
| `JWT_EXPIRES_IN` | no | Defaults to `7d` |
| `UPLOAD_DIR` | no | Where uploaded files are stored. Defaults to `uploads` |
| `FILE_RETENTION_DAYS` | no | Files are deleted after this many days. Defaults to 7 |
| `TURN_KEY_ID`, `TURN_KEY_API_TOKEN` | no | Optional Cloudflare Realtime TURN relay (needs a card on the Cloudflare account). Not used in the default deployment |

**Client (`client/.env`)**

| Variable | Description |
|---|---|
| `VITE_API_URL` | The server's address, with no trailing slash |

Vite bakes `VITE_` variables into the build, so never put secrets there, and rebuild after changing one.

## How a call works

1. A logged-in user creates a room. The server stores it under a random code like `k3f-9xqm-w2p`.
2. Everyone who opens the link joins the room over a Socket.IO connection that is checked with the user's JWT.
3. The newest person sends a WebRTC offer to each person already inside. The server only relays offers, answers and network candidates.
4. Audio and video then flow directly between browsers, using public STUN servers to find a path. No relay server is configured by default, so people on very strict networks may not be able to connect (see Known limitations).

Chat, the whiteboard and the people list live in server memory while a meeting is active.

## API

| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/register` | name, email, password |
| POST | `/api/auth/login` | returns a token |
| GET | `/api/auth/me` | current user |
| POST | `/api/rooms` | create a meeting |
| POST | `/api/files/:code` | upload a file (members of the meeting only) |
| GET | `/api/files/:code/:id` | download a file (members only) |
| GET | `/api/ice` | ICE servers. Returns an empty list unless a TURN relay is configured, and the client then uses public STUN |
| GET | `/health` | health check |

Socket events: `room:join`, `room:leave`, `signal`, `room:media`, `room:screen-start`, `room:screen-stop`, `chat:message`, `whiteboard:sync`, `whiteboard:draw`, `whiteboard:undo`, `whiteboard:clear`.

## Limits

- 6 people per meeting (every person sends video to every other person)
- 10 MB per file, deleted after 7 days by default
- Chat messages up to 1,000 characters, with the last 100 kept while the meeting is live
- Whiteboard: 1,500 strokes per board

## Security

- Passwords hashed with bcrypt, JWT for sessions, generic login errors
- Rate limits on the API, on login and register, on room creation, on uploads, and on every socket event
- Strict CORS, security headers, input validation and MongoDB operator sanitizing
- File uploads: random stored names, blocked executable types, forced downloads, members-only access
- Video and audio are encrypted in transit (DTLS-SRTP). Chat and files travel over HTTPS through the server, so they are **not** end-to-end encrypted.

## Keyboard shortcuts in a meeting

| Key | Action |
|---|---|
| `M` | Mute or unmute |
| `V` | Camera on or off |
| `S` | Start or stop screen sharing |
| `W` | Open or close the whiteboard |
| `C` | Open or close chat and files |

## Deploying

The app runs on three free-tier friendly services.

1. **MongoDB Atlas:** allow access from anywhere (`0.0.0.0/0`), since Railway's addresses change.
2. **Railway (server):** deploy this repo with the root directory set to `/server`, add the server variables above, attach a volume at `/data` and set `UPLOAD_DIR=/data/uploads`, set the health check path to `/health`, and keep one instance.
3. **Vercel (client):** import the repo with the root directory set to `client`, and set `VITE_API_URL` to the Railway address.
4. Set `CLIENT_URL` on Railway to the Vercel address.
5. Optional: add a TURN relay for strict networks using the `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` variables on Railway. Without one, calls use public STUN only.

## Known limitations

- Meetings are kept in server memory, so run a single server instance. Restarting the server ends active meetings.
- The mesh design is meant for small groups. Larger calls would need an SFU such as mediasoup.
- Whiteboards and chat are not saved after a meeting ends.
- Anyone in a meeting can clear the whiteboard.
- There is no TURN relay in the default deployment. Calls work on most home networks and on the same Wi-Fi, but  can fail when someone is on mobile data or behind a strict network, such as some school, company or hotel Wi-Fi.

## Tested

- Two devices on the same Wi-Fi network (laptop and phone): video, audio, chat, files, whiteboard and screen sharing