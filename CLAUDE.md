# Khlui — project context

Learning app for the Thai khlui (bamboo duct flute), for Sam. iPhone-first PWA.
Live: https://sumosam-code.github.io/Khlui/ (GitHub Pages from `main`; push = deploy in ~1 min).
**English only** — Sam asked on 2026-10-19 to remove all Thai text. Notes show the letter (C, D…) big and Do/Re/Mi small.

## Architecture
- Single file `index.html` (HTML + CSS + JS), plus `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-180.png`, `icon-512.png`. No build step.
- Persistence: `localStorage` key `khlui_v1` → `{ saved:[{id,title,artist,lines,source,shift}], tab, note }`. Keep it backward compatible.
- `sw.js`: shell is network-first (2.5s timeout) then cache; Google Fonts cache-first; song search passes straight through. **Bump `CACHE` (currently `khlui-v7`) on every deployed change.**
- No `alert/confirm/prompt` (suppressed in iOS home-screen apps). Sounds are synthesised with Web Audio, never audio files.

## Music model
- Pitches are relative MIDI: 60 = "do" = all holes covered. Range 60–79 (do → high sol), the khlui phiang aw's 12 natural notes.
- `fingering(m)`: holes[0] thumb, holes[1..7] front top→bottom; 1 covered, 0 open, .5 half. High register = same fingers, thumb half-open, stronger breath. Sharps = lower natural with the next hole half-covered.
- Songs are auto-transposed (`autoShift`) to minimise half-holes and out-of-range notes; out-of-range notes fold by octave and are flagged.
- The khlui is monophonic: "chords" are shown as their notes in sequence (arpeggio).

## Song search
- Melodies come from noobnotes.net's WordPress REST API (`/wp-json/wp/v2/posts?search=`), with `orderby=relevance` (the default date order buries exact title matches — "let it go" missed Let It Go without it), which sends CORS headers, so the phone fetches it directly — no proxy/backend. Notation: `^` octave up, `*` two up, `.` octave down; note lines alternate with lyric lines.
- Search is two-step: a titles-only request (~2 KB), then `include=<id>` for the song tapped. The old one-shot request pulled full content for 15 songs (~50 KB) and Sam reported search failing on their iPhone. `nnFetch` tries `/wp-json/` then `/?rest_route=` (some networks filter `/wp-json/`), times out at 20s, and the error notice shows the real reason plus Try again — ask Sam what it says if search fails again.
- **Words under notes** (Sam asked 2026-10-19 — playing is hard without them). noobnotes puts a blank line between each note row and its lyric row, so `parseMelody` drops blank lines (before this fix every song lost its lyrics). Notes joined by a dash (`D–D`) are one word: each line stores `groups` (notes per word). Across 8,700 lines in 300 songs, groups == words 92% of the time; `alignWords` uses that, splitting a word into syllables when the count matches its group size (else word on the first note, `~` on held ones), and otherwise spreads syllables evenly. `syllables()` is a heuristic — good enough to place words, not a dictionary.
- Songs saved before 2026-10-19 have no `groups`/lyrics; `refreshWords` re-fetches them once on open (keeping the saved `shift`). Starter songs use the same dash format.
- **Genres**: chips use noobnotes' WordPress category ids (hardcoded in `GENRES`/`ERAS`), `categories=<id>&orderby=title`, 30 per page, total from the `X-WP-Total` header. Shares `lastResults` with search, so tapping a song goes through the same `openResult`.
- **Classical** is built in (`CLASSICAL`, opening themes, no lyrics): noobnotes had no classical category or tag, and no hits for 21 composers when checked 2026-11-09. A genre with a `songs` array skips the network. The themes were written from memory, so correct them if Sam spots a wrong note.
- Public CORS proxies (allorigins, corsproxy.io, codetabs) were tested 2026-10-19 and all failed — don't go back to them.

## Fingering widgets
`miniSVG` (song note strip, Whole song list, Chords tab) draws the same numbered bamboo flute as the big `fluteSVG`, through the same `holePaint`, so covered / open / half always look identical. Sam couldn't read the old dot version. Don't reintroduce a second drawing style. The Whole song list can hold hundreds of flutes, so it only redraws when the key changes (`cur.drawnShift`); moving between notes only moves the `.on` highlight.

## No zooming
Sam asked for this 2026-11. Three layers, because iPhone Safari can ignore the viewport meta: `maximum-scale=1, user-scalable=no`, `touch-action:pan-x pan-y` on every element (double-tap), and JS blocking `gesture*` events and multi-finger `touchmove` (pinch). Keep inputs at 16px so focusing them doesn't zoom.

## Testing
`python3 -m http.server 8790` then Playwright from `./venv` (gitignored) at 390×844 mobile: notes grid, search + open + save, chords + paste, reload persistence, offline load and offline saved song. Also run in **WebKit** (`p.devices["iPhone 15"]`) since that's what the phone uses.
- Use `service_workers="block"` on the context for any test that uses `page.route` — once the SW controls the page, requests bypass Playwright's routing and a "blocked" request silently succeeds.
