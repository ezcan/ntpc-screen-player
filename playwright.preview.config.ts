import { defineConfig } from '@playwright/test'
import config from './playwright.config'

// Run the interaction regression checks against minified CSS and JS, not Vite dev.
export default defineConfig(config, {
  testMatch: 'highlighter.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4174' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
  },
})
