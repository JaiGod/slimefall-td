# ⚖️ Balancing

All numbers live in `www/src/data/*` and `www/src/config.js`. **Never hard-code balance in engine code.**

## 💰 Economy
- Start cash: 🌱 850 · 🌼 700 · 🌵 650 · 💀 650 (+ research/relics).
- +$1 per layer popped (×0.5 after wave 50, ×0.2 after 85, ×0.1 after 100, to stop runaway late economies).
- End-of-wave bonus: `100 + wave`.
- Farms (`income`) pay at wave end; Honey Hive `bank` pays interest on banked cash (capped at $15k).
- Sell value: 70% (+ research).

## 🌊 Waves (`data/waves.js`)
- Waves 1–15 are handcrafted (tutorial curve).
- From 16 on: `budget(n)` RBE is split into 2–6 groups of unlocked types, with phase/regen/fortified/swift flags rolled by wave.
- Elite waves: wave % 10 === 5 after 20 (swift + fortified).
- Bosses every 20 waves; HP = `520 × (wave/20)^2.3 × bossRatio × difficulty`. A leaking boss costs `25 + 200 × remaining HP %` lives.
- Beyond wave 80, `endlessScale()` ramps HP and speed.

## 🤖 Balance simulator
```bash
node scripts/simulate.mjs 12 normal    # bot plays 12 maps
node scripts/simulate.mjs 20 easy
```
The bot buys random towers near the path and follows sensible upgrade plans. It is deliberately *worse* than a human. Current results / targets:

| Difficulty | Bot result | Human feel |
|---|---|---|
| 🌱 Sprout | wins ~70% of maps | relaxing |
| 🌼 Bloom | wins ~50% | fair |
| 🌵 Thorn | reaches wave 20–40 | needs a plan |
| 💀 Chaos | rarely past 20 | brutal |

If a change moves these a lot, re-tune. CI runs the simulator on every push.

## 🗼 Tower design rules of thumb
- Tier 1–2: cheap (100–500), +20–40% power each.
- Tier 3: defines the path's identity (new mechanic).
- Tier 4: ~3–7k, solves a slime type (armor, phase, behemoths).
- Tier 5: 14–50k, a game-changer, usually with an ⚡ ability.
- Every tower needs a weakness (immunity, no detection, no armor-pierce, low pierce, short range).
