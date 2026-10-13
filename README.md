# BonRurgundy

A voice-tracked teleprompter that runs in the browser. Paste a script, tap the mic, and the text follows you as you read. Flub a line and say **"bon back"**. Works on a phone, a Mac, or anything with Chrome or Safari, and can optionally show a camera feed (your phone's, or a DJI Osmo Pocket 3 relayed from a Mac) behind the words.

Live: https://spacecowboyian.github.io/bonrurgundy/

## How it works

- Speech-to-text comes from the browser's Web Speech API (Chrome and Safari). Audio goes to the browser vendor's recognizer.
- A small aligner matches the recognized words against the script with fuzzy tolerance, number expansion ("54" = "fifty four"), and letter/digit splitting ("AW11" = "aw eleven"). Six unmatched words in a row freezes the prompter until you're back on script.
- Nothing is uploaded. The script and your settings live in the browser's local storage on that device.

## Use

1. Open the app. The script screen appears if there's no script yet. Paste, open a `.txt`/`.md` file, or drop one on the window. **Tidy** strips markdown headings, speaker labels and stage directions. Tap **Done**.
2. Tap the **mic** (bottom left) to follow your voice, or **play** to scroll at a fixed speed. The two are exclusive.
3. Tap the text to show the top bar (word count, script, settings). Showing the bar pauses the mic; tapping the text again hides it and resumes.
4. Swipe or scroll the text to move it by hand.

### Transport (bottom left)
Play/pause · go to start · previous paragraph · next paragraph · go to end · mic.

### Voice commands
All start with the wake word, **bon** by default (change it in Settings; comma-separate aliases if it mishears).

| Say | Does |
| --- | --- |
| bon back / bon back two | up one / two lines |
| bon forward three | down three lines |
| bon next / bon previous | next / previous paragraph |
| bon back two paragraphs | two paragraphs up |
| bon start / bon end | top / bottom of the script |
| bon play / bon pause | fixed-speed scroll on / off |
| bon hold / bon go | freeze voice-follow / resume |

### Keyboard
Space play/pause · ↑↓ line · PageUp/PageDown paragraph · Home/End · V mic · E script · `,` settings · F fullscreen · M mirror · `[` `]` text size · `+` `-` play speed · T transcript debug.

### Settings (gear)
- **Camera:** off by default. Turn on to show a feed behind the words (front camera on a phone, Pocket 3 on a Mac), pick source and frame rate.
- **Phone monitor:** plug the Pocket 3 into a Mac, tap *Share this camera to a phone*, scan the QR on the phone. Video is peer-to-peer on your Wi‑Fi. iPhones can't take USB cameras directly, which is why this exists.
- **Voice:** mic, wake word, follow-my-voice toggle.
- **Text:** size, reading-line position, width, mirror (for beam-splitter glass).
- **Play speed** for the fixed-speed mode.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:https    # self-signed https, so a phone on the same Wi‑Fi can use the mic
npm test
```

React + Vite + TypeScript, no backend. Pushes to `main` deploy to GitHub Pages via Actions. Donation links live in `src/config.ts`.

## History

Built 2026-10-13 as a proof of concept for reading Church of Combustion scripts to a DJI Osmo Pocket 3. See [PLAN.md](PLAN.md) for the build log and the `projects/osmo-prompter/` brain for spec, decisions and hardware findings.
