async (page) => {
  const base = new URL(page.url()).origin;
  if (!base.endsWith(':4177')) throw new Error('Use the isolated fixture on port 4177.');
  const browser = page.context().browser();
  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const member = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const contexts = [admin, member]; const reports = []; const errors = [];
  const check = (value, message) => { if (!value) throw new Error(message); reports.push(`PASS: ${message}`); };
  const login = async (ctx, email, password) => check((await ctx.request.post(`${base}/api/signin`, { data: { email, password } })).ok(), `Authenticate ${email}`);
  const ap = await admin.newPage(); const mp = await member.newPage();
  for (const p of [ap, mp]) p.on('pageerror', error => errors.push(error.message));
  const scanText = () => ap.locator('[data-scan-result]');
  const upload = async buffer => ap.locator('[name=scanImage]').setInputFiles({ name: 'ticket.png', mimeType: 'image/png', buffer });
  try {
    await login(admin, 'admin@radius.id', 'admin123'); await login(member, 'peter@gmail.com', '123');
    const state = await (await admin.request.get(`${base}/api/admin/data`)).json();
    const peter = state.users.find(user => user.email === 'peter@gmail.com');
    const response = await admin.request.post(`${base}/api/admin/events`, { data: { name: `QR test ${Date.now()}`, category: 'RUN', startsAt: '2026-12-20', city: 'Jakarta', venue: 'Test venue', tickets: [{ name: 'Regular', price: 79000, capacity: 10 }], active: true } });
    check(response.status() === 201, 'Create isolated QR event'); const event = await response.json();
    const tickets = [];
    for (let i = 0; i < 4; i++) {
      const issued = await admin.request.post(`${base}/api/admin/tickets`, { data: { customerId: peter.id, eventId: event.id, type: 'Regular' } });
      check(issued.status() === 201, `Issue QR test ticket ${i + 1}`); tickets.push(await issued.json());
    }
    const download = async ticket => {
      await mp.goto(`${base}/account.html#tickets`);
      await mp.locator(`[data-ticket="${ticket.id}"]`).click();
      const button = mp.locator('[data-download-ticket]'); await button.waitFor();
      await mp.waitForFunction(() => !document.querySelector('[data-download-ticket]')?.disabled);
      check(await mp.locator('[data-ticket-qr]').isVisible(), `Real QR displayed for ${ticket.code}`);
      const pending = mp.waitForEvent('download'); await button.click(); const file = await pending;
      check(file.suggestedFilename() === `${ticket.code}.png`, 'PNG has the ticket code as its filename');
      const stream = await file.createReadStream(); const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      check(buffer.subarray(1, 4).toString() === 'PNG', 'Downloaded file is an actual PNG');
      await mp.keyboard.press('Escape'); return buffer;
    };
    const first = await download(tickets[0]); const cameraPNG = await download(tickets[1]); const cancelled = await download(tickets[2]);
    await ap.goto(`${base}/admin.html#tickets`); await ap.locator('[data-open-scanner]').click();
    await ap.locator('[data-start-camera]').click(); await scanText().filter({ hasText: 'Pilih event check-in terlebih dahulu' }).waitFor();
    check(true, 'Scanner requires an event before requesting camera access');
    await ap.locator('[name=scanEventId]').selectOption(state.events.find(e => e.active && !e.archived).id);
    await upload(first); await scanText().filter({ hasText: 'event lain' }).waitFor(); check(true, 'Real downloaded QR rejects the wrong event');
    await ap.locator('[name=scanEventId]').selectOption(event.id);
    await upload(first); await scanText().filter({ hasText: 'Check-in berhasil' }).waitFor();
    check((await scanText().innerText()).includes(peter.name), 'Downloaded PNG decodes and checks in the correct participant');
    const after = await (await admin.request.get(`${base}/api/admin/data`)).json(); const used = after.tickets.find(t => t.id === tickets[0].id);
    check(used.entryConsumed && used.status === 'ATTENDED' && used.checkedInAt && used.checkedInBy, 'Check-in stores a permanent consumed flag, timestamp and admin');
    await upload(first); await scanText().filter({ hasText: 'sudah dipakai' }).waitFor(); check(true, 'Same PNG cannot be scanned twice');
    const again = await (await admin.request.get(`${base}/api/admin/data`)).json();
    check(again.tickets.find(t => t.id === used.id).checkedInAt === used.checkedInAt, 'Duplicate scan preserves the original admission timestamp');
    await admin.request.patch(`${base}/api/admin/tickets/${tickets[2].id}`, { data: { status: 'CANCELLED' } });
    await upload(cancelled); await scanText().filter({ hasText: 'dibatalkan' }).waitFor(); check(true, 'Previously downloaded cancelled ticket is rejected');
    await ap.locator('[name=scanImage]').setInputFiles('/home/raffinauval/project/radius/dist/assets/radius-logo.jpg');
    await scanText().filter({ hasText: 'QR tidak terbaca' }).waitFor(); check(true, 'Image without a QR provides a useful error');
    await ap.locator('[name=scanPayload]').fill(tickets[3].code); await ap.getByRole('button', { name: 'Check-in dengan kode', exact: true }).click();
    await scanText().filter({ hasText: 'Check-in berhasil' }).waitFor(); check(true, 'Keyboard/manual ticket code fallback works');
    await ap.locator('[name=scanPayload]').fill(tickets[3].code); await ap.getByRole('button', { name: 'Check-in dengan kode', exact: true }).click();
    await scanText().filter({ hasText: 'sudah dipakai' }).waitFor(); check(true, 'Manual fallback cannot reuse a consumed ticket');
    await mp.goto(`${base}/account.html#tickets`); await mp.locator(`[data-ticket="${used.id}"]`).click();
    await mp.locator('.ticket-code-notice').filter({ hasText: 'sudah dipakai' }).waitFor();
    check(await mp.locator('[data-ticket-qr],[data-download-ticket]').count() === 0, 'Used ticket no longer shows an active QR or download button');
    await mp.keyboard.press('Escape');
    for (const width of [320, 390, 768, 1440]) {
      await mp.setViewportSize({ width, height: 900 }); await mp.locator(`[data-ticket="${tickets[1].id}"]`).click();
      await mp.locator('[data-ticket-qr]').waitFor({ state: 'visible' });
      check(await mp.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth) && await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `QR ticket fits ${width}px`);
      await mp.keyboard.press('Escape'); check(await mp.locator(`[data-ticket="${tickets[1].id}"]`).evaluate(el => document.activeElement === el), `Ticket close restores focus at ${width}px`);
      await ap.setViewportSize({ width, height: 900 });
      check(await ap.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth) && await ap.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Scanner fits ${width}px`);
    }
    await mp.setViewportSize({ width: 390, height: 844 }); await mp.evaluate(() => document.documentElement.style.fontSize = '200%');
    await mp.locator(`[data-ticket="${tickets[1].id}"]`).click(); await mp.locator('[data-ticket-qr]').waitFor({ state: 'visible' });
    check(await mp.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth), 'QR ticket reflows at 200% text size'); await mp.keyboard.press('Escape');
    await ap.evaluate(() => document.documentElement.style.fontSize = '200%'); check(await ap.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth), 'Scanner reflows at 200% text size');
    await mp.route('**/api/tickets/*/qr', route => route.fulfill({ status: 503, json: { error: 'QR temporarily unavailable' } }));
    await mp.locator(`[data-ticket="${tickets[1].id}"]`).click(); await mp.getByRole('button', { name: 'Muat ulang tiket' }).waitFor();
    check(true, 'QR loading failure offers a retry'); await mp.unroute('**/api/tickets/*/qr');
    await mp.getByRole('button', { name: 'Muat ulang tiket' }).click(); await mp.locator('[data-ticket-qr]').waitFor({ state: 'visible' }); check(true, 'Retry loads the real QR');
    const camera = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(camera);
    await login(camera, 'admin@radius.id', 'admin123');
    await camera.addInitScript(async dataURL => {
      window.cameraStops = 0;
      if (!navigator.mediaDevices) return;
      navigator.mediaDevices.getUserMedia = async () => {
        const img = new Image(); img.src = dataURL; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = 660; canvas.height = 860;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const stream = canvas.captureStream(10);
        for (const track of stream.getTracks()) { const stop = track.stop.bind(track); track.stop = () => { window.cameraStops++; stop(); }; }
        return stream;
      };
    }, `data:image/png;base64,${cameraPNG.toString('base64')}`);
    const cp = await camera.newPage(); cp.on('pageerror', error => errors.push(error.message));
    await cp.goto(`${base}/admin.html#tickets`); await cp.locator('[data-open-scanner]').click(); await cp.locator('[name=scanEventId]').selectOption(event.id);
    await cp.locator('[data-start-camera]').click(); await cp.locator('[data-scan-result]').filter({ hasText: 'Check-in berhasil' }).waitFor({ timeout: 20000 });
    check(true, 'Camera path decodes a QR from an emulated video stream');
    check(await cp.evaluate(() => window.cameraStops > 0 && !document.querySelector('[data-scan-video]').srcObject), 'Camera tracks stop after successful check-in');
    check(await cp.locator('[data-start-camera]').innerText() === 'Scan peserta berikutnya', 'Admin can intentionally start the next scan');
    await cp.keyboard.press('Escape'); await cp.waitForFunction(() => document.activeElement?.hasAttribute('data-open-scanner'));
    check(true, 'Scanner close restores focus to its opener');
    await cp.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const stream = canvas.captureStream(10);
        for (const track of stream.getTracks()) { const stop = track.stop.bind(track); track.stop = () => { window.cameraStops++; stop(); }; }
        return stream;
      };
    });
    await cp.locator('[data-open-scanner]').click(); await cp.locator('[name=scanEventId]').selectOption(event.id); await cp.locator('[data-start-camera]').click();
    await cp.locator('[data-stop-camera]').waitFor({ state: 'visible' });
    await cp.locator('[data-stop-camera]').click(); check(await cp.locator('[data-scan-video]').isHidden() && (await cp.locator('[data-scan-result]').innerText()).includes('Kamera dihentikan'), 'Stop camera button releases the preview and updates feedback');
    await cp.locator('[data-start-camera]').click(); await cp.locator('[data-stop-camera]').waitFor({ state: 'visible' });
    await cp.getByRole('button', { name: 'Tutup scanner', exact: true }).click();
    await cp.waitForFunction(() => !document.querySelector('[data-scan-video]').srcObject && document.activeElement?.hasAttribute('data-open-scanner'));
    check(await cp.evaluate(() => !document.querySelector('[data-scan-video]').srcObject), 'Close scanner stops an active camera stream');
    await cp.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
    await cp.locator('[data-open-scanner]').click(); await cp.locator('[name=scanEventId]').selectOption(event.id); await cp.locator('[data-start-camera]').click();
    await cp.locator('[data-scan-result]').filter({ hasText: 'Izin kamera ditolak' }).waitFor(); check(true, 'Camera permission denial explains image/code alternatives');
    check(errors.length === 0, `No browser exceptions (${errors.join(', ')})`);
    return { checks: reports.length, reports, physicalCamera: 'Not tested; video stream emulated.' };
  } finally { for (const ctx of contexts) await ctx.close(); }
}
