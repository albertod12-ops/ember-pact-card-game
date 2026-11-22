// Ember Pact — screenshot runner (Node 22, standard library only).
// Serves game/ on a local port, renders each shot in shots.json in headless
// Chromium, and converts the PNG stills to JPEGs in screenshots/.
//   node shots.js
// The shots are real renders of the game's own code (?shot= states in main.js),
// never edited or composited. Each JPEG must stay under 256 KiB at 1280x800.

import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const PORT = 8901;
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const TMP = '/tmp/ember-pact-shot.png';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('server did not come up');
}

function toJpeg(pngPath, jpgPath) {
  // PIL converts and enforces the 256 KiB cap, stepping quality down if needed.
  const py = `
from PIL import Image
import sys
im = Image.open(sys.argv[1]).convert('RGB')
for q in (88, 80, 72, 64):
    im.save(sys.argv[2], 'JPEG', quality=q, optimize=True)
    import os
    if os.path.getsize(sys.argv[2]) <= 262144:
        print(f"saved {sys.argv[2]} quality={q} bytes={os.path.getsize(sys.argv[2])}")
        break
else:
    print(f"WARNING over cap: {sys.argv[2]} bytes={os.path.getsize(sys.argv[2])}")
`;
  execFileSync('python3', ['-c', py, pngPath, jpgPath], { stdio: 'inherit' });
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'inherit' });
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  mkdirSync(join(here, 'screenshots'), { recursive: true });
  for (const shot of shots) {
    const url = `http://127.0.0.1:${PORT}/${shot.query}`;
    execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--window-size=1280,800',
      '--virtual-time-budget=6000', `--screenshot=${TMP}`, url,
    ], { stdio: 'inherit' });
    if (!existsSync(TMP)) throw new Error(`no screenshot for ${shot.name}`);
    const out = join(here, 'screenshots', shot.name);
    toJpeg(TMP, out);
    const st = statSync(out);
    console.log(`${shot.name}: ${st.size} bytes`);
    if (st.size > 262144) throw new Error(`${shot.name} over the 256 KiB cap`);
  }
  console.log('all shots done');
} finally {
  server.kill('SIGTERM');
}
