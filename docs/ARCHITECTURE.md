# 🏗️ Architecture

Slimefall is **framework-free**: ES modules, Canvas 2D and WebAudio. The `www/` folder is shipped as-is to every platform (browser, PWA, Capacitor WebView, Electron).

```
         ┌────────────┐   events    ┌──────────────┐
 input ─▶│  ui/hud.js │◀────────────│ game/game.js │  pure simulation, no DOM
         └─────┬──────┘   commands  └──────┬───────┘
               │                           │ state
         ┌─────▼──────┐              ┌─────▼────────┐
         │  main.js   │──── loop ───▶│ game/render  │  Canvas 2D
         │ (sessions, │              └──────────────┘
         │  rewards)  │──▶ save.js (profile, quests, achievements, cloud adapter)
         └────────────┘──▶ audio.js (procedural music + SFX)
```

## 🧠 Simulation (`game/game.js`)
- **Fixed 60 Hz step.** Speed-up runs more steps per frame, so 3× speed plays the same game as 1×. Waves are seeded (`mulberry32`), so a map/seed always produces the same waves (Daily Challenge relies on this).
- **Enemies store only `d`, their distance along a `Path`.** Position comes from a binary search over segments (`path.js`). This keeps knockback, "first/last" targeting and saving cheap.
- **Spatial hash grid** (80px cells) is rebuilt each step; all range queries (`near()`) go through it, so 1,000+ slimes stay fast on phones.
- **Layered slimes:** `pop()` spawns children and passes overflow damage into the first child. RBE (`rbe()`) = total layers = lives lost on leak.
- **Stats pipeline:** `def + tiers → base` (`computeBase`, using the upgrade mod language) `→ eff` (`refreshTower`: research, relics, prestige, weather, veterancy, support buffs, abilities). Support buffs are recomputed every 0.5s and take the **max** per buff type, so stacking can't run away.
- **Attack kinds:** `proj`, `beam` (chain / line), `aoe` (incl. cone), `aura`, `trap`, `orbit`, `summon`, `mortar`, `support`, `farm`. Mods can change `kind` mid-path (e.g. Frost Fern → Ice Beam).
- **Bosses** have HP thresholds (`phases`) that trigger `bossPhase()` (shields, time warps, summons, enrage).

## 🎨 Rendering (`game/render.js`)
- Static map (grass, roads, decorations) is painted **once** to an offscreen canvas.
- Slimes and emoji icons are **pre-rendered sprites** (`spriteCache`), then blitted with `drawImage` and a squash/stretch transform.
- Particles are **pooled** (`particles.js`), and the quality setting scales spawn counts.

## 💾 Saves (`save.js`)
- `localStorage` key `slimefall.profile`, **versioned schema** with forward `MIGRATIONS`. Missing keys are filled from defaults.
- Mid-game **checkpoint** saved at every wave end (campaign/endless) → "Continue" button.
- `cloud.use(provider)` plugs in any backend without touching game code (see [BACKEND.md](BACKEND.md)).

## 🎵 Audio (`audio.js`)
- Generative sequencer: 3 moods (menu/battle/boss) × an `intensity` value driven by enemy count, wave and bosses. Layers (pad → bass → arps → drums → melody) fade in as intensity rises.
- All sound is synthesized, so there are no audio files and no licensing issues.

## ➕ Adding content
| Want to add… | Edit | Notes |
|---|---|---|
| Tower | `data/towers.js` | UI, almanac and upgrade panel are generated. Descriptions are auto-generated from mods. |
| Slime | `data/enemies.js` + `UNLOCK_WAVE` | Children, immunities, armor, `ai`. |
| Map | `data/maps.js` | Paths on a 32×18 grid; give it a `world` position. |
| Hero | `data/heroes.js` | `base`, `grow` per level, `milestones`, `abilities`. |
| Relic / quest / achievement / modifier | `data/meta.js` | |
