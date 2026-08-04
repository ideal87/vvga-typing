/* ============================================================
   Sound - everything is synthesised with the Web Audio API so
   the whole site stays self-contained (no .mp3 files to carry
   around on the USB stick, nothing to load from a network).
   ============================================================ */

window.Sound = (function () {
  'use strict';

  var ctx = null;
  var sfxGain = null;
  var bgmGain = null;

  var sfxOn = true;
  var bgmOn = false;
  var bgmTimer = null;
  var step = 0;
  var nextNoteAt = 0;

  var LOOKAHEAD_MS = 25;
  var SCHEDULE_AHEAD = 0.25;

  /* Three loops a camper can choose between. Each is 16 steps of
     melody over four bass notes, one per bar. They are all written
     to sit under a typing exercise: no drums, no sudden jumps, and
     quiet enough that the mistake "thunk" still cuts through. */
  var TRACKS = [
    {
      // The original: A minor pentatonic, slow and calm.
      id: 'stream', name: 'Quiet Stream',
      step: 0.42, hold: 0.85, lead: 'sine', bassWave: 'triangle',
      leadVol: 0.05, bassVol: 0.05,
      melody: [57, 60, 64, 67, 64, 60, 62, 65,
               57, 60, 64, 69, 67, 64, 60, 59],
      bass: [45, 41, 43, 40]
    },
    {
      // C major, climbing - bright without being busy.
      id: 'sunrise', name: 'Bright Sunrise',
      step: 0.36, hold: 0.70, lead: 'triangle', bassWave: 'sine',
      leadVol: 0.05, bassVol: 0.055,
      melody: [72, 76, 79, 76, 77, 74, 72, 69,
               71, 74, 79, 74, 72, 76, 72, 67],
      bass: [48, 53, 55, 48]
    },
    {
      // G major, quicker and skipping along. The cheerful one.
      id: 'praise', name: 'Happy Praise',
      step: 0.30, hold: 0.52, lead: 'triangle', bassWave: 'triangle',
      leadVol: 0.048, bassVol: 0.05,
      melody: [74, 79, 78, 79, 76, 74, 72, 74,
               78, 76, 74, 78, 79, 74, 71, 67],
      bass: [43, 48, 50, 43]
    }
  ];

  var trackIdx = 0;

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(ctx.destination);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(ctx.destination);
    return true;
  }

  // Browsers start the audio context suspended until the user
  // interacts with the page; call this from any click/keypress.
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') { ctx.resume(); }
  }

  /* ---------- one-shot effects ---------- */

  function tone(opts) {
    if (!ensure()) return;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var dur = opts.dur || 0.12;

    var osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(opts.to, 1), t0 + dur);
    }

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol || 0.1, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Wrong letter: a short, soft "thunk". Not harsh - kids hear
      this a lot and a nasty buzz makes them tense up. */
  function error() {
    if (!sfxOn || !ensure()) return;
    tone({ type: 'triangle', from: 196, to: 110, dur: 0.14, vol: 0.13 });
    tone({ type: 'sine', from: 98, to: 72, dur: 0.16, vol: 0.09 });
  }

  /** Verse finished: a quick two-note lift. */
  function verse() {
    if (!sfxOn || !ensure()) return;
    tone({ type: 'sine', from: midi(76), dur: 0.13, vol: 0.10 });
    tone({ type: 'sine', from: midi(81), dur: 0.22, vol: 0.10, delay: 0.11 });
  }

  /** Chapter finished: a little fanfare. */
  function fanfare() {
    if (!sfxOn || !ensure()) return;
    var notes = [72, 76, 79, 84];
    for (var i = 0; i < notes.length; i++) {
      tone({
        type: 'triangle',
        from: midi(notes[i]),
        dur: i === notes.length - 1 ? 0.75 : 0.2,
        vol: 0.12,
        delay: i * 0.13
      });
    }
    tone({ type: 'sine', from: midi(60), dur: 1.0, vol: 0.07, delay: 0.39 });
  }

  /** Soft click when a screen changes. */
  function blip() {
    if (!sfxOn || !ensure()) return;
    tone({ type: 'sine', from: midi(79), dur: 0.09, vol: 0.07 });
  }

  /* ---------- background music ---------- */

  function playBgmNote(mnote, at, dur, vol, type) {
    var osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = midi(mnote);

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(g);
    g.connect(bgmGain);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  function scheduler() {
    var t = TRACKS[trackIdx];
    while (nextNoteAt < ctx.currentTime + SCHEDULE_AHEAD) {
      var i = step % t.melody.length;
      playBgmNote(t.melody[i], nextNoteAt, t.hold, t.leadVol, t.lead);
      if (i % 4 === 0) {
        playBgmNote(t.bass[(step / 4 | 0) % t.bass.length],
                    nextNoteAt, t.step * 4, t.bassVol, t.bassWave);
      }
      nextNoteAt += t.step;
      step++;
    }
  }

  function startBgm() {
    if (!ensure()) return;
    unlock();
    if (bgmTimer) return;
    step = 0;
    nextNoteAt = ctx.currentTime + 0.1;
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.2);
    bgmTimer = setInterval(scheduler, LOOKAHEAD_MS);
  }

  function stopBgm() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    if (!ctx) return;
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
  }

  /* ---------- switches ---------- */

  function setSfx(on) { sfxOn = !!on; if (sfxOn) unlock(); }

  function setBgm(on) {
    bgmOn = !!on;
    if (bgmOn) { startBgm(); } else { stopBgm(); }
  }

  /** Switch loops. An unknown id (an old save, a hand-edited
      settings blob) quietly falls back to the first track. */
  function setTrack(id) {
    var next = 0;
    for (var i = 0; i < TRACKS.length; i++) {
      if (TRACKS[i].id === id) { next = i; break; }
    }
    if (next === trackIdx) return;
    trackIdx = next;
    if (bgmOn) { stopBgm(); startBgm(); }
  }

  function trackList() {
    var out = [];
    for (var i = 0; i < TRACKS.length; i++) {
      out.push({ id: TRACKS[i].id, name: TRACKS[i].name });
    }
    return out;
  }

  return {
    unlock: unlock,
    error: error,
    verse: verse,
    fanfare: fanfare,
    blip: blip,
    setSfx: setSfx,
    setBgm: setBgm,
    setTrack: setTrack,
    tracks: trackList,
    trackId: function () { return TRACKS[trackIdx].id; },
    isSfxOn: function () { return sfxOn; },
    isBgmOn: function () { return bgmOn; }
  };
})();
