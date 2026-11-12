import { accruedPayroll, monthlyPayroll, officeCost, weeklySalary, weeksUntilPayday } from './staff.js';

const officeLabel = '周办公开支';
const payrollLabel = '月薪发放';
const legacyPayrollLabel = '团队工资与办公开支';
export const commissionPaymentLabel = '委托回款 · ';

export function latestSettlement(game) {
  const payrollIndex = game.ledger.findIndex(entry => entry.label === officeLabel || entry.label === legacyPayrollLabel);
  if (payrollIndex < 0) return null;
  const payroll = game.ledger[payrollIndex];
  let revenue = 0;
  let commissionRevenue = 0;
  let expense = -payroll.amount;
  let closing = game.cash;
  for (let index = 0; index < payrollIndex; index++) {
    const entry = game.ledger[index];
    if (entry.year === payroll.year && entry.week === payroll.week && entry.label === payrollLabel) {
      expense -= entry.amount;
    } else if (entry.year === payroll.year && entry.week === payroll.week && entry.amount > 0) {
      revenue += entry.amount;
      if (entry.label.startsWith(commissionPaymentLabel)) commissionRevenue += entry.amount;
    } else closing -= entry.amount;
  }
  return { year: payroll.year, week: payroll.week, revenue, commissionRevenue, expense, net: revenue - expense, closing };
}

export function record(game, label, amount) {
  game.cash += amount;
  game.ledger.unshift({ year: game.year, week: Math.min(game.week, 52), label, amount });
}

export function upcomingOperatingCosts(game, operating) {
  const accrued = accruedPayroll(game) + weeklySalary(monthlyPayroll(game));
  return {
    office: operating ? officeCost(Boolean(game.project)) : 0,
    payroll: weeksUntilPayday(game) === 1 ? accrued : 0,
    accrued,
  };
}

export function settleOperatingCosts(game, operating) {
  const { office, payroll, accrued } = upcomingOperatingCosts(game, operating);
  if (operating) record(game, officeLabel, -office);
  game.accruedPayroll = accrued;
  if (payroll) {
    if (!operating) record(game, officeLabel, 0);
    record(game, payrollLabel, -payroll);
    game.accruedPayroll = 0;
  }
}
