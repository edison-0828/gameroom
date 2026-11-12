import { awardFinalists, awards, releaseDate, rivalCalendar, standings } from '../../core/studio.js';
import { calendarWeek } from '../../core/events.js';
import { button, card, escapeHtml } from '../../ui.js?v=2';
import { line, label } from './common.js';

export function annual(game, year) {
  const board = standings(game, year);
  const results = game.years[year];
  const now = calendarWeek(game);
  const upcoming = year === game.year ? rivalCalendar(now + 1, now + 4) : [];
  const forecast = year === game.year ? card('<h3>未来 4 周竞品</h3>' +
    (upcoming.length ? upcoming.map(entry => '<div class="player-review"><h3>《' + entry.name +
      '》</h3><p class="small">' + entry.studio + ' · ' + entry.genre + ' · ' + releaseDate(entry.week) + '</p></div>').join('') :
      '<p class="small">未来 4 周暂无竞品发售。</p>')) : '';
  return '<section class="card annual-banner"><div class="year-switch">' + (year > 1 ? button('上一年','year-' + (year - 1)) : '<span></span>') +
    '<h2>第 ' + year + ' 年</h2>' + (year < game.year ? button('下一年','year-' + (year + 1)) : '<span></span>') +
    '</div></section>' + card('<h3>' + (results ? '最终榜单' : '实时榜单') + '</h3>' +
    '<ol class="leaderboard">' + board.map((title, index) => {
      const own = title.id.startsWith('own-');
      const team = title.id === 'own-0' ? '新人首作' : own ? '自家作品' : title.studio;
      return '<li class="leaderboard-row' + (own ? ' own-title' : '') + '"><span class="rank">' + (index + 1) + '</span>' +
        '<span class="rank-title"><strong>' + escapeHtml(title.name) + '</strong><small>' + team +
        '</small></span><b>' + title.score + ' 分</b></li>';
    }).join('') + '</ol>') + forecast +
    card('<h3>年度六大奖</h3><p class="small">' + (results ? '获奖与提名名单' : '首作可争取入围。从第二款作品起可争榜首和大奖，奖项在年末公布。') +
      '</p>' + awards.map(([field, name]) => {
        const candidates = results
          ? results[field].map(id => board.find(title => title.id === id))
          : awardFinalists(board, field);
        return '<div class="award"><h3>' + name + '</h3>' + candidates.map((title, index) => line(
          escapeHtml(title.name) + (title.id.startsWith('own-') ? '　' + label('自家') : ''),
          results && index === 0 ? '<span class="tag award-tag">◆ 获奖</span>' : '入围', title.id.startsWith('own-')
        )).join('') + '</div>';
      }).join(''));
}
