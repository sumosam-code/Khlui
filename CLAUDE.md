# Khlui — project context

Learning app for the Thai khlui (bamboo duct flute), for Sam. iPhone-first PWA.

## Architecture
- Single file `index.html` (HTML + CSS + JS), plus `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-180.png`, `icon-512.png`. No build step.
- Persistence: `localStorage` key `khlui_v1` → `{ saved:[{id,title,artist,lines,source,shift}], tab, note }`. Keep it backward compatible.
- `sw.js`: shell is network-first (2.5s timeout) then cache; Google Fonts cache-first; song search passes straight through. **Bump `CACHE` (currently `khlui-v1`) on every deployed change.**
- No `alert/confirm/prompt` (suppressed in iOS home-screen apps). Sounds are synthesised with Web Audio, never audio files.

## Music model
- Pitches are relative MIDI: 60 = "do" = all holes covered. Range 60–79 (do → high sol), the khlui phiang aw's 12 natural notes.
- `fingering(m)`: holes[0] thumb, holes[1..7] front top→bottom; 1 covered, 0 open, .5 half. High register = same fingers, thumb half-open, stronger breath. Sharps = lower natural with the next hole half-covered.
- Songs are auto-transposed (`autoShift`) to minimise half-holes and out-of-range notes; out-of-range notes fold by octave and are flagged.
- The khlui is monophonic: "chords" are shown as their notes in sequence (arpeggio).

## Song search
- Melodies come from noobnotes.net's WordPress REST API (`/wp-json/wp/v2/posts?search=`), which sends CORS headers, so the phone fetches it directly — no proxy/backend. Notation: `^` octave up, `*` two up, `.` octave down; note lines alternate with lyric lines.
- Public CORS proxies (allorigins, corsproxy.io, codetabs) were tested 2026-10-19 and all failed — don't go back to them.

## Testing
`python3 -m http.server 8790` then Playwright from `./venv` (gitignored) at 390×844 mobile: notes grid, search + open + save, chords + paste, reload persistence, offline load and offline saved song.
