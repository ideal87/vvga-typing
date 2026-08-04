/* ============================================================
   Avatars - ten little Bible people a camper can pick as their
   picture. Drawn as inline SVG so there is nothing to download
   and nothing to keep in step on the USB stick.

   Every figure is built on the same 64x64 body so they sit
   together neatly: robe, head, face, then one prop that says who
   the person is (Esther's crown, David's harp, Noah's dove...).
   ============================================================ */

window.Avatars = (function () {
  'use strict';

  var INK = '#3b2a22';       // eyes and smile
  var BLUSH = '#ff9d9d';

  function face(o) {
    var y = o.eyeY || 31;
    return '<circle cx="26.5" cy="' + y + '" r="1.9" fill="' + INK + '"/>' +
           '<circle cx="37.5" cy="' + y + '" r="1.9" fill="' + INK + '"/>' +
           '<circle cx="21.5" cy="' + (y + 4) + '" r="2.8" fill="' + BLUSH + '" opacity=".5"/>' +
           '<circle cx="42.5" cy="' + (y + 4) + '" r="2.8" fill="' + BLUSH + '" opacity=".5"/>' +
           '<path d="M27.5 ' + (y + 5.5) + 'q4.5 4 9 0" fill="none" stroke="' + INK +
             '" stroke-width="2" stroke-linecap="round"/>';
  }

  // Upper half of the head: the plain "cap" of hair most of the
  // figures wear.
  function cap(colour) {
    return '<path d="M18 27a14 14 0 0 1 28 0z" fill="' + colour + '"/>';
  }

  // Head-shaped blob that pokes out around the face: long hair,
  // or the drape of a head covering.
  function longHair(colour) {
    return '<rect x="17" y="13" width="30" height="37" rx="15" fill="' + colour + '"/>';
  }

  function figure(o) {
    return '<svg class="av-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<path d="M32 42c-9 0-15 6-15 15v7h30v-7c0-9-6-15-15-15Z" fill="' + o.robe + '"/>' +
      (o.coat || '') +
      (o.back || '') +
      '<circle cx="32" cy="29" r="14" fill="' + o.skin + '"/>' +
      (o.front || '') +
      face(o) +
      (o.prop || '') +
      '</svg>';
  }

  /* ---------------- the ten ---------------- */

  var PEOPLE = [
    /* ----- girls ----- */
    {
      id: 'esther', name: 'Esther', gender: 'girl',
      note: 'the brave queen',
      art: {
        skin: '#eab894', robe: '#7a5ce0',
        back: longHair('#3a2418'),
        front: cap('#3a2418'),
        prop: '<path d="M21 16l1.5-9 5 5 4.5-7 4.5 7 5-5L43 16z" fill="#ffd766" ' +
              'stroke="#dfa100" stroke-width="1.2" stroke-linejoin="round"/>' +
              '<circle cx="32" cy="12" r="1.7" fill="#e0533f"/>'
      }
    },
    {
      id: 'ruth', name: 'Ruth', gender: 'girl',
      note: 'gathered the harvest',
      art: {
        skin: '#d99a6c', robe: '#c98b3a',
        back: longHair('#5a2f18'),
        front: cap('#5a2f18'),
        prop: '<path d="M52 64V44" stroke="#b9822c" stroke-width="2" stroke-linecap="round"/>' +
              '<g fill="#e8b74f">' +
              '<ellipse cx="52" cy="40.5" rx="2.2" ry="3.6"/>' +
              '<ellipse cx="48.4" cy="45" rx="2" ry="3.2" transform="rotate(-32 48.4 45)"/>' +
              '<ellipse cx="55.6" cy="45" rx="2" ry="3.2" transform="rotate(32 55.6 45)"/>' +
              '<ellipse cx="48.4" cy="51" rx="2" ry="3.2" transform="rotate(-32 48.4 51)"/>' +
              '<ellipse cx="55.6" cy="51" rx="2" ry="3.2" transform="rotate(32 55.6 51)"/>' +
              '</g>'
      }
    },
    {
      id: 'mary', name: 'Mary', gender: 'girl',
      note: 'mother of Jesus',
      art: {
        skin: '#eab894', robe: '#8ea7e8',
        back: '<path d="M32 12c-11 0-19 9-19 20 0 8 2 14 2 14l7-2c-2-4-3-8-3-12 0-8 5-14 13-14' +
              's13 6 13 14c0 4-1 8-3 12l7 2s2-6 2-14c0-11-8-20-19-20z" fill="#4b6fd6"/>',
        front: '<path d="M18 28a14 14 0 0 1 28 0c0-3-2-8-14-8s-14 5-14 8z" fill="#3a5ec0"/>'
      }
    },
    {
      id: 'deborah', name: 'Deborah', gender: 'girl',
      note: 'judge under the palm',
      art: {
        skin: '#c07b4e', robe: '#2f8f6b',
        back: longHair('#241610'),
        front: cap('#241610'),
        prop: '<path d="M51 64V45" stroke="#3f7a4f" stroke-width="2" stroke-linecap="round"/>' +
              '<path d="M51 46c-6-1-9-4-10-8 5 0 9 3 10 8z" fill="#37b07a"/>' +
              '<path d="M51 46c6-1 9-4 10-8-5 0-9 3-10 8z" fill="#2f9e6b"/>' +
              '<path d="M51 44c-3-5-3-9-1-13 3 4 4 8 1 13z" fill="#45c489"/>'
      }
    },
    {
      id: 'miriam', name: 'Miriam', gender: 'girl',
      note: 'sang with a tambourine',
      art: {
        skin: '#f6d3b4', robe: '#e2698f',
        back: longHair('#7a4a22'),
        front: cap('#7a4a22'),
        prop: '<circle cx="51" cy="50" r="8" fill="#fff6e2" stroke="#d9a441" stroke-width="3"/>' +
              '<circle cx="51" cy="42" r="1.7" fill="#ffd766"/>' +
              '<circle cx="59" cy="50" r="1.7" fill="#ffd766"/>' +
              '<circle cx="51" cy="58" r="1.7" fill="#ffd766"/>' +
              '<circle cx="43" cy="50" r="1.7" fill="#ffd766"/>'
      }
    },

    /* ----- boys ----- */
    {
      id: 'david', name: 'David', gender: 'boy',
      note: 'shepherd with a harp',
      art: {
        skin: '#f6d3b4', robe: '#4aa3c9',
        front: cap('#a8642a'),
        prop: '<path d="M46 63c0-11 4-17 11-19" fill="none" stroke="#c98b3a" ' +
              'stroke-width="3" stroke-linecap="round"/>' +
              '<path d="M46 63h11" stroke="#c98b3a" stroke-width="3" stroke-linecap="round"/>' +
              '<g stroke="#ffe9b0" stroke-width="1">' +
              '<path d="M49 61v-8"/><path d="M52 61v-11"/><path d="M55 61v-14"/></g>'
      }
    },
    {
      id: 'moses', name: 'Moses', gender: 'boy',
      note: 'led the people out',
      art: {
        skin: '#d99a6c', robe: '#b06a3b',
        front: cap('#dfe0e8') +
               '<path d="M23 38c1 7 5 11 9 11s8-4 9-11c-3 2-6 3-9 3s-6-1-9-3z" fill="#eceef5"/>',
        prop: '<path d="M53 64V38c0-4 5-4 5 0" fill="none" stroke="#8a6236" ' +
              'stroke-width="3" stroke-linecap="round"/>' +
              '<path d="M6 46h10v14H6z" fill="#cfd4e6" stroke="#a7aec8" stroke-width="1.2"/>' +
              '<g stroke="#8d92ad" stroke-width="1"><path d="M8 50h6"/><path d="M8 53h6"/>' +
              '<path d="M8 56h6"/></g>'
      }
    },
    {
      id: 'noah', name: 'Noah', gender: 'boy',
      note: 'built the ark',
      art: {
        skin: '#eab894', robe: '#3f8f8f',
        front: cap('#8d92ad') +
               '<path d="M23 38c1 7 5 11 9 11s8-4 9-11c-3 2-6 3-9 3s-6-1-9-3z" fill="#c9ccdb"/>',
        prop: '<ellipse cx="50" cy="22" rx="6.5" ry="4.5" fill="#ffffff"/>' +
              '<circle cx="55.5" cy="18.5" r="3.2" fill="#ffffff"/>' +
              '<path d="M58.4 18l3 1-3 1z" fill="#e8a33c"/>' +
              '<circle cx="56.3" cy="17.8" r=".9" fill="' + INK + '"/>' +
              '<path d="M47 21c2-4 6-4 7.5 0-3 2-5.5 2-7.5 0z" fill="#e8ecfb"/>' +
              '<path d="M48 27q3 4 7 3" fill="none" stroke="#3f9a6b" stroke-width="1.6" ' +
              'stroke-linecap="round"/><circle cx="55" cy="30" r="1.6" fill="#37b07a"/>'
      }
    },
    {
      id: 'daniel', name: 'Daniel', gender: 'boy',
      note: 'prayed with the lions',
      art: {
        skin: '#8d5524', robe: '#5b6fd6',
        front: cap('#1d1410'),
        prop: '<circle cx="46.5" cy="46.5" r="2.6" fill="#c98b3a"/>' +
              '<circle cx="55.5" cy="46.5" r="2.6" fill="#c98b3a"/>' +
              '<circle cx="51" cy="51" r="8.5" fill="#e0a94b"/>' +
              '<circle cx="51" cy="51.5" r="5.6" fill="#f5cf82"/>' +
              '<circle cx="48.8" cy="50" r="1.2" fill="#5a3b1e"/>' +
              '<circle cx="53.2" cy="50" r="1.2" fill="#5a3b1e"/>' +
              '<path d="M51 53l-1.6 1.9h3.2z" fill="#8a5a2b"/>' +
              '<path d="M51 55q-2 2-3.4.4M51 55q2 2 3.4.4" fill="none" stroke="#8a5a2b" ' +
              'stroke-width="1.1" stroke-linecap="round"/>'
      }
    },
    {
      id: 'joseph', name: 'Joseph', gender: 'boy',
      note: 'the colourful coat',
      art: {
        skin: '#c07b4e', robe: '#2f8f6b',
        coat: '<rect x="22" y="46" width="20" height="4" fill="#ffd766"/>' +
              '<rect x="19" y="52" width="26" height="4" fill="#e05a3f"/>' +
              '<rect x="18" y="58" width="28" height="4" fill="#3f9ad6"/>',
        front: cap('#3a2418')
      }
    }
  ];

  /* ---------------- lookup ---------------- */

  var BY_ID = {};
  for (var i = 0; i < PEOPLE.length; i++) {
    PEOPLE[i].svg = figure(PEOPLE[i].art);
    BY_ID[PEOPLE[i].id] = PEOPLE[i];
  }

  function forGender(g) {
    var out = [];
    for (var i = 0; i < PEOPLE.length; i++) {
      if (PEOPLE[i].gender === g) out.push(PEOPLE[i]);
    }
    return out;
  }

  function byId(id) {
    return (id && BY_ID[id]) || null;
  }

  /** Markup for one camper's picture. Campers made before avatars
      existed have no id saved, so they keep their letter. */
  function svgFor(id) {
    var p = byId(id);
    return p ? p.svg : null;
  }

  return {
    all: PEOPLE,
    forGender: forGender,
    byId: byId,
    svgFor: svgFor
  };
})();
