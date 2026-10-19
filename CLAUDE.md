# Khlui — project context

Learning app for the Thai khlui (bamboo duct flute), for Sam. iPhone-first PWA.
Live: https://sumosam-code.github.io/Khlui/ (GitHub Pages from `main`; push = deploy in ~1 min).
**English only** — Sam asked on 2026-10-19 to remove all Thai text. Notes show the letter (C, D…) big and Do/Re/Mi small.

## Architecture
- Single file `index.html` (HTML + CSS + JS), plus `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-180.png`, `icon-512.png`. No build step.
- Persistence: `localStorage` key `khlui_v1` → `{ saved:[{id,title,artist,lines,source,shift}], tab, note }`. Keep it backward compatible.
- `sw.js`: shell is network-first (2.5s timeout) then cache; Google Fonts cache-first; song search passes straight through. **Bump `CACHE` (currently `khlui-v4`) on every deployed change.**
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
- Public CORS proxies (allorigins, corsproxy.io, codetabs) were tested 2026-10-19 and all failed — don't go back to them.

## Testing
`python3 -m http.server 8790` then Playwright from `./venv` (gitignored) at 390×844 mobile: notes grid, search + open + save, chords + paste, reload persistence, offline load and offline saved song. Also run in **WebKit** (`p.devices["iPhone 15"]`) since that's what the phone uses.
- Use `service_workers="block"` on the context for any test that uses `page.route` — once the SW controls the page, requests bypass Playwright's routing and a "blocked" request silently succeeds.
