import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PROMO = path.resolve(__dirname, '..');
const OUT_MP4 = process.env.OUT_MP4 || path.join(ROOT, 'playbook-60s.mp4');
const OUT_STILL = process.env.OUT_STILL || path.join(ROOT, 'playbook-60s-still.png');
const WAV = path.join(ROOT, 'narration-indextts.wav');
const PORT = Number(process.env.PORT || 8795);
const STILL_T = Number(process.env.STILL_T || 12);

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
    if (urlPath === '/') urlPath = '/explainer.html';
    // Prefer files under playbook-60s/; fall back to promo root for shared assets
    let filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const alt = path.normalize(path.join(PROMO, urlPath));
      if (alt.startsWith(PROMO) && fs.existsSync(alt) && !fs.statSync(alt).isDirectory()) {
        filePath = alt;
      } else {
        res.writeHead(404); res.end('missing'); return;
      }
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
console.log('serve', `http://127.0.0.1:${PORT}/explainer.html`);

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

const noNarr = process.env.NO_NARRATOR ? '&noNarrator=1' : '';
await page.goto(`http://127.0.0.1:${PORT}/explainer.html?render=1${noNarr}`, {
  waitUntil: 'networkidle',
  timeout: 60000
});

await page.waitForFunction(() => window.__explainer && window.__explainer.ready, null, { timeout: 30000 });

// Duration: audio if present, else cues end, else page duration
let duration = await page.evaluate(() => window.__explainer.duration);
if (fs.existsSync(WAV)) {
  // ffprobe if available
  try {
    const out = await new Promise((resolve, reject) => {
      const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', WAV], { stdio: ['ignore', 'pipe', 'pipe'] });
      let s = '';
      p.stdout.on('data', (d) => { s += d; });
      p.on('close', (code) => (code === 0 ? resolve(s.trim()) : reject(new Error('ffprobe'))));
    });
    const audioDur = parseFloat(out);
    if (isFinite(audioDur) && audioDur > 1) {
      duration = Math.ceil((audioDur + 2) * 10) / 10; // +2s CTA hold
      await page.evaluate((d) => {
        window.__explainer.duration = d;
        // HTML keeps its own DURATION let — force via seek clamp by patching
        if (typeof window.__explainer.setDuration === 'function') window.__explainer.setDuration(d);
      }, duration);
      // Also update HTML-side DURATION if exposed later; seek uses page DURATION const/let
      await page.evaluate((d) => {
        try {
          // best-effort: redefine via Function on __explainer for drawFrame clamp
          const prev = window.__explainer.seek;
          window.__explainer.duration = d;
        } catch (_) {}
      }, duration);
    }
  } catch (e) {
    console.log('ffprobe skip', String(e));
  }
} else {
  console.log('WARN: narration-indextts.wav missing — using page/cues duration', duration);
  // silent stub: render without audio track pad from cues
}

const fps = 30;
const totalFrames = Math.round(duration * fps);
console.log('meta', { duration, fps, totalFrames, noNarrator: !!process.env.NO_NARRATOR });

await page.evaluate(() => {
  const s = document.getElementById('status');
  const c = document.getElementById('controls');
  if (s) s.style.display = 'none';
  if (c) c.style.display = 'none';
});

const ffArgs = [
  '-y',
  '-f', 'image2pipe',
  '-framerate', String(fps),
  '-i', 'pipe:0'
];
if (fs.existsSync(WAV)) {
  ffArgs.push('-i', WAV, '-af', `apad=whole_dur=${duration}`, '-c:a', 'aac', '-b:a', '192k');
} else {
  // generate silent audio so mp4 has an aac track
  ffArgs.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`, '-c:a', 'aac', '-b:a', '128k');
}
ffArgs.push(
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'veryfast',
  '-crf', '18',
  '-t', String(duration),
  '-movflags', '+faststart',
  '-shortest',
  OUT_MP4
);

const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

let stillSaved = false;
for (let i = 0; i < totalFrames; i++) {
  const t = i / fps;
  await page.evaluate(async (tt) => {
    await window.__explainer.seek(tt);
  }, t);
  const b64 = await page.evaluate(() => {
    return window.__explainer.canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
  });
  const buf = Buffer.from(b64, 'base64');
  const ok = ff.stdin.write(buf);
  if (!ok) await new Promise((r) => ff.stdin.once('drain', r));

  if (!stillSaved && Math.abs(t - STILL_T) < (1 / fps)) {
    const stillB64 = await page.evaluate(() => window.__explainer.canvas.toDataURL('image/png').split(',')[1]);
    fs.writeFileSync(OUT_STILL, Buffer.from(stillB64, 'base64'));
    stillSaved = true;
    console.log('still', OUT_STILL, '@', STILL_T);
  }
  if (i % 90 === 0) console.log(`frame ${i}/${totalFrames} t=${t.toFixed(2)}`);
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
