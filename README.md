# BonRurgundy

*A teleprompter that actually listens to you.*

Ron Burgundy would read anything you put on the prompter. BonRurgundy flips that around: it reads **you**. Paste a script, tap the mic, and the words scroll as you say them. Go off on a tangent about your dog and it waits. Come back to the script and it picks you right up. Flub a line? Say **"bon back"** and it rewinds. No hands, no foot pedal, no producer yelling in your ear.

Live and free, no install: **https://spacecowboyian.github.io/bonrurgundy/**

Sixty percent of the time, it works every time.

## What it is

BonRurgundy is a prompter first and a monitor second.

**Prompter first.** Open it on a phone, prop the phone under your camera lens, and read. The text is big enough to see from across the room. Everything except the words hides itself until you tap the screen. Your voice drives the scroll. That's the whole product, and most days it's all you need.

**Monitor second.** If you want to check your framing while you read, turn the camera on in Settings and the feed plays behind the words. On a phone that's the front camera. On a Mac it can be a DJI Osmo Pocket 3 over USB in 4K. And because iPhones refuse to talk to USB cameras, a Mac can relay the Osmo feed to your phone over Wi‑Fi. You can decide whether you need any of that. The prompter doesn't care either way.

I'm not going to lie to you: it's kind of a big deal. In a very small way.

## How to use it

1. Open the app. Paste your script, open a `.txt` or `.md` file, or drop one on the window. **Tidy** strips markdown headings, speaker labels and stage directions. Tap **Done**.
2. Tap the **mic** at the bottom left. The browser asks for the microphone once. Start reading.
3. Tap the words to show the top bar (word count, script, settings). Tap again to hide it. Showing the bar pauses the mic so you can fiddle without it listening.
4. Swipe or scroll the text any time to move it by hand. The prompter resyncs from wherever you leave it.

Nothing leaves your device except audio to your browser's speech recognizer (Google's in Chrome, Apple's in Safari). The script and your settings live in local storage on that phone or computer.

## The transport bar

Bottom left, tape-deck style: play/pause, jump to start, previous paragraph, next paragraph, jump to end, then the mic. Play scrolls at a fixed speed for people who'd rather not be listened to. Play and voice-follow are mutually exclusive, like Ron and Veronica co-anchoring.

## Voice commands

Every command starts with the wake word. It's **bon** by default. Change it in Settings, and add comma-separated aliases if your recognizer keeps hearing "bun".

| Say | It does |
| --- | --- |
| bon back · bon back two | up one or two lines |
| bon forward three | down three lines |
| bon next · bon previous | next or previous paragraph |
| bon back two paragraphs | two paragraphs up |
| bon start · bon end | top or bottom of the script |
| bon play · bon pause | fixed-speed scroll on or off |
| bon hold · bon go | freeze voice-follow, then resume |

Command words are stripped before alignment, so "bon" never ends up matched against your script. Unless your script is about Jon Bon Jovi, in which case you have bigger problems and should pick a different wake word.

## Keyboard

Space play/pause · up/down arrows move a line · PageUp/PageDown move a paragraph · Home/End · V mic · E script · comma for settings · F fullscreen · M mirror · square brackets for text size · plus/minus for play speed · T shows the transcript debug panel.

## Settings

- **Camera.** Off by default. Turn it on for a feed behind the words. Pick the source and frame rate. The Pocket 3 will do 4K24 over UVC if you ask nicely.
- **Phone monitor.** On the Mac with the Osmo plugged in, tap *Share this camera to a phone* and scan the QR code with your phone. Video goes peer to peer over your Wi‑Fi.
- **Voice.** Microphone, wake word, and the follow-my-voice toggle.
- **Text.** Size, reading-line position, width, and mirror mode for beam-splitter glass.
- **Play speed** for the fixed-speed mode.

## How it works, for the curious

The browser's Web Speech API turns your voice into words. A small aligner matches those words against the script with some tolerance: it expands numbers so "54" and "fifty four" agree, splits things like "AW11" into "aw eleven", and forgives a missed consonant. Short filler words can confirm that you're on track but never start a jump on their own, which is what stopped it from leaping ahead every time you said "the". Six unmatched words in a row and it decides you're riffing and freezes. The next phrase that matches the script brings it back.

It's science.

## Made in about an hour

This whole thing was built in roughly an hour on a Tuesday night with Claude Code, from an empty folder to a deployed app, with a human reading Church of Combustion sermons into a DJI camera to test it. That is not a brag about the human. That is an invitation.

Contributions are very welcome. Point your AI at the issues, or at the ideas below, and send a pull request. Stay classy.

Things that would be nice:

- Keep markdown headings as visible landing points for paragraph navigation
- A Deepgram or Whisper backend for people who don't want audio going to Google or Apple
- Smoother scrolling that still doesn't fight you when you drag the text
- A MediaRecorder backup of the camera feed
- An iPad build that takes the Osmo over USB directly
- Translations of the wake word and command grammar

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:https    # self-signed https so a phone on your Wi-Fi can use the mic
npm test
```

React, Vite, TypeScript, no backend. Pushes to main deploy to GitHub Pages through Actions. The sample script you see on first launch is this README, so if you're reading this out loud right now, congratulations, you have achieved recursion.

## Credits and the fine print

Built by Ian Jennings of OIO Racing with Claude Code. Not affiliated with DreamWorks, Paramount, Will Ferrell, or Channel 4 News. Camera relay signalling uses the public PeerJS server. If this saved you a take, there's a green dollar sign in the corner.

You stay classy, San Diego.
