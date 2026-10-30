// Run with playwright-cli run-code --filename=checks/browser-smoke.mjs
// Start checks/serve-ui-fixture.mjs first. This must never target a live app.
async (page) => {
  const errors = [];
  const passed = [];
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    passed.push(label);
  };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const read = () => page.evaluate(async () => (await fetch('/api/state')).json());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4311');
  await page.getByRole('textbox', { name: 'Owner password' }).fill('test-owner-only');
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await page.locator('#provenance').filter({ hasText: 'TEST FIXTURE ONLY' }).waitFor();
  const initial = await read();
  check(initial.provenance.includes('TEST FIXTURE ONLY'), 'Protected isolated fixture loaded');

  await page.getByRole('button', { name: 'Edit message', exact: true }).click();
  const revised = 'Hello Harbour Roasters, shall we discuss the revised sample quote?';
  await page.getByRole('textbox', { name: 'Message text only' }).fill(revised);
  await page.getByRole('button', { name: 'Save revised draft' }).click();
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('Revised draft saved'));
  const edited = await read();
  const editedMessage = edited.actions.find(action => action.kind === 'message');
  check(editedMessage.status === 'pending' && editedMessage.version === 2 &&
    editedMessage.payload.text === revised && !edited.events.some(event => event.type === 'send'),
    'Editing preserves pending approval and produces no send');

  await page.getByRole('button', { name: 'Approve and send', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('completed'));
  const approved = await read();
  const sent = approved.actions.find(action => action.kind === 'message');
  check(sent.status === 'completed' && sent.receipt.id.startsWith('TEST-ONLY-') &&
    sent.payload.text === revised && approved.events.filter(event => event.type === 'send').length === 1,
    'One exact revised message has one test-provider receipt');

  await page.getByRole('button', { name: 'Confirm shipment', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm shipment', exact: true }).waitFor({ state: 'detached' });
  await page.reload();
  await page.locator('#provenance').filter({ hasText: 'TEST FIXTURE ONLY' }).waitFor();
  const afterReload = await read();
  check(afterReload.actions.find(action => action.kind === 'shipment').status === 'completed' &&
    afterReload.loops.find(loop => loop.type === 'order_to_ship').status === 'closed',
    'Shipment closure survives page reload');

  await page.getByRole('button', { name: 'View Bean & Bloom background', exact: true }).click();
  check((await page.locator('#lead-content summary').textContent()).includes('Bean & Bloom') &&
    await page.locator('#network-content svg .node').count() === initial.orgs.length &&
    await page.locator('#network-content svg line').count() === initial.edges.length,
    'Complete network selects the corresponding background');
  const dueCount = afterReload.loops.filter(loop => loop.due_today).length;
  check((await page.locator('#loops .section-heading').textContent()).includes(`${dueCount} due today`) &&
    (await page.locator('#today').textContent()).includes('London time'),
    'Due-today count and London-time label agree with stored state');

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    check(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth),
      `No document overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/mobile.png' });
  check(errors.length === 0, 'No browser errors during the final run');
  return { passed, evidence: 'Isolated browser fixtures only; no external provider proof' };
}
