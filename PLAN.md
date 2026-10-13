# PoC Plan of Attack

Goal: a Chrome tab on the Mac showing the Pocket 3 feed full-screen with a script overlaid that scrolls as Ian reads it aloud. Each phase ends with something testable against the real camera.

## Phase 0: Hardware baseline (30 min, no code)
- Check Pocket 3 firmware (Settings > Device Info); 4K UVC streaming needs later firmware.
- Plug in via data USB-C, choose **Webcam**. Confirm it appears in `chrome://settings/content/camera` and as an audio input.
- Do not run OBS/Photo Booth at the same time (mode lock).

## Phase 1: Scaffold + camera feed (DONE)
- `npm create vite@latest` with React + TS. Add Vitest.
- `useCamera` hook: `enumerateDevices`, device picker, `getUserMedia` with `{ width: { ideal: 3840 }, height: { ideal: 2160 } }`.
- Full-screen `<video>` with a badge showing `track.getSettings()` (actual width/height/fps).
- **Test:** 4K badge appears for Pocket 3? Press record on the camera, exit webcam mode, check card clip resolution. Log result in `hardware-findings` (this answers the open 4K question).
- **Result 2026-10-13:** done. Requesting 3840x2160 puts the camera in 4K30; requesting exact 24 fps puts it in 4K24 (confirmed on the camera screen). Host UVC request drives camera mode. Card clip resolution at 4K24 still to be eyeballed.

## Phase 2: Script + manual prompter
- Script editor route: textarea, saved to localStorage.
- Prompter overlay: large text, gradient fades top/bottom, reading line at top third, passed words dimmed.
- Manual controls: space = pause/resume, arrows = nudge, +/- = speed, `m` = mirror toggle, `f` = fullscreen.
- **Test:** usable as a dumb teleprompter over the live feed.

## Phase 3: Speech-to-text
- `useSpeech` hook on Web Speech API (`webkitSpeechRecognition`, `continuous`, `interimResults`). Select Pocket 3 mic as input.
- Debug panel: live interim and final transcript, latency.
- **Test:** read a 2-minute script, check word accuracy and lag. Decision gate: stay on Web Speech or move to Deepgram/Whisper.

## Phase 4: Aligner (pure TS, unit tested)
- Tokenize + normalize script (lowercase, strip punctuation, numbers to words).
- Input: last 3 to 5 recognized words. Search window: cursor to cursor+40. Per-token edit-distance tolerance.
- Output: new cursor + state (`tracking | riffing | held`). Never jump backward unless strong match behind.
- Interim results drive smooth scroll; finals confirm.
- Tests: exact read, skipped sentence, re-read sentence, homophones, filler words.

## Phase 5: Riff + voice commands
- ~6 consecutive unmatched words = `riffing`, freeze scroll. Match resumes = resync.
- Keyword phrases (`prompter hold` / `prompter go`) detected and filtered before alignment. Confirm no collision with natural speech.
- **Test:** full read-through with an ad-lib in the middle.

## Phase 6: Polish for real use
- Font size, line position, margins persisted. Mirror mode. Hide chrome in fullscreen.
- Optional: MediaRecorder backup of the stream.

## Risks
- Web Speech API accuracy/latency with a USB mic. Fallback: Deepgram streaming or whisper wasm.
- 4K UVC may not be exposed by Chrome or may not drive 4K card recording. Phase 1 settles this early.
- Safari caps UVC modes; Chrome only for the PoC.
