// Drum Box smoke test: drives drum-box.html in headless Chromium.
// Run from the repo root:  NODE_PATH="$(npm root -g)" node tests/smoke.js
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'drum-box.html');
let failed = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  (' + info + ')' : ''}`);
  if (!ok) failed++;
};

(async () => {
  const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
  const page = await browser.newPage({viewport: {width: 1920, height: 900}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(400);

  // --- Layout ---
  const lay = await page.evaluate(() => ({
    zoom: +document.body.style.zoom,
    over: [...document.querySelectorAll('.row')].some(r => r.scrollWidth > r.clientWidth + 1),
    stripRows: (() => { const tops = new Set([...document.querySelector('.strip').children].map(c => Math.round(c.getBoundingClientRect().top / 40))); return tops.size; })(),
    strips: document.querySelectorAll('.vstrip').length,
    cells: document.querySelectorAll('.gc').length
  }));
  check('panel fits 1920 x 900 without much shrinking', lay.zoom > 0.93, 'zoom ' + lay.zoom);
  check('no row overflows', !lay.over);
  check('ten instrument strips plus the kick section', lay.strips === 10 && await page.$('.kick-sec') !== null);
  check('grid has 12 rows of 16 steps', lay.cells === 12 * 16);
  for (const [w, h] of [[1366, 768], [1180, 820], [2560, 1440]]){
    await page.setViewportSize({width: w, height: h});
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const b = document.body.getBoundingClientRect();   // already includes the CSS zoom
      return {w: b.width, h: b.height};
    });
    check(`scales to fit ${w} x ${h}`, r.w <= w + 1 && r.h <= h + 1, `${Math.round(r.w)} x ${Math.round(r.h)}`);
  }
  await page.setViewportSize({width: 1920, height: 900});

  // --- The fat 808 kick, rendered offline ---
  const kick = await page.evaluate(async () => {
    const {Engine, normalize, FACTORY} = window.drumbox;
    const render = async (over, seconds = 3) => {
      const p = normalize(JSON.parse(JSON.stringify(FACTORY[0])));
      Object.assign(p.kick, over);
      p.fx.rmix = 0; p.fx.dmix = 0;
      const ctx = new OfflineAudioContext(2, 48000 * seconds, 48000);
      const e = new Engine(p);
      e.build(ctx);
      e.hit('bd', 0.05, 1);
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };
    // Energy below / above a frequency, by a one-pole split (good enough for a sanity check)
    const bands = (d, hz) => {
      const a = Math.exp(-2 * Math.PI * hz / 48000);
      let lp = 0, lo = 0, hi = 0;
      for (const x of d){ lp = (1 - a) * x + a * lp; lo += lp * lp; hi += (x - lp) * (x - lp); }
      return {lo, hi};
    };
    const peak = d => d.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    const tailRms = (d, t0, t1) => { let s = 0, n = 0; for (let i = t0 * 48000; i < t1 * 48000; i++){ s += d[i] * d[i]; n++; } return Math.sqrt(s / n); };
    // Zero crossings in a window, to read the resting pitch
    const pitch = (d, t0, t1) => { let z = 0; for (let i = t0 * 48000 + 1; i < t1 * 48000; i++) if (d[i - 1] < 0 && d[i] >= 0) z++; return z / (t1 - t0); };

    const fat = await render({});
    const clean = await render({drive: 0});
    const short = await render({decay: 0.2});
    const b = bands(fat, 120);
    return {
      peak: peak(fat),
      subShare: b.lo / (b.lo + b.hi),
      boomAt1s: tailRms(fat, 1.0, 1.1),
      shortAt1s: tailRms(short, 1.0, 1.1),
      pitch: pitch(fat, 0.6, 1.2),
      tune: FACTORY[0].kick.tune,
      driveGain: tailRms(fat, 0.2, 0.4) / tailRms(clean, 0.2, 0.4),
      driveHarm: bands(fat, 150).hi / bands(clean, 150).hi
    };
  });
  check('kick: most of its energy is sub (< 120 Hz)', kick.subShare > 0.85, (kick.subShare * 100).toFixed(1) + '%');
  check('kick: loud but not clipping', kick.peak > 0.25 && kick.peak <= 1.0, 'peak ' + kick.peak.toFixed(3));
  check('kick: settles on its tuned pitch', Math.abs(kick.pitch - kick.tune) < 3, kick.pitch.toFixed(1) + ' Hz vs ' + kick.tune);
  check('kick: long decay still booming at 1 s', kick.boomAt1s > 0.03, 'rms ' + kick.boomAt1s.toFixed(3));
  check('kick: Decay knob shortens it', kick.shortAt1s < kick.boomAt1s / 50);
  check('kick: Drive fattens it (louder body, more harmonics)', kick.driveGain > 1.15 && kick.driveHarm > 2,
    `body x${kick.driveGain.toFixed(2)}, harmonics x${kick.driveHarm.toFixed(1)}`);

  // --- Every voice sounds ---
  const voices = await page.evaluate(async () => {
    const {Engine, normalize, FACTORY, VOICES} = window.drumbox;
    const out = {};
    for (const v of VOICES){
      const p = normalize(JSON.parse(JSON.stringify(FACTORY[5])));
      p.fx.rmix = 0; p.fx.dmix = 0;
      const ctx = new OfflineAudioContext(2, 48000, 48000);
      const e = new Engine(p); e.build(ctx);
      e.hit(v.id, 0.01, 1);
      const d = (await ctx.startRendering()).getChannelData(0);
      out[v.id] = d.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    }
    return out;
  });
  for (const [id, pk] of Object.entries(voices)) check(`voice ${id.toUpperCase()} sounds`, pk > 0.02 && pk <= 1, 'peak ' + pk.toFixed(3));

  // Choke: closed hat cuts the open hat
  const choke = await page.evaluate(async () => {
    const {Engine, normalize, FACTORY} = window.drumbox;
    const run = async withCh => {
      const p = normalize(JSON.parse(JSON.stringify(FACTORY[5])));
      p.fx.rmix = 0; p.fx.dmix = 0; p.voices.oh.decay = 1.2; p.voices.ch.decay = 0.03;
      const ctx = new OfflineAudioContext(2, 48000, 48000);
      const e = new Engine(p); e.build(ctx);
      e.hit('oh', 0.01, 1);
      if (withCh) e.hit('ch', 0.2, 1);
      const d = (await ctx.startRendering()).getChannelData(0);
      let s = 0; for (let i = 0.4 * 48000; i < 0.6 * 48000; i++) s += d[i] * d[i];
      return s;
    };
    return {open: await run(false), choked: await run(true)};
  });
  check('closed hat chokes the open hat', choke.choked < choke.open / 100);

  // --- Live playback ---
  await page.click('#play');
  await page.waitForTimeout(1500);
  const live = await page.evaluate(() => {
    const e = window.drumbox.engine, an = e.analyser, buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    return {state: e.ctx.state, playing: window.drumbox.seq.playing, peak: buf.reduce((m, x) => Math.max(m, Math.abs(x)), 0),
      lcd: document.querySelector('#lcd1b').textContent, now: document.querySelectorAll('.gh.now').length};
  });
  check('Start plays the pattern', live.state === 'running' && live.playing && live.peak > 0.05, 'peak ' + live.peak.toFixed(3));
  check('playhead and LCD step counter move', live.now === 1 && /^PLAY A \d\d$/.test(live.lcd), live.lcd);

  // Grid editing
  const cell = await page.$('.gc[data-v="cb"][data-s="5"]');
  const before = await page.evaluate(() => window.drumbox.patch.patterns[window.drumbox.patch.cur].steps.cb[5]);
  await cell.click();
  const after = await page.evaluate(() => window.drumbox.patch.patterns[window.drumbox.patch.cur].steps.cb[5]);
  check('clicking a grid cell toggles the step', before === 0 && after === 1 && await cell.evaluate(c => c.classList.contains('on')));
  // Drag-paint across a row
  const a = await (await page.$('.gc[data-v="lt"][data-s="0"]')).boundingBox();
  const b = await (await page.$('.gc[data-v="lt"][data-s="3"]')).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {steps: 8}); await page.mouse.up();
  const lt = await page.evaluate(() => window.drumbox.patch.patterns[window.drumbox.patch.cur].steps.lt.slice(0, 4).join(''));
  check('dragging paints a run of steps', lt === '1111', lt);

  // Pattern switch while running is queued to the bar end
  await page.click('.pat-keys .hwb:nth-child(2)');
  const q = await page.evaluate(() => window.drumbox.seq.queued);
  check('choosing a pattern while running queues it', q === 1);
  await page.waitForTimeout(3600);
  const switched = await page.evaluate(() => ({cur: window.drumbox.patch.cur, pat: window.drumbox.seq.pat}));
  check('queued pattern starts at the end of the bar', switched.cur === 1 && switched.pat === 1, JSON.stringify(switched));

  // Rec: keys write hits into the running pattern
  await page.click('.seq-ctl .hwb.k-red');
  const cbBefore = await page.evaluate(() => window.drumbox.patch.patterns[1].steps.cb.reduce((a, b) => a + b, 0));
  for (let i = 0; i < 3; i++){ await page.keyboard.press('8'); await page.waitForTimeout(260); }
  const cbAfter = await page.evaluate(() => window.drumbox.patch.patterns[1].steps.cb.reduce((a, b) => a + b, 0));
  check('Rec writes played hits into the pattern', cbAfter > cbBefore, `${cbBefore} -> ${cbAfter}`);
  await page.click('.seq-ctl .hwb.k-red');

  // Space stops
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  check('Space stops', !(await page.evaluate(() => window.drumbox.seq.playing)));

  // Knobs: drag the kick tune
  const tuneKnob = await page.$('.kick-sec .knob');
  const kb = await tuneKnob.boundingBox();
  const t0 = await page.evaluate(() => window.drumbox.patch.kick.tune);
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2); await page.mouse.down();
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2 - 40, {steps: 5}); await page.mouse.up();
  const t1 = await page.evaluate(() => window.drumbox.patch.kick.tune);
  check('dragging the kick Tune knob changes it', t1 > t0, `${t0} -> ${t1}`);
  await page.keyboard.press('Home');
  check('Home key sends it to the bottom', await page.evaluate(() => window.drumbox.patch.kick.tune) === 28);

  // Presets
  const names = await page.$$eval('#presetSel option', os => os.map(o => o.value).filter(v => v.startsWith('f:')));
  for (const v of names){
    await page.selectOption('#presetSel', v);
    const n = await page.evaluate(() => window.drumbox.patch.name);
    check(`preset ${v} loads`, !!n, n);
  }

  // Patch normalising: junk, partial and old data
  const norm = await page.evaluate(() => {
    const {normalize} = window.drumbox;
    const a = normalize({tempo: 'fast', kick: {tune: 50, bogus: 1}, patterns: [{len: 99, steps: {bd: [1, 0, 1]}}], extra: true});
    const b = normalize(null);
    return {tempo: a.tempo, tune: a.kick.tune, bogus: 'bogus' in a.kick, len: a.patterns[0].len, bd: a.patterns[0].steps.bd.slice(0, 4).join(''),
      rows: a.patterns[0].steps.sd.length, extra: 'extra' in a, b: b.patterns.length};
  });
  check('normalize keeps good fields, drops bad ones', norm.tempo === 120 && norm.tune === 50 && !norm.bogus && !norm.extra);
  check('normalize clamps and fills patterns', norm.len === 16 && norm.bd === '1010' && norm.rows === 16 && norm.b === 8);

  // Silver panel
  await page.click('#themeSlot .hwb:nth-child(2)');
  check('Silver panel switch', await page.evaluate(() => document.documentElement.dataset.theme) === 'silver');
  await page.click('#themeSlot .hwb:nth-child(1)');

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
