/* ============================================================
   VVGA Bible Typing - main application
   Plain script (no modules, no build step) so the folder can be
   copied onto a USB stick and index.html opened directly.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. Turn the raw chapter/verse data into typing segments
     --------------------------------------------------------- */

  // Longest chunk a 8-12 year old should face in one go. Verses
  // longer than this are split at a natural pause.
  var MAX_SEG = 140;

  var CHAPTER_INFO = {
    5: { theme: 'The Beatitudes', hint: 'Blessed are the poor in spirit…' },
    6: { theme: "The Lord's Prayer", hint: 'Our Father which art in heaven…' },
    7: { theme: 'Ask, Seek, Knock',  hint: 'Ask, and it shall be given you…' }
  };

  function breakPoint(t) {
    var mid = t.length / 2;
    var best = -1, bestScore = Infinity;
    for (var i = 1; i < t.length - 1; i++) {
      if (t.charAt(i) !== ' ') continue;
      var score = Math.abs(i - mid);
      var prev = t.charAt(i - 1);
      if (prev === ',' || prev === ';' || prev === ':') score -= 30;
      if (prev === '.' || prev === '?' || prev === '!') score -= 45;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  function splitText(t) {
    if (t.length <= MAX_SEG) return [t];
    var i = breakPoint(t);
    if (i < 1) return [t];
    return splitText(t.slice(0, i)).concat(splitText(t.slice(i + 1)));
  }

  function buildChapters(raw) {
    var out = [];
    for (var c = 0; c < raw.length; c++) {
      var ch = raw[c];
      var segs = [];
      for (var v = 0; v < ch.verses.length; v++) {
        var verse = ch.verses[v];
        var pieces = splitText(verse.t);
        for (var p = 0; p < pieces.length; p++) {
          segs.push({
            verse: verse.n,
            part: p + 1,
            parts: pieces.length,
            text: pieces[p]
          });
        }
      }
      var info = CHAPTER_INFO[ch.chapter] || { theme: '', hint: '' };
      out.push({
        num: ch.chapter,
        title: 'Matthew ' + ch.chapter,
        theme: info.theme,
        hint: info.hint,
        verseCount: ch.verses.length,
        segs: segs
      });
    }
    return out;
  }

  var CHAPTERS = buildChapters(window.BIBLE_DATA);

  function chapterByNum(n) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].num === n) return CHAPTERS[i];
    }
    return null;
  }

  /* ---------------------------------------------------------
     2. Badges
     --------------------------------------------------------- */

  var BADGES = {
    gold:   { rank: 4, label: 'Gold',   cls: 'gold',   msg: 'Almost perfect. That is beautifully careful work.' },
    silver: { rank: 3, label: 'Silver', cls: 'silver', msg: 'Excellent accuracy — so close to gold!' },
    bronze: { rank: 2, label: 'Bronze', cls: 'bronze', msg: 'Well done. Steady hands and a careful eye.' },
    pearl:  { rank: 1, label: 'Pearl',  cls: 'pearl',  msg: 'You typed the whole chapter — that is the hard part. Try it again and 90% earns you Bronze.' }
  };

  function badgeFor(acc) {
    if (acc >= 98) return 'gold';
    if (acc >= 95) return 'silver';
    if (acc >= 90) return 'bronze';
    return 'pearl';
  }

  /* ---------------------------------------------------------
     3. Small helpers
     --------------------------------------------------------- */

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function initial(name) {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function pct(n) { return Math.round(n); }

  function mmss(ms) {
    var s = Math.round(ms / 1000);
    var m = Math.floor(s / 60);
    return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  function accuracyOf(cs) {
    if (!cs.keystrokes) return 100;
    return (cs.correct / cs.keystrokes) * 100;
  }

  function wpmOf(cs) {
    if (!cs.timeMs) return 0;
    var wpm = (cs.correct / 5) / (cs.timeMs / 60000);
    // A very short burst can produce a nonsense number; clamp it so
    // the scoreboard never shows something silly.
    return Math.min(wpm, 250);
  }

  /* ---------------------------------------------------------
     4. Screens
     --------------------------------------------------------- */

  var SCREENS = ['screen-welcome', 'screen-home', 'screen-type', 'screen-done'];

  function show(id) {
    for (var i = 0; i < SCREENS.length; i++) {
      $(SCREENS[i]).hidden = (SCREENS[i] !== id);
    }
    $('topbar').hidden = (id === 'screen-welcome');
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------
     5. Settings (sound switches)
     --------------------------------------------------------- */

  var settings = Store.settings();

  function paintSettings() {
    $('sfxBtn').setAttribute('aria-pressed', settings.sfx ? 'true' : 'false');
    $('bgmBtn').setAttribute('aria-pressed', settings.bgm ? 'true' : 'false');
    $('sfxGlyph').innerHTML = settings.sfx ? '&#128266;' : '&#128263;';
  }

  function applySettings() {
    Sound.setSfx(settings.sfx);
    Sound.setBgm(settings.bgm);
    Store.saveSettings(settings);
    paintSettings();
  }

  $('sfxBtn').addEventListener('click', function () {
    settings.sfx = !settings.sfx;
    applySettings();
    if (settings.sfx) Sound.blip();
  });

  $('bgmBtn').addEventListener('click', function () {
    settings.bgm = !settings.bgm;
    applySettings();
  });

  /* ---------------------------------------------------------
     6. Welcome screen
     --------------------------------------------------------- */

  function paintWelcome() {
    saveCurrentRun();
    var list = Store.all();
    var grid = $('camperGrid');
    grid.innerHTML = '';

    for (var i = 0; i < list.length; i++) {
      (function (p) {
        var done = 0;
        for (var k in p.chapters) {
          if (Object.prototype.hasOwnProperty.call(p.chapters, k) && p.chapters[k].completed) done++;
        }
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'camper';
        b.innerHTML =
          '<span class="camper-avatar">' + esc(initial(p.name)) + '</span>' +
          '<span>' + esc(p.name) +
          '<span class="camper-meta">' + (done ? done + ' of 3 done' : 'just starting') + '</span>' +
          '</span>';
        b.addEventListener('click', function () {
          Sound.unlock();
          Store.setActive(p.id);
          Sound.blip();
          goHome();
        });
        grid.appendChild(b);
      })(list[i]);
    }

    // First ever visit: skip straight to the sign-up form.
    var firstTime = list.length === 0;
    $('pickWrap').hidden = firstTime;
    $('newCamperForm').hidden = !firstTime;
    show('screen-welcome');
  }

  $('newCamperBtn').addEventListener('click', function () {
    Sound.unlock();
    $('pickWrap').hidden = true;
    $('newCamperForm').hidden = false;
    $('formError').hidden = true;
    $('fName').focus();
  });

  $('cancelNewBtn').addEventListener('click', function () {
    $('newCamperForm').hidden = true;
    $('pickWrap').hidden = false;
  });

  $('newCamperForm').addEventListener('submit', function (e) {
    e.preventDefault();
    Sound.unlock();

    var name = $('fName').value.trim();
    var age = parseInt($('fAge').value, 10);
    var genderEl = document.querySelector('#fGender input:checked');
    var err = $('formError');

    if (name.length < 2) { return fail('Please type your name (at least 2 letters).'); }
    if (Store.nameTaken(name)) { return fail('Someone here already uses that name. Try adding your last initial.'); }
    if (!age || age < 5 || age > 15) { return fail('Please enter your age (5 to 15).'); }
    if (!genderEl) { return fail('Please pick one of the choices.'); }

    err.hidden = true;
    Store.create(name, age, genderEl.value);
    $('newCamperForm').reset();
    Sound.blip();
    goHome();

    function fail(m) { err.textContent = m; err.hidden = false; }
  });

  /* ---------------------------------------------------------
     7. Home screen
     --------------------------------------------------------- */

  function ringSvg(percent) {
    var r = 22, circ = 2 * Math.PI * r;
    var on = circ * (percent / 100);
    // At 0% the rounded stroke cap would still paint a dot, so the
    // foreground arc is left out entirely.
    var fg = percent > 0
      ? '<circle class="ring-fg" cx="26" cy="26" r="' + r + '" ' +
        'stroke-dasharray="' + on.toFixed(1) + ' ' + circ.toFixed(1) + '"></circle>'
      : '';
    return '<svg class="ring" viewBox="0 0 52 52">' +
      '<circle class="ring-bg" cx="26" cy="26" r="' + r + '"></circle>' +
      fg + '</svg>';
  }

  // Leaving the typing screen by any route keeps the tallies and the
  // place in the chapter.
  function saveCurrentRun() {
    if (T.ch && T.pid && !$('screen-type').hidden) {
      Store.saveChapter(T.pid, T.ch.num, T.cs);
    }
  }

  function goHome() {
    saveCurrentRun();
    var p = Store.active();
    if (!p) { paintWelcome(); return; }

    $('chipName').textContent = p.name;
    $('chipAvatar').textContent = initial(p.name);
    $('greetName').textContent = 'Hello, ' + p.name + '!';

    var totalDone = 0;
    for (var k in p.chapters) {
      if (Object.prototype.hasOwnProperty.call(p.chapters, k) && p.chapters[k].completed) totalDone++;
    }
    $('greetSub').textContent = totalDone === 3
      ? 'You have finished all three chapters. Try one again for a better badge!'
      : 'Pick a chapter and start typing. Your place is saved automatically.';

    // chapter cards
    var grid = $('chapterGrid');
    grid.innerHTML = '';
    for (var i = 0; i < CHAPTERS.length; i++) {
      (function (ch) {
        var cs = Store.chapter(p.id, ch.num);
        var total = ch.segs.length;
        var running = cs.seg > 0 && cs.seg < total;
        var percent = cs.completed && !running ? 100 : Math.round((cs.seg / total) * 100);

        var note;
        if (running) note = 'Line ' + (cs.seg + 1) + ' of ' + total;
        else if (cs.completed) note = 'Best ' + pct(cs.bestAcc) + '% · ' + BADGES[cs.badge].label;
        else note = 'Not started yet';

        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'chapter-card';
        card.innerHTML =
          (cs.badge ? '<span class="card-badge bg-' + cs.badge + '">★</span>' : '') +
          '<div class="chapter-num">Chapter ' + ch.num + '</div>' +
          '<div class="chapter-name">' + esc(ch.title) + '</div>' +
          '<div class="chapter-sub">' + esc(ch.theme) + ' · ' + ch.verseCount + ' verses</div>' +
          '<div class="ring-row">' + ringSvg(percent) +
            '<div><div class="ring-pct">' + percent + '%</div>' +
            '<div class="ring-note">' + esc(note) + '</div></div>' +
          '</div>';
        card.addEventListener('click', function () { openChapter(ch.num); });
        grid.appendChild(card);
      })(CHAPTERS[i]);
    }

    paintShelf(p);
    paintBoard(p);
    show('screen-home');
  }

  function paintShelf(p) {
    var shelf = $('badgeShelf');
    shelf.innerHTML = '';
    for (var i = 0; i < CHAPTERS.length; i++) {
      var ch = CHAPTERS[i];
      var cs = Store.chapter(p.id, ch.num);
      var item = document.createElement('div');
      item.className = 'shelf-item';
      item.innerHTML = cs.badge
        ? '<div class="shelf-disc bg-' + cs.badge + '">★</div><div class="shelf-label">Mt ' + ch.num + ' · ' + BADGES[cs.badge].label + '</div>'
        : '<div class="shelf-disc empty">?</div><div class="shelf-label">Mt ' + ch.num + '</div>';
      shelf.appendChild(item);
    }
  }

  function paintBoard(me) {
    var list = Store.all();
    var rows = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i], sum = 0, n = 0;
      for (var j = 0; j < CHAPTERS.length; j++) {
        var cs = Store.chapter(p.id, CHAPTERS[j].num);
        if (cs.completed && cs.bestAcc !== null) { sum += cs.bestAcc; n++; }
      }
      if (n > 0) rows.push({ name: p.name, id: p.id, avg: sum / n, done: n });
    }
    rows.sort(function (a, b) { return b.avg - a.avg; });

    var ol = $('board');
    ol.innerHTML = '';
    if (!rows.length) {
      ol.innerHTML = '<p class="board-empty">Finish a chapter and your accuracy shows up here. Careful typing wins — not fast typing.</p>';
      return;
    }
    for (var r = 0; r < rows.length; r++) {
      var li = document.createElement('li');
      li.innerHTML =
        '<span class="rank">' + (r + 1) + '</span>' +
        '<span class="who' + (rows[r].id === me.id ? ' me' : '') + '">' + esc(rows[r].name) + '</span>' +
        '<span class="done">' + rows[r].done + '/3</span>' +
        '<span class="score">' + pct(rows[r].avg) + '%</span>';
      ol.appendChild(li);
    }
  }

  $('brandBtn').addEventListener('click', goHome);
  $('whoBtn').addEventListener('click', paintWelcome);
  $('switchBtn').addEventListener('click', paintWelcome);

  $('resetBtn').addEventListener('click', function () {
    var p = Store.active();
    if (!p) return;
    if (window.confirm('Erase all of ' + p.name + "'s progress and badges? This cannot be undone.")) {
      Store.resetProfile(p.id);
      goHome();
    }
  });

  /* ---------------------------------------------------------
     8. Typing engine
     --------------------------------------------------------- */

  var T = {
    ch: null,       // chapter object
    cs: null,       // saved chapter state (this run's tallies)
    pid: null,      // profile id
    idx: 0,
    target: '',
    typed: '',
    lastAt: 0,      // timestamp of previous keystroke, for active-time
    locked: false   // true while the finish animation plays
  };

  var capture = $('capture');

  function openChapter(num) {
    var p = Store.active();
    if (!p) { paintWelcome(); return; }

    var ch = chapterByNum(num);
    var cs = Store.chapter(p.id, num);

    // Finished last time? Start a clean run.
    if (cs.seg >= ch.segs.length) {
      var keep = { bestAcc: cs.bestAcc, badge: cs.badge, runs: cs.runs, completed: cs.completed };
      cs = Store.blankChapter();
      cs.bestAcc = keep.bestAcc;
      cs.badge = keep.badge;
      cs.runs = keep.runs;
      cs.completed = keep.completed;
    }

    T.ch = ch;
    T.cs = cs;
    T.pid = p.id;
    T.idx = cs.seg;
    T.lastAt = 0;
    T.locked = false;

    $('chapTitle').textContent = ch.title;
    show('screen-type');
    loadSegment();
  }

  function loadSegment() {
    var seg = T.ch.segs[T.idx];
    T.target = seg.text;
    T.typed = '';
    T.locked = false;
    capture.value = '';

    $('verseRef').textContent = 'verse ' + seg.verse +
      (seg.parts > 1 ? ' · part ' + seg.part + ' of ' + seg.parts : '');

    $('nextBtn').disabled = true;
    setHint('Click the verse and start typing. Take your time.', '');
    paintProgress();
    render();
    focusCapture();
  }

  function focusCapture() {
    try { capture.focus({ preventScroll: true }); } catch (e) { capture.focus(); }
  }

  function paintProgress() {
    var total = T.ch.segs.length;
    var done = T.idx;
    $('progFill').style.width = ((done / total) * 100) + '%';
    $('progText').textContent = (done + 1) + ' / ' + total;
  }

  function setHint(text, cls) {
    var h = $('hint');
    h.textContent = text;
    h.className = 'hint' + (cls ? ' ' + cls : '');
  }

  function render() {
    var target = T.target, typed = T.typed;

    // The passage, coloured letter by letter.
    var html = '';
    for (var i = 0; i < target.length; i++) {
      var ch = target.charAt(i), cls;
      if (i < typed.length) {
        cls = (typed.charAt(i) === ch) ? 'ch-ok' : 'ch-bad';
        if (ch === ' ' && cls === 'ch-bad') cls += ' ch-space';
      } else if (i === typed.length) {
        cls = 'ch-now';
      } else {
        cls = 'ch-todo';
      }
      html += '<span class="' + cls + '">' + esc(ch) + '</span>';
    }
    $('target').innerHTML = html;

    // The live echo of what the child has actually typed.
    if (!typed.length) {
      $('echo').innerHTML = '<span class="echo-empty">your letters will appear here</span><span class="echo-caret"></span>';
    } else {
      var e = '';
      for (var j = 0; j < typed.length; j++) {
        var c = typed.charAt(j);
        if (c === target.charAt(j)) {
          e += esc(c);
        } else {
          e += '<span class="e-bad' + (c === ' ' ? ' ch-space' : '') + '">' + esc(c) + '</span>';
        }
      }
      $('echo').innerHTML = e + '<span class="echo-caret"></span>';
    }

    paintStats();
  }

  function paintStats() {
    var cs = T.cs;
    $('sWpm').textContent = Math.round(wpmOf(cs));
    $('sAcc').textContent = pct(accuracyOf(cs));
    $('sErr').textContent = cs.errors;
  }

  function shake() {
    var el = $('target');
    el.classList.remove('shake');
    void el.offsetWidth;   // restart the animation
    el.classList.add('shake');
  }

  capture.addEventListener('input', function () {
    if (T.locked) { capture.value = T.typed; return; }

    var val = capture.value;
    if (val.length > T.target.length) {
      val = val.slice(0, T.target.length);
      capture.value = val;
    }

    var prev = T.typed;

    if (val.length > prev.length) {
      // Count active typing time, ignoring long pauses so that a
      // child who stops to listen is not punished on speed.
      var now = Date.now();
      if (T.lastAt && now - T.lastAt < 5000) { T.cs.timeMs += now - T.lastAt; }
      T.lastAt = now;

      var wrong = false;
      for (var i = prev.length; i < val.length; i++) {
        T.cs.keystrokes++;
        if (val.charAt(i) === T.target.charAt(i)) { T.cs.correct++; }
        else { T.cs.errors++; wrong = true; }
      }
      if (wrong) { Sound.error(); shake(); }
    }

    T.typed = val;
    render();
    checkSegment();
  });

  // Pasting the verse in would defeat the point.
  capture.addEventListener('paste', function (e) { e.preventDefault(); });

  capture.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') { e.preventDefault(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!$('nextBtn').disabled) { advance(false); }
    }
  });

  function checkSegment() {
    if (T.typed === T.target) {
      advance(true);
    } else if (T.typed.length >= T.target.length) {
      $('nextBtn').disabled = false;
      setHint('Almost! Fix the red letters, or press Next to move on.', 'warn');
    } else {
      $('nextBtn').disabled = true;
      if ($('hint').classList.contains('warn')) {
        setHint('Keep going — you are doing fine.', '');
      }
    }
  }

  function advance(clean) {
    if (T.locked) return;
    T.locked = true;

    T.cs.verses++;
    T.idx++;
    T.cs.seg = T.idx;
    Store.saveChapter(T.pid, T.ch.num, T.cs);

    if (clean) {
      Sound.verse();
      setHint('Perfect line!', 'cheer');
    } else {
      setHint('Moving on — nice effort.', '');
    }
    $('nextBtn').disabled = true;

    var last = T.idx >= T.ch.segs.length;
    setTimeout(function () {
      if (last) { finishChapter(); } else { loadSegment(); }
    }, clean ? 320 : 120);
  }

  $('nextBtn').addEventListener('click', function () { advance(T.typed === T.target); });

  $('redoBtn').addEventListener('click', function () {
    T.typed = '';
    capture.value = '';
    $('nextBtn').disabled = true;
    setHint('Cleared. Start this line again.', '');
    render();
    focusCapture();
  });

  $('backBtn').addEventListener('click', function () {
    Store.saveChapter(T.pid, T.ch.num, T.cs);
    goHome();
  });

  // Clicking anywhere on the typing card puts the cursor back.
  $('screen-type').addEventListener('mousedown', function (e) {
    if (e.target.tagName === 'BUTTON') return;
    setTimeout(focusCapture, 0);
  });

  /* ---------------------------------------------------------
     9. Chapter complete
     --------------------------------------------------------- */

  function finishChapter() {
    var cs = T.cs, ch = T.ch;
    // Badge the same number the child is shown, so a screen reading
    // "98%" can never come back with a Silver medal.
    var acc = Math.round(accuracyOf(cs));
    var key = badgeFor(acc);

    cs.completed = true;
    cs.runs++;
    if (cs.bestAcc === null || acc > cs.bestAcc) { cs.bestAcc = acc; }
    if (!cs.badge || BADGES[key].rank > BADGES[cs.badge].rank) { cs.badge = key; }
    Store.saveChapter(T.pid, ch.num, cs);

    var b = BADGES[key];
    $('doneTitle').textContent = ch.title;
    $('medalDisc').className = 'medal-disc bg-' + b.cls;
    $('medalGlyph').innerHTML = '★';
    $('medalName').textContent = b.label;
    $('medalName').className = 'medal-name n-' + b.cls;
    $('doneMsg').textContent = b.msg;

    $('rAcc').textContent = acc + '%';
    $('rWpm').textContent = Math.round(wpmOf(cs));
    $('rTime').textContent = mmss(cs.timeMs);
    $('rErr').textContent = cs.errors;
    $('rVerses').textContent = ch.verseCount;
    $('rChars').textContent = cs.correct;

    var isLast = ch.num >= 7;
    $('doneNextBtn').textContent = isLast ? 'Back to chapters' : 'Next chapter →';

    show('screen-done');
    Sound.fanfare();
    confetti();
  }

  function confetti() {
    var box = $('confetti');
    box.innerHTML = '';
    var colors = ['#5b4bd6', '#ffd766', '#17915f', '#f08a8a', '#7a5ce0', '#4bc4d6'];
    for (var i = 0; i < 44; i++) {
      var d = document.createElement('i');
      d.style.left = (Math.random() * 100) + '%';
      d.style.background = colors[i % colors.length];
      d.style.animationDuration = (2.4 + Math.random() * 2) + 's';
      d.style.animationDelay = (Math.random() * 1.4) + 's';
      box.appendChild(d);
    }
    setTimeout(function () { box.innerHTML = ''; }, 6000);
  }

  $('againBtn').addEventListener('click', function () { openChapter(T.ch.num); });

  $('doneNextBtn').addEventListener('click', function () {
    if (T.ch.num >= 7) { goHome(); return; }
    openChapter(T.ch.num + 1);
  });

  /* ---------------------------------------------------------
     10. Boot
     --------------------------------------------------------- */

  paintSettings();
  Sound.setSfx(settings.sfx);

  // The browser will not let music start before the first click,
  // so if it was left on, kick it off at the first interaction.
  if (settings.bgm) {
    var startOnce = function () {
      Sound.setBgm(true);
      document.removeEventListener('click', startOnce);
      document.removeEventListener('keydown', startOnce);
    };
    document.addEventListener('click', startOnce);
    document.addEventListener('keydown', startOnce);
  }

  if (Store.active()) { goHome(); } else { paintWelcome(); }

})();
