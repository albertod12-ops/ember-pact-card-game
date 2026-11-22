// Ember Pact — the hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ into /output and writes
// /output/dossier.json with the vendored make.fun library, as the kit requires.
// It clears only the CONTENTS of /output (never the mount itself), so a stale
// file from an earlier run can never leak into a later one, and both runs of
// the program write the same bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

process.umask(0o022);

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// Clear the contents of /output only: every entry inside it goes, the
// directory itself stays (it may be a mount the grader owns).
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (kit RULES.txt, gate): game/ at most 993 files and
// 48 MiB, screenshots at most 4 files of 256 KiB each, dossier text 160 KiB.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Outputs must be readable by every user: the grader collects them as another
// user than the one this program runs as.
chmodSync(dossierPath, 0o644);
