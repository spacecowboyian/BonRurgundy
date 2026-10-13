/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// `npm run dev` is plain http on localhost (fine for the Mac).
// `npm run dev:https` adds a self-signed cert so a phone on the LAN gets a
// secure context, which getUserMedia and SpeechRecognition require.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  // GitHub Pages serves from /<repo>/; local dev stays at /.
  base: process.env.GITHUB_PAGES ? '/osmo-prompter/' : '/',
  server: { host: true, port: 5173 },
  test: { environment: 'jsdom', globals: true },
}))
