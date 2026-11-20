#!/usr/bin/env node
// Re-sync the CSS this port takes verbatim from Astryx (MIT, Meta Platforms, Inc.):
// reset.css, default tokens (from dist/astryx.css), and the neutral theme + fonts.
// Usage: node scripts/sync-astryx.mjs [version]   (default: ASTRYX_VERSION below)
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ASTRYX_VERSION = '0.7.17';
const version = process.argv[2] ?? ASTRYX_VERSION;
const root = new URL('..', import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), 'astryx-'));

function fetchPkg(name) {
	const tgz = execFileSync('npm', ['pack', `${name}@${version}`, '--silent'], { cwd: tmp })
		.toString()
		.trim()
		.split('\n')
		.pop();
	const dir = join(tmp, name.replace(/[@/]/g, '_'));
	execFileSync('mkdir', ['-p', dir]);
	execFileSync('tar', ['-xzf', join(tmp, tgz), '-C', dir]);
	return join(dir, 'package');
}

const core = fetchPkg('@astryxdesign/core');
const neutral = fetchPkg('@astryxdesign/theme-neutral');

cpSync(join(core, 'src/reset.css'), join(root, 'src/lib/styles/reset.css'));

const astryxCss = readFileSync(join(core, 'dist/astryx.css'), 'utf8');
const decls = [...astryxCss.matchAll(/:root, \.[\w-]+\{([^}]*)\}/g)].flatMap((m) =>
	m[1]
		.split(';')
		.map((d) => d.trim())
		.filter(Boolean)
);
writeFileSync(
	join(root, 'src/lib/styles/tokens.css'),
	[
		'/* Copyright (c) Meta Platforms, Inc. and affiliates. (MIT)',
		` * Default design tokens, extracted from @astryxdesign/core@${version} dist/astryx.css.`,
		' * Regenerate with scripts/sync-astryx.mjs rather than editing by hand.',
		' * Themes (src/lib/themes/<name>/theme.css) override these in @layer astryx-theme. */',
		'',
		'@layer reset, astryx-base, astryx-theme;',
		'',
		'@layer astryx-base {',
		'  :root {',
		...decls.map((d) => `    ${d};`),
		'  }',
		'}',
		''
	].join('\n')
);

const nDir = join(root, 'src/lib/themes/neutral');
cpSync(join(neutral, 'dist/theme.css'), join(nDir, 'theme.css'));
cpSync(join(neutral, 'fonts.css'), join(nDir, 'fonts.css'));
for (const f of readdirSync(join(neutral, 'fonts'))) {
	cpSync(join(neutral, 'fonts', f), join(nDir, 'fonts', f));
}
console.log(`Synced Astryx ${version}: ${decls.length} tokens, neutral theme.`);
