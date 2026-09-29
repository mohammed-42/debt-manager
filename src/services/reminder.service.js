const prisma = require("../config/db");
const {
  sendReminderEmail,
  sendOverdueEmail,
} = require("./email.service");

const REMINDER_WINDOW_DAYS = 3;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCurrentCycleStart(today, dueDay) {
  const year = today.getFullYear();
  const month = today.getMonth();

  const dueDateThisMonth = new Date(year, month, dueDay);
  dueDateThisMonth.setHours(0, 0, 0, 0);

  if (today >= dueDateThisMonth) {
    return dueDateThisMonth;
  }

  return new Date(year, month - 1, dueDay);
}

async function checkAndSendReminders() {
  const debts = await prisma.debt.findMany({
    where: { status: "active" },
    include: { user: true },
  });

  const today = startOfDay(new Date());

  for (const debt of debts) {
    const dueDateThisMonth = startOfDay(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        debt.dueDay
      )
    );

    const cycleStart = getCurrentCycleStart(
      today,
      debt.dueDay
    );

    const paymentsThisCycle =
      await prisma.payment.findMany({
        where: {
          debtId: debt.id,
          paidAt: {
            gte: cycleStart,
          },
        },
        select: {
          amount: true,
        },
      });

    const totalPaidThisCycle =
      paymentsThisCycle.reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

    const requiredMonthlyPayment =
      debt.debtType === "credit_card"
        ? Number(debt.minimumPayment || 0)
        : Number(debt.monthlyRepayment || 0);

    const remainingMonthlyPayment =
      Math.max(
        0,
        requiredMonthlyPayment -
          totalPaidThisCycle
      );

    if (remainingMonthlyPayment === 0) {
      continue;
    }

    const daysUntilDue = Math.round(
      (dueDateThisMonth - today) /
        (1000 * 60 * 60 * 24)
    );

    const dueDateStr =
      dueDateThisMonth.toDateString();

    if (
      daysUntilDue >= 0 &&
      daysUntilDue <= REMINDER_WINDOW_DAYS
    ) {
      await sendReminderEmail(
        debt.user.email,
        debt.name,
        daysUntilDue,
        dueDateStr
      );
    } else if (daysUntilDue < 0) {
      await sendOverdueEmail(
        debt.user.email,
        debt.name,
        dueDateStr
      );
    }
  }
}

module.exports = {
  checkAndSendReminders,
};