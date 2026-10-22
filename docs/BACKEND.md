# ☁️ Backend: cloud saves, online leaderboards, multiplayer

v1.0 is **fully offline**: progress lives in `localStorage`, and moving devices uses ⚙️ Settings → Export/Import. Everything online is designed to plug in through one adapter without touching game code.

## 🔌 The adapter
```js
import { cloud } from './save.js';
cloud.use({
  async push(profile) { /* upsert profile JSON for the signed-in user */ },
  async pull() { /* return profile JSON or null */ },
  async submitScore(board, score, name) { /* e.g. board = 'endless:sprout' */ },
  async top(board) { /* return [{ name, score, at }] */ },
});
```
`saveProfile()` already calls `cloud.push()` on every (debounced) save.

## 🔥 Example: Firebase (Auth + Firestore)
1. Load the Firebase modular SDK.
2. Anonymous auth on boot → `uid`.
3. `push`: `setDoc(doc(db, 'profiles', uid), { data: profile, updated: serverTimestamp() })`
4. `submitScore`: `addDoc(collection(db, 'boards', board, 'scores'), { uid, name, score })`
5. **Security rules:** users write only their own profile. Validate scores server-side to resist cheating (see below).

Supabase (Postgres + row-level security) and PlayFab work the same way.

## 🌍 Multiplayer plan (roadmap)
The simulation is **deterministic** (fixed step + seeded RNG), which enables:
- **🤝 Online co-op:** lockstep. Clients exchange only *commands* (`place`, `upgrade`, `sell`, `ability`) tagged with a step number, and both sides simulate identically. Transport: WebRTC data channels plus a tiny signaling server (e.g. Cloudflare Workers / Durable Objects).
- **⚔️ PvP:** each player defends their own map; popping slimes generates "sends" that spawn on the opponent's map. Same lockstep model.
- **🛡️ Guilds/clans:** needs a real backend (accounts, membership, chat moderation). Plan: tables `guilds`, `members`, `guild_events`, with weekly guild quests summing members' `stats`.
- **🏆 Leaderboard anti-cheat:** submit the seed + command log, and a server re-simulates headlessly. `game.js` already runs in Node (see `scripts/simulate.mjs`).
