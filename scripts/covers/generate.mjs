import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const blogDir = path.join(root, 'src/content/blog');
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ACCENTS = {
	'#0C4B33': '#3ddc97',
	'#D82C20': '#ff6a5c',
	'#3776AB': '#7fb5e6',
	'#F26B21': '#ff9a5c'
};

const config = JSON.parse(await readFile(path.join(here, 'covers.json'), 'utf8'));
const template = await readFile(path.join(here, 'template.html'), 'utf8');
const only = process.argv.slice(2);

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function frontmatterField(source, key) {
	const match = source.match(new RegExp(`^${key}:\\s*(?:(['"])(.*)\\1|(.*))\\s*$`, 'm'));
	return match ? (match[2] ?? match[3]).trim() : undefined;
}

function isDark(hex) {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35;
}

async function render(slug, cover) {
	const markdown = await readFile(path.join(blogDir, slug, 'index.md'), 'utf8');
	const title = frontmatterField(markdown, 'title');
	const image = frontmatterField(markdown, 'coverImage');
	if (!title || !image) throw new Error(`${slug}: title or coverImage missing`);

	const color = cover.color.toUpperCase();
	const logos = await Promise.all(
		cover.logos.map(async (name) => `<span class="logo">${await readFile(path.join(here, 'logos', `${name}.svg`), 'utf8')}</span>`)
	);
	const html = template
		.replaceAll('{{COLOR}}', color)
		.replaceAll('{{STROKE}}', isDark(color) ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.3)')
		.replaceAll('{{ACCENT}}', cover.accent ?? ACCENTS[color] ?? '#fafafa')
		.replaceAll('{{WORDS}}', cover.words.map((word) => `<span>${escape(word)}</span>`).join(''))
		.replaceAll('{{LOGOS}}', logos.join(''))
		.replaceAll('{{TOPIC}}', escape(cover.topic))
		.replaceAll('{{TITLE}}', escape(cover.title ?? title).replace(/\S*-\S*/g, (word) => `<span style="white-space: nowrap">${word}</span>`));

	const work = await mkdtemp(path.join(tmpdir(), 'cover-'));
	try {
		const page = path.join(work, 'cover.html');
		const shot = path.join(work, 'cover.png');
		await writeFile(page, html);
		execFileSync(chrome, [
			'--headless=new',
			'--disable-gpu',
			'--hide-scrollbars',
			`--user-data-dir=${path.join(work, 'profile')}`,
			'--force-device-scale-factor=2',
			'--window-size=1200,630',
			'--virtual-time-budget=8000',
			`--screenshot=${shot}`,
			`file://${page}`
		], { stdio: 'ignore' });
		const output = path.join(blogDir, slug, image);
		await sharp(shot).resize(2400, 1260).jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile(output);
		console.log(`${slug} → ${path.relative(root, output)}`);
	} finally {
		await rm(work, { recursive: true, force: true });
	}
}

for (const [slug, cover] of Object.entries(config)) {
	if (only.length && !only.includes(slug)) continue;
	await render(slug, cover);
}
