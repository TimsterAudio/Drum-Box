# Drum Box

Timster's Audio Works · **v0.1.0**

An analog-style drum machine that runs entirely in one browser tab, built around a **fat 808 kick**. It's one self-contained file (`drum-box.html`) with no install, server or account, and nothing is sent anywhere. The panel follows [Drone Box](https://github.com/TimsterAudio/Drone-Box): the same black (or Silver) Jupiter-style panel, knurled knobs, faders, LED keys, red LED displays, colour families and fit-to-window scaling, with Drone Box's control code reused as-is.

Open `drum-box.html` in Chrome, Edge or Brave and press **Start / Stop** (or **Space**).

## The 808 kick

The kick has its own section, with large knobs and a live drawing of its waveform:

| Control | What it does |
|---|---|
| **Tune** | The resting pitch, 28–90 Hz (the readout shows the note too) |
| **Decay** | Boom length, 80 ms to 6 s. It holds at full for a moment before decaying, like the 808's bloom |
| **Sweep** | How far above the resting pitch it starts, 0–48 semitones |
| **Snap** | How fast the pitch dives to rest, 4–300 ms |
| **Click** | The beater transient: a burst of high noise and a short blip |
| **Drive** | tanh saturation. It rounds the sine toward a square, making the boom louder and adding harmonics so the sub still carries on small speakers. The curve is peak-normalised, so turning it up never clips |
| **Tone** | A low-pass after the drive, to tame those harmonics |
| **FX Send**, **Level**, **Mute**, **Solo** | As on the other instruments |
| **Choke** | On (default): each kick cuts off the tail of the one before, so long booms never smear |

Measured by the smoke test on the Trap 808 preset: 86% of the kick's energy is below 120 Hz, it settles exactly on its tuned pitch, it's still booming 1 s in, and it peaks well below 0 dBFS.

## The other ten instruments

Snare, Clap, Rim Shot, Low/Mid/Hi Tom, Cowbell, Closed Hat, Open Hat and Cymbal, all synthesised the way the 808 did it (the hats and cymbal from six detuned square waves). Each has Tune (±12 semitones), Decay, Tone (or Snappy / Noise), Pan, FX send, Level, Mute and Solo, plus a pad to play it. The closed hat chokes the open hat.

## Patterns

- **16-step grid**: one row per instrument, plus an **Accent** row. Click a cell to toggle it, or drag along a row to paint. The step numbers sit on the classic red, orange, yellow and cream bands.
- **Patterns A–H**. While it's running, a new pattern starts at the end of the bar (its key blinks until then). A dot marks patterns that have hits.
- **Length** (1–16 steps), **Accent** amount, **Swing** (50–75%), **Tempo** (40–240 BPM).
- **Chain** plays every pattern that has hits, in order, then loops.
- **Rec**: while it's running, the pads and number keys write hits into the nearest step.
- **Copy**, **Paste**, **Clear**, and **Random** (a new groove in the current pattern, weighted toward what drum machines usually play).

## Effects and output

- **Bus**: Drive (saturation on the whole kit) and Glue (a bus compressor).
- **Delay**: tempo-synced (1/16 to 3/8), with repeats that get darker.
- **Reverb**: generated impulse, 0.3–8 s.
- Master volume, a safety limiter, L/R meters, a scope and a spectrum.

## Playing it

- **Space**: start / stop. **1 2 3 4 5 6 7 8 9 0 -** play the eleven instruments (Shift for an accented hit).
- Knobs and faders work exactly as in Drone Box: drag up or down (Shift for fine control), arrow keys when focused, double-click to reset.
- **Memory**: factory kits with patterns (Trap 808, Boom Bap, Electro Funk, House and Miami Bass, plus an empty Init), Save and Delete in browser storage, Export and Import as JSON.

## Saved format

A patch is plain JSON: `tempo`, `swing`, `accent`, `kick` {tune, decay, sweep, snap, click, drive, tone, level, send, mono, mute}, `voices` {sd, cp, …: tune, decay, tone, pan, send, level, mute}, `fx`, `master`, and `patterns` (8 × {len, acc[16], steps {bd[16], …}}). `normalize()` merges anything loaded onto the defaults, so add new fields to `defaultPatch()` and never rename old ones. Browser storage keys start with `drumbox.`.

## Testing

`tests/smoke.js` drives the page in headless Chromium: layout and scaling, offline renders of the kick (sub share, pitch, decay, drive, no clipping), every instrument sounding, the hat choke, live playback and the playhead, grid editing, queued pattern changes, Rec, knobs, presets and patch loading.

```sh
NODE_PATH="$(npm root -g)" node tests/smoke.js
```
