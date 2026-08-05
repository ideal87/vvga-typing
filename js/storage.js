/* ============================================================
   Storage - every camper's progress lives in this browser's
   localStorage. No login, no server. Several kids can share one
   machine; each one picks their name on the welcome screen.

   If localStorage is unavailable (some browsers lock it down for
   pages opened straight off a USB stick) we quietly fall back to
   memory so the app still works for the session.
   ============================================================ */

window.Store = (function () {
  'use strict';

  var KEY = 'bibleTyping.v1';
  var memoryOnly = false;
  var mem = null;

  function blank() {
    return {
      v: 1,
      activeId: null,
      settings: { sfx: true, bgm: false, bgmTrack: 'stream', theme: 'violet' },
      profiles: []
    };
  }

  function read() {
    if (memoryOnly) { return mem || (mem = blank()); }
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return blank();
      var data = JSON.parse(raw);
      if (!data || !data.profiles) return blank();
      return data;
    } catch (e) {
      memoryOnly = true;
      mem = blank();
      return mem;
    }
  }

  function write(data) {
    if (memoryOnly) { mem = data; return; }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      memoryOnly = true;
      mem = data;
    }
  }

  function newId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function blankChapter() {
    return {
      seg: 0,          // which typing segment comes next
      keystrokes: 0,   // letters typed in the current run
      errors: 0,       // wrong letters in the current run
      fixed: 0,        // of those, the ones they went back and mended
      correct: 0,      // correct letters in the current run
      timeMs: 0,       // time actually spent typing
      verses: 0,       // segments finished in the current run
      completed: false,
      bestAcc: null,   // best accuracy ever reached on this chapter
      badge: null,     // best badge ever earned
      runs: 0,
      txt: null        // which scripture text  seg  was counted against
    };
  }

  /* ---------- profiles ---------- */

  function all() { return read().profiles; }

  function active() {
    var d = read();
    if (!d.activeId) return null;
    for (var i = 0; i < d.profiles.length; i++) {
      if (d.profiles[i].id === d.activeId) return d.profiles[i];
    }
    return null;
  }

  function setActive(id) {
    var d = read();
    d.activeId = id;
    write(d);
  }

  function create(name, age, gender, avatar) {
    var d = read();
    var p = {
      id: newId(),
      name: name,
      age: age,
      gender: gender,
      avatar: avatar || null,
      created: Date.now(),
      chapters: {}
    };
    d.profiles.push(p);
    d.activeId = p.id;
    write(d);
    return p;
  }

  function nameTaken(name) {
    var list = read().profiles;
    var wanted = String(name).trim().toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (list[i].name.trim().toLowerCase() === wanted) return true;
    }
    return false;
  }

  /* ---------- chapter progress ---------- */

  function chapter(profileId, ch) {
    var d = read();
    for (var i = 0; i < d.profiles.length; i++) {
      if (d.profiles[i].id === profileId) {
        var c = d.profiles[i].chapters[ch];
        if (!c) return blankChapter();
        // Merge over a blank so older saves gain any new fields.
        var out = blankChapter();
        for (var k in c) { if (Object.prototype.hasOwnProperty.call(c, k)) out[k] = c[k]; }
        return out;
      }
    }
    return blankChapter();
  }

  function saveChapter(profileId, ch, state) {
    var d = read();
    for (var i = 0; i < d.profiles.length; i++) {
      if (d.profiles[i].id === profileId) {
        d.profiles[i].chapters[ch] = state;
        write(d);
        return;
      }
    }
  }

  /* A one-off pass over every saved chapter, for when the scoring
     rules themselves change under a camper's feet.

     `fn` is handed each chapter's saved tallies and returns the fields
     to overwrite, or null to leave it alone. It runs at most once per
     browser: the stamp is written back together with the results, so
     nobody can be handed the same credit twice by reloading. */
  function rescoreOnce(ver, fn) {
    var d = read();
    if ((d.scoreVer || 1) >= ver) return 0;

    var touched = 0;
    for (var i = 0; i < d.profiles.length; i++) {
      var chs = d.profiles[i].chapters || {};
      for (var k in chs) {
        if (!Object.prototype.hasOwnProperty.call(chs, k)) continue;
        var out = fn(chs[k]);
        if (!out) continue;
        for (var f in out) {
          if (Object.prototype.hasOwnProperty.call(out, f)) chs[k][f] = out[f];
        }
        touched++;
      }
    }

    d.scoreVer = ver;
    write(d);
    return touched;
  }

  function resetProfile(profileId) {
    var d = read();
    for (var i = 0; i < d.profiles.length; i++) {
      if (d.profiles[i].id === profileId) {
        d.profiles[i].chapters = {};
        write(d);
        return;
      }
    }
  }

  /* ---------- settings ---------- */

  function settings() {
    var s = read().settings || {};
    return {
      sfx: s.sfx !== false,
      bgm: s.bgm === true,
      // Saved before the extra tunes existed? Fall back to the
      // original loop rather than to nothing.
      bgmTrack: typeof s.bgmTrack === 'string' ? s.bgmTrack : 'stream',
      theme: typeof s.theme === 'string' ? s.theme : 'violet'
    };
  }

  function saveSettings(s) {
    var d = read();
    d.settings = {
      sfx: !!s.sfx,
      bgm: !!s.bgm,
      bgmTrack: typeof s.bgmTrack === 'string' ? s.bgmTrack : 'stream',
      theme: typeof s.theme === 'string' ? s.theme : 'violet'
    };
    write(d);
  }

  return {
    all: all,
    active: active,
    setActive: setActive,
    create: create,
    nameTaken: nameTaken,
    chapter: chapter,
    blankChapter: blankChapter,
    saveChapter: saveChapter,
    rescoreOnce: rescoreOnce,
    resetProfile: resetProfile,
    settings: settings,
    saveSettings: saveSettings,
    isMemoryOnly: function () { return memoryOnly; }
  };
})();
