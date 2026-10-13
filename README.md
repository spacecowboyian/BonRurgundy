# BonRurgundy

Voice-tracked teleprompter for the phone and the Mac, with an optional DJI Osmo Pocket 3 monitor feed. Say "bon back" and it goes back.

Live camera feed (Pocket 3 over USB in webcam/UVC mode) full-screen in the background, script overlaid on top, scrolling as you speak. Voice-tracked alignment keeps the reading line on your words; riffing off-script freezes the prompter; matching words again resumes it.

## Stack

- React + Vite + TypeScript
- Chrome on macOS (Pocket 3 over a data USB-C cable, **Webcam** mode)
- No backend for v1. Web Speech API for speech-to-text to start.

## Run

```bash
npm install
npm run dev          # http://localhost:5173 on the Mac
npm run dev:https    # self-signed https, for a phone on the same Wi-Fi
```

On a phone open `https://<mac-lan-ip>:5173`, accept the certificate warning once. Mic and camera need a secure context, so plain http only works on localhost.

## Use

1. Paste or open a script (`.txt` / `.md`; markdown headings, speaker labels and stage directions are stripped). Tap Done.
2. Tap the mic icon (bottom left) to follow your voice, or the play button to scroll at a fixed speed.
3. Say **bon back** / **bon back two** / **bon forward three** to jump by lines, **bon hold** / **bon go** to freeze and resume. Swipe or scroll the text to move it by hand.
4. Settings (gear): camera, frame rate, mic, wake word, text size, reading line, width, mirror.

Keys on a keyboard: Space fixed-speed scroll, arrows move a line, V listen, E script, H hide bars, F fullscreen, M mirror, `,` settings, T transcript debug.

## Status

Proof of concept. See [PLAN.md](PLAN.md) for the build order and the project brain (`projects/osmo-prompter/` in Brains) for spec, architecture, and hardware findings.
