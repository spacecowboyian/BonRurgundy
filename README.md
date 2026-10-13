# Osmo Prompter

Teleprompter + camera monitor web app for the DJI Osmo Pocket 3.

Live camera feed (Pocket 3 over USB in webcam/UVC mode) full-screen in the background, script overlaid on top, scrolling as you speak. Voice-tracked alignment keeps the reading line on your words; riffing off-script freezes the prompter; matching words again resumes it.

## Stack

- React + Vite + TypeScript
- Chrome on macOS (Pocket 3 over a data USB-C cable, **Webcam** mode)
- No backend for v1. Web Speech API for speech-to-text to start.

## Status

Proof of concept. See [PLAN.md](PLAN.md) for the build order and the project brain (`projects/osmo-prompter/` in Brains) for spec, architecture, and hardware findings.
