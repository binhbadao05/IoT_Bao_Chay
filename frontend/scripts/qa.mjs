import { chromium } from 'playwright'
import fs from 'node:fs'
import assert from 'node:assert/strict'

const base = 'http://127.0.0.1:5173'
const shots = new URL('./qa-screenshots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
fs.mkdirSync(shots, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
const page = await context.newPage()

const consoleErrors = []
const pageErrors = []
const results = []
const allowMutations = process.env.RUN_QA_MUTATIONS === '1'
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => pageErrors.push(err.message))

async function shot(name) {
  await page.screenshot({ path: `${shots}${name}.png`, fullPage: true })
}

async function runFeature(name, fn) {
  try {
    await fn()
    results.push({ feature: name, status: 'PASS' })
  } catch (error) {
    results.push({ feature: name, status: 'FAIL', error: error.message })
    throw error
  }
}

async function assertHeading(name, target = page) {
  await target.getByRole('heading', { name }).waitFor()
}

async function assertText(name, target = page) {
  await target.getByText(name, { exact: true }).first().waitFor()
}

async function assertNoHorizontalOverflow(target = page) {
  const hasOverflow = await target.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  assert.equal(hasOverflow, false, 'page has horizontal overflow')
}

await runFeature('login-ui-and-error-state', async () => {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await assertHeading('SmartRoom Monitor')
  await assertNoHorizontalOverflow()
  await page.screenshot({ path: `${shots}login-desktop.png`, fullPage: true })
  await page.getByLabel('Username', { exact: true }).fill('admin')
  await page.getByLabel('Password', { exact: true }).fill('bad-password')
  await page.getByRole('button', { name: 'Show password' }).click()
  assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'password')
  await page.getByRole('button', { name: /Sign in/i }).click()
  await assertText('Sign in failed. Check the API, username and password.')
  await page.getByLabel('Password', { exact: true }).fill('Admin@123')
  await page.getByRole('button', { name: /Sign in/i }).click()
  await page.waitForURL('**/dashboard')
  await assertHeading('Environmental overview')
})

await runFeature('dashboard-overview', async () => {
  await page.waitForTimeout(900)
  await assertHeading('Environmental overview')
  await assertText('Telemetry history')
  await assertText('Temperature')
  await assertText('Humidity')
  await page.getByRole('link', { name: /Open device detail/i }).waitFor()
  await assertNoHorizontalOverflow()
  await shot('dashboard-desktop')
})

await runFeature('app-shell-navigation', async () => {
  await page.getByRole('link', { name: 'Devices', exact: true }).click()
  await assertHeading('Devices')
  await page.getByRole('link', { name: 'Alerts', exact: true }).click()
  await assertHeading('Alerts center')
  await page.getByRole('link', { name: 'Control', exact: true }).click()
  await assertHeading('Control center')
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  await assertHeading('Environmental overview')
})

await runFeature('devices-search', async () => {
  await page.goto(`${base}/devices`, { waitUntil: 'networkidle' })
  await assertHeading('Devices')
  const search = page.getByPlaceholder('Search devices')
  await search.fill('sim-esp32-001')
  await assertText('sim-esp32-001')
  await assertText('Lifecycle')
  await assertNoHorizontalOverflow()
  await shot('devices-desktop')
})

await runFeature('device-detail', async () => {
  await page.goto(`${base}/devices/sim-esp32-001`, { waitUntil: 'networkidle' })
  await assertText('Live trace')
  await assertText('LED control')
  await assertText('Current state')
  await page.getByRole('button', { name: /Turn LED on/i }).waitFor()
  await page.getByRole('button', { name: /Turn LED off/i }).waitFor()
  await assertNoHorizontalOverflow()
  await shot('device-detail-desktop')
})

await runFeature('alerts-filter-and-ack', async () => {
  await page.goto(`${base}/alerts`, { waitUntil: 'networkidle' })
  await assertHeading('Alerts center')
  await page.getByRole('button', { name: 'ACTIVE', exact: true }).waitFor()
  await page.getByRole('button', { name: 'ACKNOWLEDGED', exact: true }).waitFor()
  await page.getByRole('button', { name: 'ACTIVE', exact: true }).click()
  await page.getByRole('button', { name: 'ACKNOWLEDGED', exact: true }).click()
  await page.getByRole('button', { name: 'All', exact: true }).click()
  const ackButton = page.getByRole('button', { name: 'Acknowledge', exact: true }).first()
  if (allowMutations && await ackButton.count()) {
    const ackHandle = await ackButton.elementHandle()
    assert.ok(ackHandle, 'acknowledge button handle should exist')
    await ackHandle.click()
    await page.waitForFunction((element) => !element.isConnected, ackHandle)
    await assertText('Acknowledged')
  } else if (!allowMutations) {
    await assertHeading('Alerts center')
  } else {
    await page.getByText(/No alerts in this view|Acknowledged/).first().waitFor()
  }
  await assertNoHorizontalOverflow()
  await shot('alerts-desktop')
})

await runFeature('control-led-and-thresholds', async () => {
  await page.goto(`${base}/control`, { waitUntil: 'networkidle' })
  await assertHeading('Control center')
  await assertText('LED control')
  await assertText('Safety thresholds')
  const ledOn = page.getByRole('button', { name: /Turn LED on/i })
  const saveButton = page.getByRole('button', { name: /Save thresholds/i })
  await ledOn.waitFor()
  await saveButton.waitFor()
  if (allowMutations) {
    for (const buttonName of ['Turn LED on', 'Turn LED off']) {
      const commandResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/devices/sim-esp32-001/commands') &&
          response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: new RegExp(buttonName, 'i') }).click()
      const response = await commandResponse
      assert.equal(response.status(), 201)
    }
    await assertText('Command')
  }
  const tempInput = page.getByLabel('Temp high °C')
  await tempInput.waitFor()
  if (allowMutations) {
    const currentValue = await tempInput.inputValue()
    await tempInput.fill(currentValue)
    await saveButton.click()
    await assertText('Thresholds updated on the server.')
  }
  await assertNoHorizontalOverflow()
  await shot('control-desktop')
})

await runFeature('sign-out-button', async () => {
  await page.getByRole('button', { name: /Sign out/i }).click()
  await page.waitForURL('**/login')
  await assertHeading('SmartRoom Monitor')
})

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const mobilePage = await mobile.newPage()
mobilePage.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`mobile console: ${msg.text()}`)
})
mobilePage.on('pageerror', (err) => pageErrors.push(`mobile pageerror: ${err.message}`))
await runFeature('mobile-dashboard-layout', async () => {
  await mobilePage.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await mobilePage.getByLabel('Username', { exact: true }).fill('admin')
  await mobilePage.getByLabel('Password', { exact: true }).fill('Admin@123')
  await mobilePage.getByRole('button', { name: /Sign in/i }).click()
  await mobilePage.waitForURL('**/dashboard')
  await assertHeading('Environmental overview', mobilePage)
  await assertNoHorizontalOverflow(mobilePage)
  await mobilePage.screenshot({ path: `${shots}dashboard-mobile.png`, fullPage: true })
})

const screenshots = fs.readdirSync(shots).filter((f) => f.endsWith('.png'))
const summary = { results, consoleErrors, pageErrors, screenshots }
const expected401 = 'Failed to load resource: the server responded with a status of 401 (UNAUTHORIZED)'
const unexpectedConsoleErrors = consoleErrors.filter((error) => error !== expected401)
assert.deepEqual(unexpectedConsoleErrors, [], `unexpected browser console errors: ${JSON.stringify(unexpectedConsoleErrors)}`)
assert.ok(consoleErrors.filter((error) => error === expected401).length <= 1, 'expected only one bad-password 401 console message')
assert.deepEqual(pageErrors, [], `unhandled page errors: ${JSON.stringify(pageErrors)}`)
assert.ok(screenshots.length >= 6, `expected at least 6 screenshots, got ${screenshots.length}`)

console.log(JSON.stringify(summary, null, 2))

await browser.close()
await mobile.close()
