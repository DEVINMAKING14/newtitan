/* ===== Titan Edge — Scroll-Based Product Page ===== */

const TOTAL_FRAMES = 240;
const USABLE_FRAMES = 205; // frames 206+ have baked-in text
const FRAME_PATH = '/frames/frame_';

// State
let images = [];
let loadedCount = 0;
let currentFrame = 0;
let canvas, ctx;
let isLoaded = false;
let scrollY = 0;
let ticking = false;

// DOM refs
const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPercent = document.getElementById('loaderPercent');
const navbar = document.getElementById('navbar');

// ===== Frame Preloader =====
function getFramePath(index) {
  const num = String(index + 1).padStart(6, '0');
  return `${FRAME_PATH}${num}.jpg`;
}

function preloadFrames() {
  return new Promise((resolve) => {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loadedCount++;
        const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        loaderFill.style.width = `${pct}%`;
        loaderPercent.textContent = `${pct}%`;
        if (loadedCount === TOTAL_FRAMES) {
          resolve();
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) resolve();
      };
      images[i] = img;
    }
  });
}

// ===== Canvas Renderer =====
function initCanvas() {
  canvas = document.getElementById('frameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (isLoaded) drawFrame(currentFrame);
}

function drawFrame(index, fraction = 0) {
  const img = images[index];
  if (!img || !img.complete) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // Cover fit
  const scale = Math.max(cw / iw, ch / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const sx = (cw - sw) / 2;
  const sy = (ch - sh) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, sx, sy, sw, sh);

  // Subtle dark vignette overlay for depth
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, cw, ch);

  // Extra dark overlay for CTA section (last 20% of scroll)
  if (fraction > 0.75) {
    const ctaOpacity = Math.min((fraction - 0.75) / 0.12, 0.4);
    ctx.fillStyle = `rgba(0, 0, 0, ${ctaOpacity})`;
    ctx.fillRect(0, 0, cw, ch);
  }
}

// ===== Scroll → Frame Mapping =====
function getScrollFraction() {
  const scrollContainer = document.getElementById('scrollContainer');
  const maxScroll = scrollContainer.scrollHeight - window.innerHeight;
  return Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
}

function updateFrame() {
  const fraction = getScrollFraction();
  const frameIndex = Math.min(
    Math.floor(fraction * USABLE_FRAMES),
    USABLE_FRAMES - 1
  );

  if (frameIndex !== currentFrame) {
    currentFrame = frameIndex;
    drawFrame(currentFrame, fraction);
  }

  // Update section visibility
  updateSections(fraction);
  updateNavbar(fraction);
}

// ===== Section Animations =====
const sections = [
  { id: 'sectionHero', start: -0.01, end: 0.18, peak: 0.02 },
  { id: 'sectionPrecision', start: 0.15, end: 0.38, peak: 0.26 },
  { id: 'sectionCraft', start: 0.35, end: 0.58, peak: 0.46 },
  { id: 'sectionEngineering', start: 0.55, end: 0.78, peak: 0.66 },
  { id: 'sectionCTA', start: 0.78, end: 1.0, peak: 0.88 },
];

function updateSections(fraction) {
  sections.forEach(({ id, start, end, peak }) => {
    const el = document.getElementById(id);
    if (!el) return;

    let opacity = 0;
    let translateY = 40;

    if (fraction >= start && fraction <= end) {
      if (fraction <= peak) {
        // Fade in
        const progress = (fraction - start) / (peak - start);
        opacity = Math.min(progress * 1.5, 1);
        translateY = 40 * (1 - progress);
      } else {
        // Fade out
        const progress = (fraction - peak) / (end - peak);
        opacity = Math.max(1 - progress * 1.5, 0);
        translateY = -30 * progress;
      }
    }

    el.style.opacity = opacity;
    el.style.transform = `translateY(${translateY}px)`;

    // Animate children staggered
    const cards = el.querySelectorAll('.feature-card, .craft-item, .spec-item');
    cards.forEach((card, i) => {
      const delay = i * 0.03;
      const cardProgress = Math.max(0, Math.min(1, (opacity - delay) / (1 - delay)));
      card.style.opacity = cardProgress;
      card.style.transform = `translateY(${20 * (1 - cardProgress)}px)`;
    });
  });
}

function updateNavbar(fraction) {
  if (fraction > 0.08) {
    navbar.classList.add('visible');
  } else {
    navbar.classList.remove('visible');
  }
}

// ===== Scroll Handler =====
function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateFrame();
      ticking = false;
    });
    ticking = true;
  }
}

// ===== Smooth scroll for nav links =====
function initNavLinks() {
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

// ===== Init =====
async function init() {
  initCanvas();

  await preloadFrames();
  isLoaded = true;

  // Draw first frame
  drawFrame(0, 0);
  updateFrame();

  // Hide loader
  loader.classList.add('hidden');

  // Listen for scroll
  window.addEventListener('scroll', onScroll, { passive: true });

  // Nav links
  initNavLinks();
}

init();
