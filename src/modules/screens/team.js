import { resignationMood } from '../../core/events.js';
import { candidates, canHire, canRaise, capacity, grade, monthlyPayroll, raiseAmount, replacementFor, roleLimit, roles, staffCount, staffLimit, teamReady, technique, weeksUntilPayday } from '../../core/staff.js';
import { concepts } from '../../core/project-catalog.js';
import { button, card, escapeHtml, money } from '../../ui.js?v=2';
import { line, label } from './common.js';

const roleNames = Object.fromEntries(roles);

function profile(person) {
  const skill = technique(person);
  const specialties = Object.entries(person.experience ?? {}).filter(([type]) => concepts[type])
    .sort((a, b) => b[1] - a[1]).slice(0, 2);
  return '<h3>' + person.name + ' · ' + roleNames[person.role] + '</h3>' +
    '<div class="badges"><span class="tag staff-grade" data-grade="' + grade(skill) + '">' + grade(skill) + '</span>' +
    label('技术 ' + skill + '/100') + label(person.personality) +
    label('心情 ' + person.mood) + label('忠诚度 ' + person.loyalty) +
    (person.mood <= resignationMood ? '<span class="tag loss">有离职风险</span>' : '') + '</div>' +
    (person.completedProjects ? '<p class="small">参与完成 ' + person.completedProjects + ' 款作品 · 类型经验 ' +
      specialties.map(([type, count]) => concepts[type].genre + ' ' + count + ' 次').join('、') + '</p>' : '');
}

export function team(game, role) {
  const ready = teamReady(game);
  const filled = staffCount(game, role) >= roleLimit(game, role);
  const available = candidates.filter(person => person.role === role && (!filled || person.unlock > 1) &&
    person.unlock <= game.companyLevel + 1 && !game.crew.some(member => member.id === person.id))
    .filter(person => {
      const replaced = replacementFor(game, person);
      return !replaced || technique(person) > technique(replaced);
    });
  const unlocked = available.filter(person => person.unlock <= game.companyLevel)
    .sort((a, b) => b.unlock - a.unlock || a.fee - b.fee);
  const shortlist = game.companyLevel === 1 ? unlocked : [...new Set([...unlocked.slice(0, 2), ...unlocked.slice().sort((a, b) => a.fee - b.fee).slice(0, 1)])];
  const lockedCandidate = available.find(person => person.unlock > game.companyLevel);
  if (lockedCandidate) shortlist.push(lockedCandidate);
  return card('<div class="eyebrow">第 2 步 / 招聘员工</div><h2>团队编制</h2>' +
    '<p class="small">立项最低需要开发 2 名，产品、美工、测试、市场各 1 名。公司每升一级，各岗位编制翻倍。</p>' +
    '<div class="staff-checklist">' + roles.map(([id, name]) => {
      const count = staffCount(game, id);
      return '<button type="button" class="btn" data-action="role-' + id + '" aria-pressed="' + (id === role) + '">' +
        name + '<b>' + count + '/' + roleLimit(game, id) + '</b></button>';
    }).join('') + '</div>' +
    line('在职 / 总编制', game.crew.length + ' / ' + staffLimit(game)) +
    line('每周可分配工时', capacity(game) + ' 格') + line('团队月薪合计', money(monthlyPayroll(game))) +
    line('下次发薪', '第 ' + game.year + ' 年 · W' + (game.week + weeksUntilPayday(game) - 1) + ' 周末')) +
    (ready ? card('<h3>已满足立项要求</h3><p class="small">有空位时可扩招，满编后可用高评级员工替换同岗位技术最低的成员。</p>' +
      button('前往研发','tab-research',true)) : '') +
    (shortlist.length ? shortlist.map(person => {
      const replaced = replacementFor(game, person);
      const locked = game.companyLevel < person.unlock;
      return card(profile(person) + line('招聘费用', money(person.fee)) + line('月薪', money(person.monthlySalary)) +
        (locked ? '<p class="small">公司 Lv.' + person.unlock + ' 解锁</p>' :
          canHire(game, person) ? button(replaced ? '替换' + replaced.name : '招聘' + person.name, 'hire-' + person.id, true) :
            '<p class="small">可用现金不足以支付招聘费并预留经营开支。</p>'));
    }).join('') : card('<p class="small">这个岗位当前没有更合适的候选人。</p>')) +
    (game.crew.length ? '<details class="card"><summary>在职成员 · ' + game.crew.length + ' 人</summary>' + game.crew.map(person =>
      '<div class="employee">' + profile(person) + line('月薪', money(person.monthlySalary)) +
      '<div class="staff-actions">' + (canRaise(game, person) ? button('加薪 +' + money(raiseAmount(person)), 'raise-' + person.id) :
        '<button type="button" class="btn" disabled>暂不可加薪</button>') +
      button('解雇', 'release-' + person.id) + '</div></div>').join('') + '</details>' : '') +
    (game.eventHistory?.length ? '<details class="card"><summary>最近工作室事件</summary>' +
      game.eventHistory.map(event => '<div class="player-review"><h3>' + escapeHtml(event.name) + '</h3>' +
        '<p class="small">第 ' + event.year + ' 年 W' + event.week + ' · ' + escapeHtml(event.choice) + '</p>' +
        (event.reason ? '<p class="small">' + escapeHtml(event.reason) + '</p>' : '') +
        (event.effects ? '<p class="small">' + escapeHtml(event.effects) + '</p>' : '') + '</div>').join('') +
      '</details>' : '') +
    card(button('重新开局','restart'));
}
