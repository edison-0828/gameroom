import { accruedPayroll, monthlyPayroll, officeCost, weeklySalary, weeksUntilPayday } from './staff.js';

const officeLabel = '周办公开支';
const payrollLabel = '月薪发放';
const legacyPayrollLabel = '团队工资与办公开支';

export function latestSettlement(game) {
  const payrollIndex = game.ledger.findIndex(entry => entry.label === officeLabel || entry.label === legacyPayrollLabel);
  if (payrollIndex < 0) return null;
  const payroll = game.ledger[payrollIndex];
  let revenue = 0;
  let expense = -payroll.amount;
  let closing = game.cash;
  for (let index = 0; index < payrollIndex; index++) {
    const entry = game.ledger[index];
    if (entry.year === payroll.year && entry.week === payroll.week && entry.label === payrollLabel) {
      expense -= entry.amount;
    } else if (entry.year === payroll.year && entry.week === payroll.week && entry.amount > 0) {
      revenue += entry.amount;
    } else closing -= entry.amount;
  }
  return { year: payroll.year, week: payroll.week, revenue, expense, net: revenue - expense, closing };
}

export function record(game, label, amount) {
  game.cash += amount;
  game.ledger.unshift({ year: game.year, week: Math.min(game.week, 52), label, amount });
}

export function settleOperatingCosts(game, operating) {
  if (operating) record(game, officeLabel, -officeCost(Boolean(game.project)));
  game.accruedPayroll = accruedPayroll(game) + weeklySalary(monthlyPayroll(game));
  if (weeksUntilPayday(game) === 1 && accruedPayroll(game)) {
    if (!operating) record(game, officeLabel, 0);
    record(game, payrollLabel, -accruedPayroll(game));
    game.accruedPayroll = 0;
  }
}
