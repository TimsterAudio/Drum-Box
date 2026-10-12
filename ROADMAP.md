# Roadmap

Where Drum Box is heading. It's a plan, not a promise: items move, merge or get dropped. When something ships, tick it here, note the version, and record it in [CHANGELOG.md](CHANGELOG.md).

**Where we are (2026-10-12):** v0.1.0 is on `main` as a single commit: the 808 kick section, ten more 808-style voices, a 16-step grid with patterns A–H, bus drive and glue, delay and reverb, five factory kits, and a headless smoke test. It reuses Drone Box's panel and control code. It hasn't been played by hand on a real machine yet, and the repo doesn't yet have the scaffolding Drone Box has (conventions file, launchers, tester checklist, releases).

**Sizes:** S = one session · M = two or three · L = a release of its own.

## The pipeline, in order

| Release | Theme | Size |
|---|---|---|
| v0.1.x | Set the project up like Drone Box, then play it by hand and fix what turns up | S–M |
| v0.2.0 | Making grooves: song mode, probability, ratchets, undo, WAV export | L |
| v0.3.0 | More sounds: a second kit flavour, per-voice extras, your own samples | L |
| v0.4.0 | Playing with others: Web MIDI clock and notes | M |
| later | Follow Drone Box's engine pathway, if its Rust engine proves out | L+ |

---

## Now: v0.1.x — set up and play it

**Project scaffolding** (copy from Drone Box, where it already works)
- [ ] `CLAUDE.md` with the hard rules: one self-contained file, no network requests, never break saved patches (`normalize()` and `defaultPatch()`), keep the scheduler and the voices free of DOM code
- [ ] `docs/ARCHITECTURE.md` (scheduler, voices, patch format) and `docs/DESIGN.md` (or a pointer to Drone Box's)
- [ ] The three `Launch on …` scripts, with Drone Box's default-browser and encoded-address fixes, sized to the 1920 × 900 design
- [ ] A tester checklist (`testing/Drum Box Test Checklist.html`) and `TESTING.md`
- [ ] CI that runs `tests/smoke.js` on every push, and a GitHub release for v0.1.0

**Playing it**
- [ ] Play it by hand on Windows and on Linux Mint + Brave: timing steadiness at high tempos and with swing, the kick on small speakers and on headphones, CPU use with every voice going
- [ ] Fix what turns up, as v0.1.x patch releases

*Exit check:* a tester can unzip it, launch it, and get through the checklist.

## Next: v0.2.0 — making grooves

- [ ] **Song mode:** an ordered list of patterns with repeats, beyond Chain's "every pattern with hits"
- [ ] **Per-step probability** and **ratchets / flams** (2–4 hits in one step)
- [ ] **Per-track length** (polymeter), with 32 steps as an option
- [ ] **Undo / redo** for grid edits and pattern operations
- [ ] **Record to WAV:** the master output, and an "export the song" render
- [ ] Mute groups or a per-voice choke setting beyond the hat pair

## Then: v0.3.0 — more sounds

- [ ] A second kit flavour (909-style kick, snare and hats) alongside the 808 voices
- [ ] Pitch envelope and decay on the toms; a longer, tunable cowbell and clap tail
- [ ] **Your own samples:** load a WAV into any voice slot (stored locally, saved with the kit)
- [ ] A per-voice filter and drive

## Then: v0.4.0 — playing with others

- [ ] **Web MIDI** (Chrome, Edge and Brave): clock in and out, notes in to play the voices, MIDI learn for knobs
- [ ] Investigate tempo sync with Drone Box running in the next window

## Later

- [ ] When Drone Box's engine moves to Rust (its Engine pathway, Phase 2), decide whether Drum Box follows on the same engine and, later, the same desktop app
- [ ] Themes from the shared Timster design-token spec (see EQ Box's roadmap)

## Ideas parking lot

- Pattern variations (A/B fills) triggered on the last bar of a song step
- A "humanise" amount (small random timing and velocity)
- Linking with Drone Box: a drone that follows the kick's root note
