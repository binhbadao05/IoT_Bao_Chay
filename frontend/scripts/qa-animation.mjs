import { chromium } from 'playwright'
import fs from 'node:fs'
import assert from 'node:assert/strict'

const base = 'http://127.0.0.1:5173'
const shots = new URL('./qa-screenshots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
fs.mkdirSync(shots, { recursive: true })

const browser = await chromium.launch({ headless: true })
const results = []
const errors = []

async function runFeature(name, fn) {
  try {
    await fn()
    results.push({ feature: name, status: 'PASS' })
  } catch (error) {
    results.push({ feature: name, status: 'FAIL', error: error.message })
    throw error
  }
}

function watchErrors(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
}

function rectState(el) {
  const rect = el.getBoundingClientRect()
  return `${rect.x.toFixed(1)}:${rect.y.toFixed(1)}:${rect.width.toFixed(1)}:${rect.height.toFixed(1)}`
}

await runFeature('login-ambient-motion-two-states', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watchErrors(page)
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  const orb = page.locator('.ambient-orb').first()
  await orb.waitFor()
  await page.waitForTimeout(150)
  const first = await orb.evaluate(rectState)
  await page.screenshot({ path: `${shots}animation-login-a.png`, fullPage: true })
  await page.waitForTimeout(800)
  const second = await orb.evaluate(rectState)
  await page.screenshot({ path: `${shots}animation-login-b.png`, fullPage: true })
  assert.notEqual(first, second, 'login ambient orb did not move')
  await page.close()
})

await runFeature('login-success-transition', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watchErrors(page)
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('Username', { exact: true }).fill('admin')
  await page.getByLabel('Password', { exact: true }).fill('Admin@123')
  const signIn = page.getByRole('button', { name: /Sign in/i })
  await signIn.click()
  await page.waitForURL('**/dashboard')
  await page.getByRole('heading', { name: 'Environmental overview' }).waitFor()
  await page.close()
})

await runFeature('dashboard-background-motion-two-states', async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
  watchErrors(page)
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('Username', { exact: true }).fill('admin')
  await page.getByLabel('Password', { exact: true }).fill('Admin@123')
  await page.getByRole('button', { name: /Sign in/i }).click()
  await page.waitForURL('**/dashboard')
  const orb = page.locator('.ambient-orb').first()
  await orb.waitFor()
  await page.waitForTimeout(150)
  const first = await orb.evaluate(rectState)
  await page.screenshot({ path: `${shots}animation-dashboard-a.png`, fullPage: true })
  await page.waitForTimeout(800)
  const second = await orb.evaluate(rectState)
  await page.screenshot({ path: `${shots}animation-dashboard-b.png`, fullPage: true })
  assert.notEqual(first, second, 'dashboard ambient orb did not move')
  await page.close()
})

await runFeature('reduced-motion-and-no-overflow', async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
  watchErrors(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('Username', { exact: true }).fill('admin')
  await page.getByLabel('Password', { exact: true }).fill('Admin@123')
  await page.getByRole('button', { name: /Sign in/i }).click()
  await page.waitForURL('**/dashboard')
  await page.getByRole('heading', { name: 'Environmental overview' }).waitFor()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  assert.equal(overflow, false, 'reduced-motion page has horizontal overflow')
  await page.close()
})

assert.deepEqual(errors, [], `unexpected browser errors: ${JSON.stringify(errors)}`)
console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
