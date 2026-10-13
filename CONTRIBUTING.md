# Contributing

Thanks for looking. This project exists so nobody has to rebuild a free voice-tracking teleprompter at 1 a.m. If you fixed something or added something, please send it back.

**With an AI agent:** point it at this repo. `AGENTS.md` tells it how to run the app, what the non-obvious rules are, and how to open a pull request. Claude Code, Codex, Cursor, Gemini CLI and Copilot all pick it up.

**By hand:** fork, `npm install`, `npm run dev`, make the change, `npm test`, open a PR. Keep it to one change per PR and describe what a reader will notice.

**Ideas, not code:** open an issue. Short is fine.

**Rules of the road:** see the "Rules that are not obvious from the code" section in `AGENTS.md`. The two that matter most: logic goes in `src/lib/` with tests, and nothing may fight the reader's manual scroll.
