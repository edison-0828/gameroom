import { commissions, commissionReason, sideWorkHours } from '../../core/side-work.js';
import { roles } from '../../core/staff.js';
import { button, card, escapeHtml, money } from '../../ui.js?v=2';

const roleNames = Object.fromEntries(roles);

export function commissionPanel(game, contractWorker) {
  if (game.commission) {
    const { kind, remaining } = game.commission;
    const { name, role, weeks, reward } = commissions[kind];
    return '<details class="card"><summary>外包委托 · 剩余 ' + remaining + ' 周</summary><h3>' + name +
      '</h3><div class="progress-label">交付进度 <b>' +
      (weeks - remaining) + ' / ' + weeks + ' 周</b></div><progress aria-label="委托交付进度" value="' +
      (weeks - remaining) + '" max="' + weeks + '"></progress><p class="small growth-note">' +
      (contractWorker ? roleNames[role] + '每周占用 ' + sideWorkHours + ' 格工时' : '缺少可用的' + roleNames[role] + '员工，委托暂停') +
      ' · 交付回款 ' + money(reward) + '</p>' + button('取消委托', 'cancelcommission') + '</details>';
  }
  const board = Object.entries(commissions).map(([kind, contract]) => {
    const reason = commissionReason(game, kind);
    return '<div class="purchase-option"><h3>' + contract.name + '</h3><p class="small">' +
      roleNames[contract.role] + ' · 每周 ' + sideWorkHours + ' 格 · ' + contract.weeks +
      ' 周 · 回款 ' + money(contract.reward) + '</p>' +
      (reason ? '<p class="small">' + reason + '</p>' : button('接单', 'commission-' + kind)) + '</div>';
  }).join('');
  const last = game.lastCommission;
  return '<details class="card"><summary>外包委托' + (last ? ' · 最近回款 ' + money(last.reward) : '') +
    '</summary><p class="small">接单会分走自研和更新的工时。交付后一次到账，下一批委托 5 周后到达。</p>' +
    board + '</details>';
}

export function trainingPanel(game, funded) {
  const member = game.crew.find(person => person.id === game.training?.memberId);
  const last = game.lastTraining;
  return card('<h3>员工培训</h3>' +
    (member ? '<p class="small">' + escapeHtml(member.name) + ' · 剩余 ' + game.training.remaining +
      ' 周 · ' + (funded ? '每周占用 ' + sideWorkHours + ' 格工时' : '资金不足，暂停培训') + '</p>' +
      button('停止培训', 'canceltraining') : '<p class="small">在「在职成员」选择培训。每次安排一人。</p>') +
    (last ? '<p class="small growth-note">最近结业 · ' + escapeHtml(last.name) + ' · 技术 +' + last.gain + '</p>' : '') +
    '<p class="small growth-note">' + (game.automationTrained ? '已掌握自动化测试。公司 Lv.2 可立项连锁机关沙盒。' :
      '测试员工完成自动化测试培训后，公司 Lv.2 可立项连锁机关沙盒。') + '</p>');
}
