const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCENES_DIR = path.join(__dirname, 'scenes');
const CLIPS_DIR = path.join(__dirname, 'clips');

if (!fs.existsSync(CLIPS_DIR)) {
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
}

const SCENE_CONFIGS = [
  { id: 1, duration: 7.50 },
  { id: 2, duration: 10.90 },
  { id: 3, duration: 12.20 },
  { id: 4, duration: 10.60 },
  { id: 5, duration: 16.00 },
  { id: 6, duration: 12.20 },
  { id: 7, duration: 12.60 },
  { id: 8, duration: 10.70 },
  { id: 9, duration: 10.60 },
  { id: 10, duration: 8.48 }
];

async function renderSceneVideo(page, sceneConfig) {
  const sceneNum = String(sceneConfig.id).padStart(2, '0');
  const htmlPath = path.join(SCENES_DIR, `scene_${sceneNum}.html`);
  const outMp4 = path.join(CLIPS_DIR, `scene_${sceneNum}.mp4`);

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Scene file missing: ${htmlPath}`);
  }

  const duration = sceneConfig.duration;
  const fps = 30;
  const totalFrames = Math.round(duration * fps);

  console.log(`🎬 Rendering Scene ${sceneNum} (${duration.toFixed(2)}s, ${totalFrames} frames @ ${fps}fps)...`);
  const t0 = Date.now();

  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.evaluate(() => window.renderAt && window.renderAt(0));

  // Spawn FFmpeg receiving image stream via stdin
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    outMp4
  ]);

  let ffmpegErr = '';
  ffmpeg.stderr.on('data', d => { ffmpegErr += d.toString(); });

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    await page.evaluate((timestamp) => {
      if (window.renderAt) window.renderAt(timestamp);
    }, t);

    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });

    const ok = ffmpeg.stdin.write(buf);
    if (!ok) {
      await new Promise(r => ffmpeg.stdin.once('drain', r));
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${ffmpegErr}`));
    });
  });

  const elapsed = (Date.now() - t0) / 1000;
  const sizeMb = fs.statSync(outMp4).size / (1024 * 1024);
  console.log(`  ✅ Scene ${sceneNum} built in ${elapsed.toFixed(1)}s -> ${outMp4} (${sizeMb.toFixed(2)} MB, ${(totalFrames / elapsed).toFixed(1)} fps)`);
}

async function main() {
  console.log('============================================================');
  console.log('🚀 GhostGeist: Rendering 10 Full Animated Video Clips');
  console.log('============================================================');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  const totalStart = Date.now();

  for (const cfg of SCENE_CONFIGS) {
    await renderSceneVideo(page, cfg);
  }

  await browser.close();

  const totalElapsed = (Date.now() - totalStart) / 1000;
  console.log('============================================================');
  console.log(`🎉 All 10 animated clips rendered successfully in ${totalElapsed.toFixed(1)}s!`);
  console.log('============================================================');
}

main().catch(err => {
  console.error('Fatal error rendering scene videos:', err);
  process.exit(1);
});
