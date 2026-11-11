import { checkpointSlots, deleteSave, readCheckpoint, readSave, writeCheckpoint, writeSave } from '../core/storage.js';
import { checkpointList, savePeriod } from './settings-screen.js';
import { confirm, el, escapeHtml, modal, money } from '../ui.js?v=2';

function availableSaves() {
  const auto = readSave();
  const entries = auto?.companyName ? [{ slot: 0, save: auto }] : [];
  for (const slot of checkpointSlots) {
    const save = readCheckpoint(slot);
    if (save?.companyName) entries.push({ slot, save });
  }
  return entries;
}

const saveLabel = slot => slot ? '手动存档 ' + slot : '自动存档';
const saveChoiceLabel = ({ slot, save }) => '<span class="save-choice-title">' + saveLabel(slot) + ' · ' +
  escapeHtml(save.companyName) + (save.liquidation ? ' · 已清算' : '') + '</span><span class="save-choice-details">' + escapeHtml(savePeriod(save)) +
  ' · 现金 ' + money(save.cash) + ' · 已发售 ' + save.games.length + ' 款</span>';

function confirmDeleteSave({ slot, save }, onResult) {
  modal('删除' + saveLabel(slot) + '？', escapeHtml(save.companyName) + ' · ' + escapeHtml(savePeriod(save)) +
    '。删除后无法恢复。', [['确认删除', () => {
      const current = slot ? readCheckpoint(slot) : readSave();
      if (JSON.stringify(current) !== JSON.stringify(save)) {
        onResult('这份存档已变化，请重新选择。');
        return;
      }
      const deleted = deleteSave(slot);
      onResult(deleted ? '已删除' + saveLabel(slot) + '。' : '删除失败，请检查浏览器存储。');
    }]]);
  el('modal').querySelector('[data-action="dismiss"]').focus();
}

export function renderTitle() {
  const saves = availableSaves();
  el('enter-game').textContent = saves.length === 1 && saves[0].save.liquidation ? '查看清算' : saves.length ? '继续游戏' : '开始游戏';
  el('title-save').hidden = !saves.length;
  el('new-game').hidden = !saves.length;
  el('manage-saves').hidden = !saves.length;
  if (saves.length > 1) el('title-save').textContent = '有 ' + saves.length + ' 份存档可选';
  else if (saves.length === 1) {
    const { save } = saves[0];
    el('title-save').textContent = save.companyName + ' · ' + savePeriod(save) + (save.liquidation ? ' · 已清算' : '');
  }
}

export function createSaveActions({ isTitle, enterGame, getGame, loadGame }) {
  return {
    enter() {
      if (!isTitle()) return;
      const saves = availableSaves();
      if (saves.length <= 1) {
        enterGame(saves[0]);
        return;
      }
      const options = saves.map(entry => [saveChoiceLabel(entry), () => enterGame(entry), entry.slot === 0]);
      modal('选择存档', '读取手动存档后，它会成为当前的自动存档。', options);
    },
    managesaves() {
      if (!isTitle()) return;
      const saves = availableSaves();
      el('title-save-status').textContent = '';
      if (!saves.length) { renderTitle(); return; }
      const options = saves.map(entry => [saveChoiceLabel(entry), () => {
        confirmDeleteSave(entry, message => {
          renderTitle();
          el('title-save-status').textContent = message;
          (el('manage-saves').hidden ? el('enter-game') : el('manage-saves')).focus();
        });
      }]);
      modal('管理存档', '选择要删除的存档。', options);
    },
    newgame() {
      if (!isTitle()) return;
      if (readSave()?.companyName) confirm('开始新游戏？', '成立新工作室后会替换当前自动存档。', () => enterGame());
      else enterGame();
    },
    savecheckpoint(value) {
      if (!getGame().companyName) return;
      const slot = Number(value);
      const statusId = 'checkpoint-status-' + slot;
      if (!el(statusId)) return;
      const storeCheckpoint = () => {
        const saved = writeCheckpoint(slot, getGame());
        if (saved) {
          el('checkpoint-list').innerHTML = checkpointList(true);
          document.querySelector('[data-action="savecheckpoint-' + slot + '"]').focus({ preventScroll: true });
        }
        el(statusId).textContent = saved ? '已保存到存档 ' + slot + '。' : '保存失败，请检查浏览器存储。';
      };
      if (readCheckpoint(slot)) confirm('覆盖存档 ' + slot + '？', '当前进度会替换这格存档。', storeCheckpoint);
      else storeCheckpoint();
    },
    loadcheckpoint(value) {
      const slot = Number(value);
      const statusId = 'checkpoint-status-' + slot;
      if (!el(statusId)) return;
      const saved = readCheckpoint(slot);
      if (!saved) {
        el(statusId).textContent = '读取失败，这格存档不可用。';
        return;
      }
      confirm('读取存档 ' + slot + '？', '读取后，这格存档会成为当前进度，并替换自动存档。', () => {
        if (!writeSave(saved)) {
          el(statusId).textContent = '读取失败，无法更新自动存档。';
          return;
        }
        loadGame(saved);
        if (saved.liquidation) { el('screen').focus(); return; }
        el('checkpoint-list').innerHTML = checkpointList(Boolean(getGame().companyName));
        document.querySelector('[data-action="loadcheckpoint-' + slot + '"]').focus({ preventScroll: true });
        el(statusId).textContent = '已读取存档 ' + slot + '。';
      });
    },
    deletecheckpoint(value) {
      const slot = Number(value);
      const save = readCheckpoint(slot);
      if (!save || !el('checkpoint-list')) return;
      confirmDeleteSave({ slot, save }, message => {
        el('checkpoint-list').innerHTML = checkpointList(Boolean(getGame().companyName));
        el('checkpoint-status-' + slot).textContent = message;
        document.querySelector('[data-action="savecheckpoint-' + slot + '"]').focus({ preventScroll: true });
      });
    },
  };
}
