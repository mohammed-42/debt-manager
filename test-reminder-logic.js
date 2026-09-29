const prisma = require("./src/config/db");

async function test() {
  const debts = await prisma.debt.findMany({
    where: { status: "active" },
    include: { user: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today);
  monthStart.setDate(1);

  for (const debt of debts) {
    const dueDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      debt.dueDay
    );
    dueDate.setHours(0, 0, 0, 0);

    const payments = await prisma.payment.findMany({
      where: {
        debtId: debt.id,
        paidAt: { gte: monthStart },
      },
      select: {
        amount: true,
      },
    });

    const totalPaid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    const required =
      debt.debtType === "credit_card"
        ? Number(debt.minimumPayment || 0)
        : Number(debt.monthlyRepayment || 0);

    const remaining = Math.max(0, required - totalPaid);

    const daysUntilDue = Math.round(
      (dueDate - today) / (1000 * 60 * 60 * 24)
    );

    console.log({
      debt: debt.name,
      dueDay: debt.dueDay,
      required,
      totalPaid,
      remaining,
      daysUntilDue,
      shouldRemind: remaining > 0,
      type: daysUntilDue < 0 ? "OVERDUE" : "BEFORE/ON DUE DATE",
    });
  }

  await prisma.$disconnect();
}

test().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
});