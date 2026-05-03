const { Resend } = require("resend");

let client = null;

function getClient() {
  if (client) return client;
  if (!process.env.RESEND_API_KEY) return null;
  client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

exports.sendMail = async ({ to, subject, html }) => {
  const resend = getClient();

  if (!resend) {
    console.log(`[MAIL DEV] to=${to} | subject=${subject}`);
    return;
  }

  const from = process.env.EMAIL_FROM || "Dam17+1 <no-reply@clipdam18.com>";

  const { error } = await resend.emails.send({ from, to, subject, html });

  if (error) {
    console.error("[MAIL ERROR]", error);
    throw error;
  }
};
