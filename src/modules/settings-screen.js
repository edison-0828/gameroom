import { checkpointSlots, readCheckpoint, readSave } from '../core/storage.js';
import { card, escapeHtml, money } from '../ui.js?v=2';

export function savePeriod(save) {
  return '第 ' + save.year + ' 年 · ' + (save.week > 52 ? '年末' : '第 ' + save.week + ' 周');
}

export function autoSaveSummary() {
  const save = readSave();
  if (!save?.companyName) return '<p class="small">成立工作室后开始自动保存。</p>';
  const savedAt = Number.isFinite(save.autoSavedAt) ? new Date(save.autoSavedAt).toLocaleString('zh-CN') : '';
  return '<p class="small">' + escapeHtml(save.companyName) + ' · ' + escapeHtml(savePeriod(save)) + '</p>' +
    (savedAt ? '<p class="small">最近保存 ' + escapeHtml(savedAt) + '</p>' : '');
}

export function checkpointList(canSave) {
  return checkpointSlots.map(slot => {
    const checkpoint = readCheckpoint(slot);
    const details = checkpoint ? '<p class="checkpoint-company">' + escapeHtml(checkpoint.companyName) + '</p>' +
      '<p class="small">' + savePeriod(checkpoint) +
      ' · 现金 ' + money(checkpoint.cash) + ' · 已发售 ' + checkpoint.games.length + ' 款</p>' : '<p class="small">空存档</p>';
    return '<section class="checkpoint-slot" aria-labelledby="checkpoint-title-' + slot + '">' +
      '<h3 id="checkpoint-title-' + slot + '">存档 ' + slot + '</h3>' + details +
      '<div class="checkpoint-actions"><button type="button" class="btn' + (checkpoint ? '' : ' primary') +
      '" data-action="savecheckpoint-' + slot + '"' + (canSave ? '' : ' disabled') + '>' +
      (checkpoint ? '覆盖' : '保存') + '</button>' +
      (checkpoint ? '<button type="button" class="btn primary" data-action="loadcheckpoint-' + slot + '">读取</button>' : '') +
      (checkpoint ? '<button type="button" class="btn danger" data-action="deletecheckpoint-' + slot + '">删除</button>' : '') +
      '</div><p id="checkpoint-status-' + slot + '" class="small checkpoint-status" role="status"></p></section>';
  }).join('');
}

export function settingsScreen(audio, canSave) {
  return card('<h2>声音</h2>' +
    '<div class="settings-row"><label for="audio-volume">总音量</label>' +
    '<output id="volume-value" for="audio-volume">' + audio.volume + '%</output></div>' +
    '<input id="audio-volume" type="range" min="0" max="100" value="' + audio.volume + '">' +
    '<label class="settings-row" for="audio-music">背景音乐<input id="audio-music" type="checkbox"' +
    (audio.music ? ' checked' : '') + '></label>' +
    '<label class="settings-row" for="audio-effects">音效<input id="audio-effects" type="checkbox"' +
    (audio.effects ? ' checked' : '') + '></label>' +
    '<button id="audio-preview" type="button" class="btn" data-action="previewsound"' +
    (!audio.effects || !audio.volume ? ' disabled' : '') + '>试听音效</button>' +
    '<p id="audio-status" class="small" role="status"></p>') +
    card('<h2>存档</h2><div class="checkpoint-slot"><h3>自动存档</h3>' +
    '<p class="small">每周结算和经营操作后自动保存。</p><div id="autosave-summary"></div></div>' +
    '<p class="small">最多 3 个手动存档。</p>' +
    '<div id="checkpoint-list">' + checkpointList(canSave) + '</div>');
}
