import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_MP4 = process.env.OUT_MP4 || path.join(ROOT, 'unity-ta-explainer-v2.mp4');
const OUT_STILL = process.env.OUT_STILL || path.join(ROOT, 'unity-ta-explainer-v2-still.png');
const WAV = path.join(ROOT, 'narration-indextts.wav');
const PORT = 8793;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.srt': 'application/x-subrip',
  '.css': 'text/css'
};

function contentType(p) {
  return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/explainer-v2.html';
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('forbidden'); return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('missing'); return;
    }
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes',
      'Content-Length': data.length
    });
    res.end(data);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
});

await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
console.log('serve', `http://127.0.0.1:${PORT}/explainer-v2.html`);

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-web-security']
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1
});

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('PAGE', msg.text());
});

await page.goto(`http://127.0.0.1:${PORT}/explainer-v2.html?render=1${process.env.NO_NARRATOR ? '&noNarrator=1' : ''}`, {
  waitUntil: 'networkidle',
  timeout: 60000
});

await page.waitForFunction(() => window.__explainer && window.__explainer.ready, null, { timeout: 30000 });
const meta = await page.evaluate(() => ({
  duration: window.__explainer.duration,
  fps: window.__explainer.fps,
  useNarrVideo: window.__explainer.useNarrVideo
}));
console.log('meta', meta);

const duration = meta.duration;
const fps = meta.fps || 30;
const totalFrames = Math.round(duration * fps);
console.log('frames', totalFrames);

// Hide UI chrome for clean frames
await page.evaluate(() => {
  const s = document.getElementById('status');
  const c = document.getElementById('controls');
  if (s) s.style.display = 'none';
  if (c) c.style.display = 'none';
});

const ff = spawn('ffmpeg', [
  '-y',
  '-f', 'image2pipe',
  '-framerate', String(fps),
  '-i', 'pipe:0',
  '-i', WAV,
  '-af', `apad=whole_dur=${duration}`,
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'veryfast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-t', String(duration),
  '-movflags', '+faststart',
  OUT_MP4
], { stdio: ['pipe', 'inherit', 'inherit'] });

let stillSaved = false;
for (let i = 0; i < totalFrames; i++) {
  const t = i / fps;
  await page.evaluate(async (tt) => {
    await window.__explainer.seek(tt);
  }, t);
  // small settle for video decode
  if (meta.useNarrVideo && i % 3 === 0) {
    await page.waitForTimeout(12);
  }
  const b64 = await page.evaluate(() => {
    return window.__explainer.canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
  });
  const buf = Buffer.from(b64, 'base64');
  const ok = ff.stdin.write(buf);
  if (!ok) await new Promise((r) => ff.stdin.once('drain', r));

  if (!stillSaved && Math.abs(t - 8.0) < (1 / fps)) {
    fs.writeFileSync(OUT_STILL, await page.evaluate(async () => {
      const b64 = window.__explainer.canvas.toDataURL('image/png').split(',')[1];
      // return as base64; write outside
      return b64;
    }).then((b) => Buffer.from(b, 'base64')));
    stillSaved = true;
    console.log('still @8s', OUT_STILL);
  }
  if (i % 60 === 0) console.log(`frame ${i}/${totalFrames} t=${t.toFixed(2)}`);
}

ff.stdin.end();
const code = await new Promise((resolve) => ff.on('close', resolve));
console.log('ffmpeg exit', code);

await browser.close();
server.close();

if (code !== 0 || !fs.existsSync(OUT_MP4) || fs.statSync(OUT_MP4).size < 10000) {
  console.error('render failed');
  process.exit(1);
}
console.log('OK', OUT_MP4, fs.statSync(OUT_MP4).size);
