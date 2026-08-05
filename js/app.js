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

  /* Every passage, keyed by the id in the data file - which is also
     the key its progress is filed under, so these must not be renamed
     once a camp has started.

     `set` is which row of the home screen it belongs to: the Sermon on
     the Mount is the course everybody types, and "more" is the shelf
     that opens up once they have earned it. */
  var MOUNT = 'mount', MORE = 'more';

  var PASSAGE_INFO = {
    '5':     { set: MOUNT, theme: 'The Beatitudes' },
    '6':     { set: MOUNT, theme: "The Lord's Prayer" },
    '7':     { set: MOUNT, theme: 'Ask, Seek, Knock' },
    'ps145': { set: MORE,  theme: 'A song of praise' },
    'gen1':  { set: MORE,  theme: 'In the beginning' },
    'eph6':  { set: MORE,  theme: 'The armour of God' },
    'ps139': { set: MORE,  theme: 'Wonderfully made' },
    'rom8':  { set: MORE,  theme: 'More than conquerors' }
  };

  // What it takes to open the second row.
  var UNLOCK_BADGE = 'silver';

  // Stamped onto every saved chapter so we can tell a place kept
  // against this text from a place kept against an older one.
  // Bump it whenever the wording in the data file changes.
  var TEXT_VER = 'bsb1';

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
      var info = PASSAGE_INFO[ch.id] || { set: MORE, theme: '' };
      out.push({
        id: ch.id,
        title: ch.ref,
        set: info.set,
        theme: info.theme,
        verseCount: ch.verses.length,
        segs: segs
      });
    }
    return out;
  }

  var CHAPTERS = buildChapters(window.BIBLE_DATA);

  function chapterById(id) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].id === id) return CHAPTERS[i];
    }
    return null;
  }

  function chaptersIn(set) {
    var out = [];
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].set === set) out.push(CHAPTERS[i]);
    }
    return out;
  }

  /* ---------------------------------------------------------
     2. Badges
     --------------------------------------------------------- */

  var BADGES = {
    gold:   { rank: 4, label: 'Gold',   cls: 'gold',   msg: 'Almost perfect. That is beautifully careful work.' },
    silver: { rank: 3, label: 'Silver', cls: 'silver', msg: 'Excellent accuracy — so close to gold!' },
    bronze: { rank: 2, label: 'Bronze', cls: 'bronze', msg: 'Well done. Steady hands and a careful eye.' },
    pearl:  { rank: 1, label: 'Pearl',  cls: 'pearl',  msg: 'You typed the whole chapter — that is the hard part. Try it again and 85% earns you Bronze.' }
  };

  // Pearl has no threshold on purpose: finishing a whole chapter is
  // the hard part, so it always earns something.
  function badgeFor(acc) {
    if (acc >= 95) return 'gold';
    if (acc >= 90) return 'silver';
    if (acc >= 85) return 'bronze';
    return 'pearl';
  }

  /* ---- what opens the second row ----

     Every chapter of the Sermon on the Mount finished, none of them
     below Silver. Finishing is not enough on its own: the point of the
     extra passages is that they are earned by careful work, and Silver
     is 90% under the current ladder. */

  function meetsUnlock(cs) {
    return !!(cs.completed && cs.badge && BADGES[cs.badge] &&
              BADGES[cs.badge].rank >= BADGES[UNLOCK_BADGE].rank);
  }

  /** How many chapters of the Sermon are already up to standard, and
      whether that is all of them. Wants a profile id. */
  function unlockState(pid) {
    var mount = chaptersIn(MOUNT), ready = 0;
    for (var i = 0; i < mount.length; i++) {
      if (meetsUnlock(Store.chapter(pid, mount[i].id))) ready++;
    }
    return { ready: ready, total: mount.length, open: ready === mount.length };
  }

  function isOpen(ch, pid) {
    return ch.set === MOUNT || unlockState(pid).open;
  }

  /* ---- catching up the campers who typed under the old rules ----

     Everything above changed after camp had already started: mending a
     typo now earns half its penalty back, and the badges sit five
     points lower. Campers part-way through were left holding scores
     that no longer mean the same thing as the ones beside them on the
     board, through no fault of their own.

     So their saved bests are revised once, as though they had gone
     back and mended every mistake they ever made. Since a mend returns
     half of what a typo took, "all of them mended" works out to
     exactly half the distance back to 100 - a 90% becomes 95% - and
     the badge is then read off the new thresholds.

     Bump SCORE_VER only if the scoring rules move again. */
  var SCORE_VER = 2;

  function asIfAllMended(acc) {
    return Math.min(Math.round((100 + acc) / 2), 100);
  }

  Store.rescoreOnce(SCORE_VER, function (cs) {
    var out = null;

    if (typeof cs.bestAcc === 'number') {
      var revised = asIfAllMended(cs.bestAcc);
      var badge = badgeFor(revised);
      // Belt and braces: a revision must never demote anybody.
      if (cs.badge && BADGES[cs.badge] && BADGES[badge].rank < BADGES[cs.badge].rank) {
        badge = cs.badge;
      }
      out = { bestAcc: revised, badge: badge };
    }

    // A chapter they are still in the middle of gets the same benefit,
    // so the live number on the typing screen does not read lower than
    // the best they have just been credited with.
    if (cs.errors > 0 && !cs.fixed) {
      out = out || {};
      out.fixed = cs.errors;
    }

    return out;
  });

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

  /** A camper's picture: their Bible person if they picked one,
      otherwise the first letter of their name. Campers created
      before the pictures existed keep their letter and lose
      nothing. */
  function avatarHtml(p, cls) {
    var art = window.Avatars ? Avatars.svgFor(p.avatar) : null;
    return '<span class="' + cls + (art ? ' has-art' : '') + '">' +
           (art || esc(initial(p.name))) + '</span>';
  }

  function paintChipAvatar(p) {
    var art = window.Avatars ? Avatars.svgFor(p.avatar) : null;
    var el = $('chipAvatar');
    el.className = 'chip-avatar' + (art ? ' has-art' : '');
    if (art) { el.innerHTML = art; } else { el.textContent = initial(p.name); }
  }

  function pct(n) { return Math.round(n); }

  function mmss(ms) {
    var s = Math.round(ms / 1000);
    var m = Math.floor(s / 60);
    return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  /* How much of a typo is forgiven once the camper goes back and
     repairs it. Half: fixing a mistake should clearly beat leaving
     it, without making mistakes free. */
  var FIX_CREDIT = 0.5;

  /* Accuracy, with one deliberate soft spot. Under the plain sum a
     wrong letter was banked forever, so a child who spotted their own
     mistake and mended it scored no better than one who shrugged and
     carried on - and noticing your own mistakes is the whole habit we
     are trying to build. A repaired typo now costs half.

     It cannot climb over 100%: the credit given back is at most half
     of what was taken away. */
  function accuracyOf(cs) {
    if (!cs.keystrokes) return 100;
    var forgiven = (cs.fixed || 0) * FIX_CREDIT;
    return Math.min(((cs.correct + forgiven) / cs.keystrokes) * 100, 100);
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

  /* Colour themes. The id is what goes on <html data-theme>, which is
     where css/style.css picks the palette up; 'violet' is the original
     and needs no attribute at all. The swatch is the bright colour the
     camper is really choosing - see the note in the stylesheet for why
     the top bar itself uses a deeper relative of it. */
  var THEMES = [
    { id: 'violet', name: 'Purple', swatch: '#5b4bd6' },
    { id: 'green',  name: 'Green',  swatch: '#4bd65f' },
    { id: 'pink',   name: 'Pink',   swatch: '#ff7bb0' },
    { id: 'blue',   name: 'Blue',   swatch: '#5cc6e8' }
  ];

  function knownTheme(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return id;
    }
    return THEMES[0].id;
  }

  function applyTheme(id) {
    var el = document.documentElement;
    if (id === THEMES[0].id) { el.removeAttribute('data-theme'); }
    else { el.setAttribute('data-theme', id); }
  }

  function paintThemes() {
    var sel = $('themePick');
    sel.innerHTML = '';
    for (var i = 0; i < THEMES.length; i++) {
      var o = document.createElement('option');
      o.value = THEMES[i].id;
      // The dot gives them the colour itself, not just its name.
      o.textContent = '● ' + THEMES[i].name;
      o.style.color = THEMES[i].swatch;
      sel.appendChild(o);
    }
    settings.theme = knownTheme(settings.theme);
    sel.value = settings.theme;
  }

  $('themePick').addEventListener('change', function () {
    settings.theme = knownTheme(this.value);
    applyTheme(settings.theme);
    Store.saveSettings(settings);
    Sound.unlock();
    Sound.blip();
  });

  // Fill the tune menu from whatever loops audio.js offers, so
  // adding a fourth one there needs no change here.
  function paintTracks() {
    var sel = $('bgmTrack');
    var list = Sound.tracks();
    var known = false;
    sel.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var o = document.createElement('option');
      o.value = list[i].id;
      o.textContent = list[i].name;
      sel.appendChild(o);
      if (list[i].id === settings.bgmTrack) known = true;
    }
    if (!known) { settings.bgmTrack = list[0].id; }
  }

  function paintSettings() {
    $('sfxBtn').setAttribute('aria-pressed', settings.sfx ? 'true' : 'false');
    $('bgmBtn').setAttribute('aria-pressed', settings.bgm ? 'true' : 'false');
    $('sfxGlyph').innerHTML = settings.sfx ? '&#128266;' : '&#128263;';
    $('bgmTrack').value = settings.bgmTrack;
    $('themePick').value = settings.theme;
  }

  function applySettings() {
    Sound.setSfx(settings.sfx);
    Sound.setTrack(settings.bgmTrack);
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

  // Choosing a tune is also how you turn the music on - a child who
  // picks "Happy Praise" expects to hear it, not to hunt for a
  // second switch.
  $('bgmTrack').addEventListener('change', function () {
    Sound.unlock();
    settings.bgmTrack = this.value;
    settings.bgm = true;
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
          avatarHtml(p, 'camper-avatar') +
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
    // Some browsers put the old answers back after a refresh, so
    // match the pictures to whatever the form is actually showing.
    syncAvatars();
    show('screen-welcome');
  }

  /* ---- picking a Bible person ---- */

  var chosenAvatar = null;

  function pickAvatar(id) {
    chosenAvatar = id;
    var btns = $('fAvatar').getElementsByClassName('avatar-pick');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-av') === id;
      btns[i].className = 'avatar-pick' + (on ? ' on' : '');
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  // The five girls or the five boys, depending on the answer above.
  // The first is selected straight away so nobody can get stuck on
  // a question they did not notice.
  function paintAvatars(gender) {
    var box = $('fAvatar');
    var list = Avatars.forGender(gender);
    box.innerHTML = '';

    for (var i = 0; i < list.length; i++) {
      (function (a) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'avatar-pick';
        b.setAttribute('data-av', a.id);
        b.setAttribute('aria-pressed', 'false');
        b.title = a.name + ' — ' + a.note;
        b.innerHTML = '<span class="avatar-art">' + a.svg + '</span>' +
                      '<span class="avatar-name">' + esc(a.name) + '</span>';
        b.addEventListener('click', function () { pickAvatar(a.id); Sound.blip(); });
        box.appendChild(b);
      })(list[i]);
    }

    $('avatarField').hidden = false;
    if (list.length) pickAvatar(list[0].id);
  }

  function clearAvatars() {
    chosenAvatar = null;
    $('fAvatar').innerHTML = '';
    $('avatarField').hidden = true;
  }

  /* Show the five pictures that match whichever answer is ticked.
     This reads the form rather than the click that changed it: a
     child who presses Back and comes in again leaves Girl still
     ticked, and clicking Girl a second time fires no change event -
     which used to strand them with no pictures and no way to get
     them back. */
  function syncAvatars() {
    var g = document.querySelector('#fGender input:checked');
    if (g) { paintAvatars(g.value); } else { clearAvatars(); }
  }

  (function () {
    var radios = document.querySelectorAll('#fGender input');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function () {
        Sound.unlock();
        syncAvatars();
      });
    }
  })();

  $('newCamperBtn').addEventListener('click', function () {
    Sound.unlock();
    $('pickWrap').hidden = true;
    $('newCamperForm').hidden = false;
    $('formError').hidden = true;
    // A fresh camper gets a blank form, not the leftovers of the
    // one before them.
    $('newCamperForm').reset();
    syncAvatars();
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
    if (!chosenAvatar) { return fail('Please pick a picture for yourself.'); }

    err.hidden = true;
    Store.create(name, age, genderEl.value, chosenAvatar);
    $('newCamperForm').reset();
    clearAvatars();
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

  /* The scripture text can change between camps - a new translation,
     a corrected typo. A saved "line 14 of 62" was counted against the
     old wording, so replaying it would drop the camper into the wrong
     verse. When the stamp does not match we rewind the unfinished run
     to the top of its chapter and keep everything that was earned:
     badges, best accuracy, completed chapters, run count. */
  function loadChapterState(pid, ch) {
    var cs = Store.chapter(pid, ch.id);
    if (cs.txt === TEXT_VER) return cs;

    if (cs.seg > 0) {
      cs.seg = 0;
      cs.keystrokes = 0;
      cs.correct = 0;
      cs.errors = 0;
      cs.fixed = 0;
      cs.timeMs = 0;
      cs.verses = 0;
    }
    cs.txt = TEXT_VER;
    Store.saveChapter(pid, ch.id, cs);
    return cs;
  }

  // Leaving the typing screen by any route keeps the tallies and the
  // place in the chapter.
  function saveCurrentRun() {
    if (T.ch && T.pid && !$('screen-type').hidden) {
      Store.saveChapter(T.pid, T.ch.id, T.cs);
    }
  }

  // The one-line summary under a card: where they are, or how they did.
  function progressNote(cs, total) {
    if (cs.seg > 0 && cs.seg < total) return 'Line ' + (cs.seg + 1) + ' of ' + total;
    if (cs.completed) return 'Best ' + pct(cs.bestAcc) + '% · ' + BADGES[cs.badge].label;
    return 'Not started yet';
  }

  function percentDone(cs, total) {
    var running = cs.seg > 0 && cs.seg < total;
    return cs.completed && !running ? 100 : Math.round((cs.seg / total) * 100);
  }

  function goHome() {
    saveCurrentRun();
    var p = Store.active();
    if (!p) { paintWelcome(); return; }

    $('chipName').textContent = p.name;
    paintChipAvatar(p);
    $('greetName').textContent = 'Shalom, ' + p.name + '!';

    var lock = unlockState(p.id);
    $('greetSub').textContent = lock.open
      ? 'The whole shelf is open to you. Pick anything below.'
      : 'Pick a chapter and start typing. Your place is saved automatically.';

    paintMount(p);
    paintMore(p, lock);
    paintShelf(p);
    paintBoard(p);
    show('screen-home');
  }

  function paintMount(p) {
    var grid = $('chapterGrid'), list = chaptersIn(MOUNT);
    grid.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      (function (ch, n) {
        var cs = loadChapterState(p.id, ch);
        var total = ch.segs.length;
        var percent = percentDone(cs, total);

        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'chapter-card';
        card.innerHTML =
          (cs.badge ? '<span class="card-badge bg-' + cs.badge + '">★</span>' : '') +
          '<div class="chapter-num">Chapter ' + n + '</div>' +
          '<div class="chapter-name">' + esc(ch.title) + '</div>' +
          '<div class="chapter-sub">' + esc(ch.theme) + ' · ' + ch.verseCount + ' verses</div>' +
          '<div class="ring-row">' + ringSvg(percent) +
            '<div><div class="ring-pct">' + percent + '%</div>' +
            '<div class="ring-note">' + esc(progressNote(cs, total)) + '</div></div>' +
          '</div>';
        card.addEventListener('click', function () { openChapter(ch.id); });
        grid.appendChild(card);
      })(list[i], i + 5);
    }
  }

  /* The second row. Locked tiles are shown rather than hidden: a shelf
     you can see is something to aim at, and a row that appears out of
     nowhere is just confusing. */
  function paintMore(p, lock) {
    var grid = $('moreGrid'), list = chaptersIn(MORE);
    grid.innerHTML = '';

    $('moreNote').textContent = lock.open
      ? 'Unlocked — well done'
      : 'Silver or better on all three chapters above (' +
        lock.ready + ' of ' + lock.total + ' so far)';
    $('moreWrap').className = 'more-wrap' + (lock.open ? '' : ' is-locked');

    for (var i = 0; i < list.length; i++) {
      (function (ch) {
        var tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'tile';

        if (!lock.open) {
          tile.disabled = true;
          tile.className += ' locked';
          tile.title = 'Earn Silver on Matthew 5, 6 and 7 to open this';
          tile.innerHTML =
            '<span class="tile-lock" aria-hidden="true">&#128274;</span>' +
            '<span class="tile-name">' + esc(ch.title) + '</span>' +
            '<span class="tile-sub">Locked</span>';
        } else {
          var cs = loadChapterState(p.id, ch);
          var total = ch.segs.length;
          tile.innerHTML =
            (cs.badge ? '<span class="tile-badge bg-' + cs.badge + '">★</span>' : '') +
            '<span class="tile-name">' + esc(ch.title) + '</span>' +
            '<span class="tile-sub">' + esc(ch.theme) + '</span>' +
            '<span class="tile-note">' + esc(progressNote(cs, total)) + '</span>';
          tile.addEventListener('click', function () { openChapter(ch.id); });
        }
        grid.appendChild(tile);
      })(list[i]);
    }
  }

  /* The shelf shows the three Sermon chapters always, and any extra
     passage they have actually earned a badge on - so it grows with
     them instead of opening as a wall of question marks. */
  function paintShelf(p) {
    var shelf = $('badgeShelf');
    shelf.innerHTML = '';
    for (var i = 0; i < CHAPTERS.length; i++) {
      var ch = CHAPTERS[i];
      var cs = Store.chapter(p.id, ch.id);
      if (ch.set !== MOUNT && !cs.badge) continue;

      var item = document.createElement('div');
      item.className = 'shelf-item';
      item.innerHTML = cs.badge
        ? '<div class="shelf-disc bg-' + cs.badge + '">★</div>' +
          '<div class="shelf-label">' + esc(shortRef(ch)) + ' · ' + BADGES[cs.badge].label + '</div>'
        : '<div class="shelf-disc empty">?</div>' +
          '<div class="shelf-label">' + esc(shortRef(ch)) + '</div>';
      shelf.appendChild(item);
    }
  }

  // "Matthew 5" is too wide for a 46px disc; "Mt 5" is not.
  function shortRef(ch) {
    return ch.title
      .replace('Matthew ', 'Mt ')
      .replace('Genesis ', 'Gen ')
      .replace('Ephesians ', 'Eph ')
      .replace('Romans ', 'Rom ')
      .replace('Psalm ', 'Ps ');
  }

  function paintBoard(me) {
    var list = Store.all();
    var rows = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i], sum = 0, n = 0;
      for (var j = 0; j < CHAPTERS.length; j++) {
        var cs = Store.chapter(p.id, CHAPTERS[j].id);
        if (cs.completed && cs.bestAcc !== null) { sum += cs.bestAcc; n++; }
      }
      // Out of what is open to them, so a camper who has not unlocked
      // the extra passages is not shown as 3 out of 8.
      var outOf = unlockState(p.id).open ? CHAPTERS.length : chaptersIn(MOUNT).length;
      if (n > 0) {
        rows.push({ name: p.name, id: p.id, avatar: p.avatar,
                    avg: sum / n, done: n, outOf: outOf });
      }
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
        avatarHtml(rows[r], 'board-avatar') +
        '<span class="who' + (rows[r].id === me.id ? ' me' : '') + '">' + esc(rows[r].name) + '</span>' +
        '<span class="done">' + rows[r].done + '/' + rows[r].outOf + '</span>' +
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
    bad: {},        // slots in this line that were once typed wrong
    lastAt: 0,      // timestamp of previous keystroke, for active-time
    locked: false   // true while the finish animation plays
  };

  var capture = $('capture');

  function openChapter(id) {
    var p = Store.active();
    if (!p) { paintWelcome(); return; }

    var ch = chapterById(id);
    // Nothing should route here while a passage is still locked, but
    // an old bookmark or a stale click must not sneak past the gate.
    if (!ch || !isOpen(ch, p.id)) { goHome(); return; }

    var cs = loadChapterState(p.id, ch);

    // Finished last time? Start a clean run.
    if (cs.seg >= ch.segs.length) {
      var keep = { bestAcc: cs.bestAcc, badge: cs.badge, runs: cs.runs, completed: cs.completed };
      cs = Store.blankChapter();
      cs.bestAcc = keep.bestAcc;
      cs.badge = keep.badge;
      cs.runs = keep.runs;
      cs.completed = keep.completed;
      cs.txt = TEXT_VER;
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
    // Which letters of THIS line went wrong. Cleared with the line,
    // so a repair only ever counts against the mistake it repairs.
    T.bad = {};
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

      var wrong = false, fixes = 0;
      for (var i = prev.length; i < val.length; i++) {
        T.cs.keystrokes++;
        if (val.charAt(i) === T.target.charAt(i)) {
          T.cs.correct++;
          // Right letter in a slot that had been wrong: they went
          // back and mended it, so hand half the penalty back.
          if (T.bad[i]) { delete T.bad[i]; T.cs.fixed++; fixes++; }
        } else {
          T.cs.errors++;
          T.bad[i] = true;
          wrong = true;
        }
      }
      if (wrong) { Sound.error(); shake(); }
      // Say so, or the leniency is invisible and teaches nothing.
      else if (fixes) { setHint('Good catch! A mistake you mend only counts half.', 'cheer'); }
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
    Store.saveChapter(T.pid, T.ch.id, T.cs);

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
    Store.saveChapter(T.pid, T.ch.id, T.cs);
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
    Store.saveChapter(T.pid, ch.id, cs);

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

    // Finishing this one may have just opened the second row, so work
    // out what comes next only now that the badge is saved.
    var next = nextOpenAfter(ch, T.pid);
    $('doneNextBtn').textContent = next ? 'Next: ' + next.title + ' →' : 'Back to chapters';

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

  /** The next passage in reading order that this camper may open, or
      null if they are at the end of what is available to them. */
  function nextOpenAfter(ch, pid) {
    var seen = false;
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].id === ch.id) { seen = true; continue; }
      if (seen && isOpen(CHAPTERS[i], pid)) return CHAPTERS[i];
    }
    return null;
  }

  $('againBtn').addEventListener('click', function () { openChapter(T.ch.id); });

  $('doneNextBtn').addEventListener('click', function () {
    var next = nextOpenAfter(T.ch, T.pid);
    if (next) { openChapter(next.id); } else { goHome(); }
  });

  /* ---------------------------------------------------------
     10. Boot
     --------------------------------------------------------- */

  paintTracks();
  paintThemes();
  applyTheme(settings.theme);
  paintSettings();
  Sound.setSfx(settings.sfx);
  Sound.setTrack(settings.bgmTrack);

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
