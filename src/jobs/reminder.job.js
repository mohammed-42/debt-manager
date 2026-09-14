const cron = require("node-cron");
const { checkAndSendReminders } = require("../services/reminder.service");

function startReminderJob() {
  // Runs daily at 9:00 AM server time
  cron.schedule("0 9 * * *", async () => {
    try {
      await checkAndSendReminders();
      console.log("Reminder job ran successfully");
    } catch (err) {
      console.error("Reminder job failed:", err);
    }
  });
}

module.exports = { startReminderJob };