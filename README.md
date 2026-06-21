# My Melody Discord Music Bot

A Discord music bot with YouTube search and playback, direct audio URLs, uploaded and local audio files, text-to-speech, persistent 24/7 voice connections, and button controls.

## Requirements

- Node.js 22.12 or newer
- A Discord application with a bot token
- Bot permissions to view channels, send messages, use application commands, and connect/speak in voice channels

FFmpeg is installed through `ffmpeg-static`; no system FFmpeg installation is required.

## Setup

```powershell
git clone https://github.com/BritCrit1/Discord-Music-Bot.git
cd Discord-Music-Bot
npm install
Copy-Item .env.example .env
```

Fill in `.env`:

```dotenv
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_test_server_id
COMMAND_SCOPE=guild
```

Never commit `.env`. Use `COMMAND_SCOPE=guild` while developing because guild commands update immediately. Set it to `global` for production deployment; global command propagation can take longer.

Register commands and start the bot:

```powershell
npm run deploy
npm start
```

## Commands

- `/connect` — connect persistently to your current voice channel
- `/disconnect` — disconnect and disable persistent mode
- `/play` — play a search query, YouTube link, direct audio URL, local file, or Discord upload
- `/pause`, `/resume`, `/skip`, `/volume` — control playback
- `/tts` — speak a short message in voice
- `/control` — post the interactive button controller
- `/status` — show the current track, state, volume, and queue

Local files are resolved beneath `storage/`. Discord uploads and persistent channel state are also stored there. The directory is intentionally excluded from Git.

## Validation

```powershell
npm test
npm audit --omit=dev
```

The test suite covers local player state behavior. Live Discord voice, YouTube, and command deployment require real credentials and external services, so they are not exercised by the local tests.
