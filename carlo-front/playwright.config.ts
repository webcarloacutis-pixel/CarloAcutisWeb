import {defineConfig,devices} from '@playwright/test'
import {resolve} from 'node:path'
import {existsSync} from 'node:fs'
const root=resolve(__dirname,'..')
const chromium=resolve(root,'.tools/playwright/chromium-1243/chrome-win64/chrome.exe')
const firefox=resolve(root,'.tools/playwright/firefox-1543/firefox/firefox.exe')
const webkit=resolve(root,'.tools/playwright/webkit-2359/Playwright.exe')
export default defineConfig({
 testDir:'./tests/browser',timeout:45000,expect:{timeout:10000},fullyParallel:false,workers:1,retries:0,
 outputDir:process.env.PLAYWRIGHT_OUTPUT_DIR || '../.audit/acutis-production/local/browser-results',
 reporter:[['list'],['json',{outputFile:process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || '../.audit/acutis-production/evidence/browser-results.json'}]],
 use:{baseURL:process.env.ACUTIS_BROWSER_ORIGIN || 'https://localhost:3443',ignoreHTTPSErrors:false,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'chromium-desktop',use:{...devices['Desktop Chrome'],launchOptions:existsSync(chromium)?{executablePath:chromium}:{}}},
  {name:'firefox-desktop',use:{...devices['Desktop Firefox'],launchOptions:existsSync(firefox)?{executablePath:firefox}:{}}},
  {name:'webkit-desktop',use:{...devices['Desktop Safari'],launchOptions:existsSync(webkit)?{executablePath:webkit}:{}}},
  {name:'android-emulated',use:{...devices['Pixel 7'],launchOptions:existsSync(chromium)?{executablePath:chromium}:{}}},
  {name:'iphone-emulated',use:{...devices['iPhone 13'],launchOptions:existsSync(webkit)?{executablePath:webkit}:{}}},
  {name:'ipad-emulated',use:{...devices['iPad (gen 7)'],launchOptions:existsSync(webkit)?{executablePath:webkit}:{}}},
 ]
})
