# Build log

The original plan was six phases, each gated on a test against the real DJI Osmo Pocket 3. All six landed on 2026-10-13. What follows is what each phase set out to do and what actually shipped.

## Phase 0: Hardware baseline
- Pocket 3 over a data USB-C cable in **Webcam** mode shows up as a standard UVC camera and mic in Chrome. Don't run OBS or Photo Booth at the same time.
- Firmware version still not recorded (Settings > Device Info on the camera).

## Phase 1: Scaffold + camera feed (done)
- Vite + React + TypeScript, Vitest.
- `useCamera`: device picker, `getUserMedia` asking for 3840×2160 and an exact frame rate (24/25/30/50/60), reports the negotiated settings and advertised capabilities.
- **Finding:** the host's UVC request drives the camera's mode. Asking for 4K at 24 fps put the Pocket 3 in 4K24 on its own screen. Card clip resolution in that mode still to be eyeballed.

## Phase 2: Script + manual prompter (done)
- Script editor with localStorage, paste/file/drag-drop import, markdown tidy.
- Prompter overlay: reading line at the top third, fades, read words dimmed, no current-word highlight.
- Fixed-speed play (wpm), wheel/trackpad/touch scrolling, keyboard nudges.

## Phase 3: Speech-to-text (done)
- Web Speech API, continuous with interim results, auto-restart. Decision gate passed: 95–96% confidence on the Pocket 3 mic, "AW11" and "MR2" correct. Deepgram/Whisper stay as fallbacks only.

## Phase 4: Aligner (done, 26 unit tests across normalize/aligner/commands/tidy)
- Normalize both sides: lowercase, strip punctuation, digits to words, letter/digit split.
- Fuzzy forward match in a 40-token window with a distance penalty; stop words only confirm a run already in progress; bigram lookbehind for re-reads; six misses = riffing, cursor frozen.
- Finals fold into a checkpoint; each interim hypothesis is re-applied on top so motion is continuous; manual moves resync.

## Phase 5: Voice commands (done)
- Wake word (default `bon`, configurable with aliases) plus back/forward N lines, next/previous paragraph, start/end, play/pause, hold/go. Fired from the interim as soon as they parse, deduped against the final, stripped before alignment.
- Line boundaries come from the rendered DOM; paragraphs from blank lines.

## Phase 6: Polish (done)
- Phone-first layout, landscape and portrait, font in vmin so rotation keeps size. Tape-deck transport and mic always visible; everything else hidden until you tap the text. Showing UI pauses the mic.
- Camera opt-in, mic only on request. Donate button.
- GitHub Pages deploy. Mac-to-phone WebRTC relay for the Pocket 3 feed (iPhone can't take USB cameras).

## Tried and dropped
- Auto-listen behind a tap-to-start overlay: replaced by the mic button.
- Velocity-based "rolls at your pace" motion: felt leading, then bouncy, and fought manual drag. Back to a simple per-word 220 ms easing. Any future smoothing must not interfere with drag.
- Yellow current-word highlight.

## Still open
- Confirm a card clip recorded in 4K24 webcam mode is actually 4K24.
- Record Pocket 3 firmware version.
- Keep markdown headings as visible landing points for paragraph navigation (currently stripped).
- Public PeerJS signalling is a single point of failure for the relay; self-host or Supabase Realtime if it flakes.
- Safari on iPhone: interim results are coarser than Chrome; tracking may feel steppier.
