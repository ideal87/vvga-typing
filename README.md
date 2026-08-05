# VVGA Bible Typing — Sermon on the Mount

A small offline typing site for a kids' camp. Campers type through
**Matthew 5, 6 and 7**, one line at a time, and earn a badge for each
chapter they finish. Careful work opens a second shelf of five more
passages — Psalm 145, Genesis 1, Ephesians 6, Psalm 139 and Romans 8.

No install, no internet, no accounts, no server.

---

## Running it

**Copy the whole folder onto the USB stick, then double-click `index.html`.**

That's it. It opens in the default browser and works with no network
connection. Chrome, Edge and Firefox are all fine.

Keep the folder together — `index.html` needs the `css/` and `js/`
folders sitting next to it.

```
index.html
css/style.css
js/bible-bsb.js     <- all eight passages, the scripture text
js/avatars.js       <- the ten Bible-person pictures
js/audio.js
js/storage.js
js/app.js
```

---

## Publishing to GitHub Pages

Live at **https://ideal87.github.io/vvga-typing/**. It is a plain static
folder, so there is nothing to build — push to `main` and Pages serves
it a minute or two later.

### One step every time you deploy

**Bump the `?v=` number in `index.html`** — it appears five times, once
per `<link>`/`<script>`.

```html
<link rel="stylesheet" href="css/style.css?v=4">
...
<script src="js/app.js?v=4"></script>
```

GitHub Pages tells every browser to keep every file for ten minutes
(`Cache-Control: max-age=600`) and does not let you change that. Without
the bump, a returning camper can end up running the **new `index.html`
against the old scripts**, which is worse than an obvious break — the
page half works. The tune menu comes up empty and the pictures never
appear, with nothing in the console to explain it. Changing the number
gives the scripts new addresses, so the HTML and its scripts always
arrive as a matched pair.

The query string is ignored when the folder is opened straight off the
USB stick, so it costs the offline copy nothing. (Verified in both
Chrome and Firefox on `file://`.)

### Checking a deploy right away

Your own browser will hold the old files for up to ten minutes.
**Ctrl+F5** (Cmd+Shift+R on a Mac), or a private window, shows you what
has actually shipped.

### Progress does not travel between the two copies

Browsers file this kind of storage under the address it came from, so
the Pages copy and a USB copy keep entirely separate progress. Pick one
for the camp and stay on it.

---

## How it works for a camper

1. **Welcome screen** — they tap their name, or press *I'm new here* and
   enter name, age and whether they're a girl or a boy, then pick a
   Bible person as their picture.
2. **Chapter screen** — three cards, one per chapter of the Sermon,
   each showing how far they've got and which badge they've earned,
   with the locked second row underneath.
3. **Typing screen** — one line of scripture at a time. Correct letters
   turn green, wrong ones turn red, and a soft *thunk* plays on a
   mistake. What they are actually typing is echoed underneath the verse
   so they can see their own work.
4. **Chapter complete** — confetti, a medal, and their stats.

### Mistakes don't trap anyone

A wrong letter is coloured red and counted, but it never blocks. Once
the line is full length the **Next →** button lights up, so a child who
can't find their mistake can still move on. *Clear this line* wipes the
current line to start it over.

### Badges

Awarded on the accuracy for that run of the chapter:

| Accuracy | Badge |
|---|---|
| 95% and up | **Gold** |
| 90–94% | **Silver** |
| 85–89% | **Bronze** |
| anything less | **Pearl** (white) |

Pearl has no threshold on purpose. Typing all 58 lines of Matthew 5 is
the hard part, so finishing always earns something — there is no way to
complete a chapter and come away with an empty slot on the shelf.

Their best badge for each chapter is kept, so typing a chapter again can
only improve it, never lose it.

### More to type

Below the three chapter cards sits a row of five small tiles:

| Passage | |
|---|---|
| **Psalm 145** | A song of praise |
| **Genesis 1** | In the beginning |
| **Ephesians 6** | The armour of God |
| **Psalm 139** | Wonderfully made |
| **Romans 8** | More than conquerors |

They open only when **all three chapters of the Sermon are finished at
Silver or better** — 90% under the current ladder. Finishing is not
enough on its own; the point of the extra passages is that they are
earned by careful work, which is the same thing the badges reward.

Until then the tiles are shown but greyed out with a padlock, and the
heading counts down: *"Silver or better on all three chapters above
(2 of 3 so far)"*. They are deliberately **visible rather than hidden** —
a shelf you can see is something to aim at, and a row that appears out
of nowhere is just confusing.

To change the bar, edit `UNLOCK_BADGE` in `js/app.js` (`'bronze'`,
`'silver'`, `'gold'`). To change which passages are on the shelf, see
*Changing translation* below.

### A typo you mend costs half

Accuracy is `correct letters ÷ letters typed`, with one deliberate soft
spot: **a wrong letter the camper goes back and repairs counts half.**

The reason is that the plain sum quietly punished the better habit. A
child who spotted their own mistake, backspaced and mended it scored
*no better* than one who shrugged and typed on — the repair cost them an
extra keystroke that cancelled out the credit. Noticing your own
mistakes is the whole thing we are trying to teach, so it should show up
in the number.

Measured on a real 94-character verse with six typos, typed both ways:

| What they did | Accuracy | Badge |
|---|---|---|
| Left all six standing | 94% | Silver |
| Backspaced and mended all six | **97%** | **Gold** |

Under the old sum **both of those scored 94%** — the six extra
keystrokes spent mending cancelled out the credit exactly, so the child
who repaired their work gained nothing for it. Mending is now worth a
badge tier.

It cannot be gamed into a perfect score: the credit handed back is at
most half of what the mistake took away, so accuracy can never climb
over 100%. Deliberately typing a wrong letter and correcting it always
leaves a camper worse off than simply typing the right one.

The camper is told, the first time it happens — *"Good catch! A mistake
you mend only counts half."* — because a leniency nobody notices changes
nobody's habits. The **Oops** counter still shows every mistake made,
mended or not; it is the accuracy that softens.

The dial is `FIX_CREDIT` in `js/app.js`: `0.5` today, `0` restores the
old strict sum, `1` makes a mended typo entirely free.

### Campers who started before all this changed

The scoring moved after camp had already begun — mending began to pay,
and the badges dropped five points. Campers part-way through were left
holding numbers that no longer meant the same thing as the ones next to
them on the board, through no fault of their own.

So the first time a browser loads the new version, every saved best is
revised **once**, as though that camper had gone back and mended every
mistake they ever made. A mend returns half of what a typo took, so
"all of them mended" is simply half the distance back to 100:

| Old best | Revised to | Badge |
|---|---|---|
| 100% | 100% | Gold → Gold |
| 96% | 98% | Silver → **Gold** |
| 90% | 95% | Bronze → **Gold** |
| 80% | 90% | Pearl → **Silver** |
| 70% | 85% | Pearl → **Bronze** |

A chapter still being typed gets the same benefit, so the live number on
the typing screen never reads lower than the best just credited.

It is safe against the obvious ways it could go wrong:

- **It cannot run twice.** The stamp (`scoreVer`) is written back with
  the results, so reloading — or reopening the site all week — changes
  nothing further.
- **It cannot demote anyone.** The revision only ever raises a score,
  and a badge is kept if the recomputed one would somehow rank lower.
- **It cannot exceed 100%,** and it leaves scores earned *after* the
  change alone.

If the scoring rules ever move again, bump `SCORE_VER` in `js/app.js`
and every browser will do one fresh pass.

### Their picture

Answering *Girl* or *Boy* opens five little Bible people to choose
from. They show up on the welcome screen, in the top corner and on the
camp board.

| Girls | Boys |
|---|---|
| Esther, Ruth, Mary, Deborah, Miriam | David, Moses, Noah, Daniel, Joseph |

The first one is selected the moment they answer, so nobody gets stuck
on a question they didn't notice. Campers who signed up before the
pictures existed keep the initial of their name and lose nothing.

They are drawn as SVG shapes inside `js/avatars.js` — no image files,
nothing to download.

### Verse numbers

Shown above the text ("Matthew 5 · verse 3") but **never typed** — the
punctuation would be more frustrating than useful at this age.

Long verses are automatically split into two or three shorter lines so
nobody faces a 260-character wall. The split happens at a comma or
semicolon wherever possible.

---

## Sound

Two buttons and a menu in the top-right corner:

- **Sounds** — the mistake *thunk* and the little chimes. **On by default.**
- **Music** — the background loop. **Off by default**, exactly as
  asked; a camper can switch it on and it is remembered for next time.
- **The tune menu** — three loops to pick from. Choosing one also turns
  the music on, because a child who picks *Happy Praise* expects to hear
  it rather than to hunt for a second switch.

| Tune | Feel |
|---|---|
| **Quiet Stream** | Slow, A minor. The original — closest to silence. |
| **Bright Sunrise** | C major, climbing. Cheerful but unhurried. |
| **Happy Praise** | G major, quicker and skipping along. |

All sound is generated by the browser itself, so there are no audio
files on the stick and nothing to download. The tunes live in the
`TRACKS` list in `js/audio.js`; adding a fourth one there makes it
appear in the menu on its own.

---

## Progress and saving

Progress saves automatically after every line, into the browser's own
storage on that computer. No login and no password.

Two things worth knowing before camp:

- **Progress lives on the machine, not on the USB stick.** A camper who
  moves to a different computer starts fresh. For a camp lab where each
  child sits at the same machine each day, this is fine — just have them
  keep their seat.
- **Clearing the browser's cache or history erases it.** Ask staff not
  to run cleanup tools on the lab machines mid-week.

Several children can share one machine — each picks their own name on
the welcome screen. The **Camp board** on the chapter screen ranks them
by accuracy, not speed, which is the habit worth rewarding.

*Reset my progress* (bottom of the chapter screen) wipes the current
camper's chapters and badges after a confirmation.

### Updating the site does not wipe anyone

Progress is keyed to the browser, not to the files. Copying a newer
version of the folder over the old one — new HTML, new CSS, new
scripts, a new translation — leaves every camper, badge and best score
exactly where it was.

The one thing an update *can* invalidate is a camper's place inside a
chapter they had not finished: "line 30 of 58" was counted against the
old wording. So each saved chapter carries a stamp of the text it was
typed against (`TEXT_VER` in `js/app.js`). When the stamp no longer
matches, that unfinished run rewinds to the top of its chapter and
everything earned is kept — badges, best accuracy, finished chapters,
run counts. A camper mid-chapter retypes from the start of that
chapter; nobody loses a medal.

**Bump `TEXT_VER` whenever you change the wording in the data file.**
That one line is what protects them.

Two updates that *would* lose progress, and neither happens by copying
files over:

- Renaming the storage key `bibleTyping.v1` in `js/storage.js`.
- Moving the site to a different address — from the USB stick to a web
  server, or between two servers. Browsers keep this storage per site,
  so a new address starts empty.

---

## Changing translation

The site ships with the **Berean Standard Bible**, which its translation
committee has dedicated to the public domain — free to copy onto sticks
and hand out.

All of the scripture lives in one file, `js/bible-bsb.js`, in this shape:

```js
window.BIBLE_DATA = [
  {"id":"5","ref":"Matthew 5","verses":[
     {"n":1,"t":"When Jesus saw the crowds, He went up on the mountain..."},
     {"n":2,"t":"and He began to teach them, saying:"}
  ]},
  {"id":"6","ref":"Matthew 6","verses":[ ... ]},
  {"id":"ps145","ref":"Psalm 145","verses":[ ... ]}
];
```

- **`id`** is the key a camper's progress is filed under. **Renaming one
  orphans every record saved against it**, so treat these as permanent
  once a camp has started. Matthew keeps the bare `"5"`, `"6"`, `"7"`
  it was first released with for exactly this reason.
- **`ref`** is the heading campers see. Change it freely.

To change translation, replace the `"t"` value of each verse with the
new text. Nothing else needs touching — the app counts the verses it
finds and re-splits the long ones on its own, so a translation with
different verse lengths just works.

To add or swap a passage, add its entry here and a matching line in
`PASSAGE_INFO` in `js/app.js` giving it a `set` (`MOUNT` for the top row,
`MORE` for the shelf) and a one-line theme. The rows build themselves
from that.

Four things to keep right:

1. Keep it valid JSON — straight double quotes around every string, a
   comma between entries, no trailing comma at the end of a list.
2. If a verse contains a double quote, escape it as `\"`.
3. Use straight apostrophes (`'`), not curly ones (`’`) — a curly one is
   a character no child can find on the keyboard, and it will be marked
   wrong. The BSB text here has already been normalised this way, along
   with its curly quotes and its em dashes.
4. **Bump `TEXT_VER` in `js/app.js`** *if you change existing wording.*
   See *Updating the site does not wipe anyone* above. Adding a whole new
   passage does not need it — untouched passages keep their line
   numbering, so nobody is rewound for someone else's new text.

One caution: **the NIV is under copyright.** Copying it onto sticks that
go home with families is a different thing from reading it in a room
together, and Biblica's permission terms are worth a look first. The BSB
build has no such issue, which is why it's the default.

---

## Adjusting things

| What | Where |
|---|---|
| Badge thresholds (95 / 90 / 85) | `js/app.js`, `badgeFor()` |
| Credit for mending a typo (0.5) | `js/app.js`, `FIX_CREDIT` |
| Max characters per line (140) | `js/app.js`, `MAX_SEG` |
| Which passages, which row, subtitles | `js/app.js`, `PASSAGE_INFO` |
| Badge needed to open the second row | `js/app.js`, `UNLOCK_BADGE` |
| Revising old scores after a rule change | `js/app.js`, `SCORE_VER` |
| Text stamp, after editing scripture | `js/app.js`, `TEXT_VER` |
| The ten pictures | `js/avatars.js`, `PEOPLE` |
| Background tunes | `js/audio.js`, `TRACKS` |
| Sound pitches and volume | `js/audio.js` |
| Colours, text sizes | `css/style.css`, the `:root` block at the top |

To use a different set of passages entirely, put them in
`js/bible-bsb.js` with their own ids and add matching entries to
`PASSAGE_INFO`.
