import { el } from '../ui.js?v=2';
import { playEffect } from '../core/audio.js';

const headings = { ready: '制作完成', release: '正式发售', award: '年度获奖' };
const colors = ['#9de5bd', '#ffd185', '#ffabb6', '#a6c5ff', '#d9afff'];
const queue = [];
let playing = false;

function particles(kind) {
  const result = [];
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('i');
    piece.className = 'pixel-confetti';
    piece.style.left = ((i * 37 + 9) % 100) + '%';
    piece.style.setProperty('--drift', ((i * 23) % 110 - 55) + 'px');
    piece.style.setProperty('--delay', (i % 8) * 55 + 'ms');
    piece.style.setProperty('--piece-color', colors[i % colors.length]);
    result.push(piece);
  }
  if (kind !== 'ready') {
    for (let i = 0; i < 7; i++) {
      const balloon = document.createElement('i');
      balloon.className = 'pixel-balloon';
      balloon.style.left = (5 + i * 14) + '%';
      balloon.style.setProperty('--drift', (i % 2 ? 16 : -16) + 'px');
      balloon.style.setProperty('--delay', ((i * 3) % 7) * 95 + 'ms');
      balloon.style.setProperty('--piece-color', colors[(i + 1) % colors.length]);
      result.push(balloon);
    }
  }
  return result;
}

function playNext() {
  if (playing || !queue.length || el('dialog').open) return;
  const { kind, detail } = queue.shift();
  const layer = el('milestone-layer');
  const card = el('milestone-card');
  const backdrop = el('milestone-particles');
  const icon = document.createElement('i');
  const title = document.createElement('strong');
  const caption = document.createElement('span');
  icon.className = 'milestone-icon';
  icon.setAttribute('aria-hidden', 'true');
  title.textContent = headings[kind];
  caption.textContent = detail;
  layer.dataset.milestone = kind;
  card.replaceChildren(icon, title, caption);
  playEffect(kind);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) backdrop.replaceChildren(...particles(kind));
  playing = true;
  setTimeout(() => {
    card.replaceChildren();
    backdrop.replaceChildren();
    delete layer.dataset.milestone;
    playing = false;
    playNext();
  }, 2850);
}

export function celebrate(kind, detail) {
  queue.push({ kind, detail });
  playNext();
}

el('dialog').addEventListener('close', playNext);
