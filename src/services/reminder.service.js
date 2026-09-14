const prisma = require("../config/db");
const { sendReminderEmail, sendOverdueEmail } = require("./email.service");

const REMINDER_WINDOW_DAYS = 3;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function checkAndSendReminders() {
  const debts = await prisma.debt.findMany({
    where: { status: "active" },
    include: { user: true },
  });

  const today = startOfToday();
  const monthStart = startOfMonth();

  for (const debt of debts) {
    const dueDateThisCycle = new Date(today.getFullYear(), today.getMonth(), debt.dueDay);
    dueDateThisCycle.setHours(0, 0, 0, 0);

    const existingPayment = await prisma.payment.findFirst({
      where: { debtId: debt.id, paidAt: { gte: monthStart } },
    });

    if (existingPayment) continue;

    const daysUntilDue = Math.round((dueDateThisCycle - today) / (1000 * 60 * 60 * 24));
    const dueDateStr = dueDateThisCycle.toDateString();

    if (daysUntilDue >= 0 && daysUntilDue <= REMINDER_WINDOW_DAYS) {
      await sendReminderEmail(debt.user.email, debt.name, daysUntilDue, dueDateStr);
    } else if (daysUntilDue < 0) {
      await sendOverdueEmail(debt.user.email, debt.name, dueDateStr);
    }
  }
}

module.exports = { checkAndSendReminders };