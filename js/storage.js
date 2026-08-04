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
      settings: { sfx: true, bgm: false, bgmTrack: 'stream' },
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
      bgmTrack: typeof s.bgmTrack === 'string' ? s.bgmTrack : 'stream'
    };
  }

  function saveSettings(s) {
    var d = read();
    d.settings = {
      sfx: !!s.sfx,
      bgm: !!s.bgm,
      bgmTrack: typeof s.bgmTrack === 'string' ? s.bgmTrack : 'stream'
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
    resetProfile: resetProfile,
    settings: settings,
    saveSettings: saveSettings,
    isMemoryOnly: function () { return memoryOnly; }
  };
})();
