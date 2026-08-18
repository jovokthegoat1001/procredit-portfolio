// Sends mail via Gmail SMTP using an app password on a single Workspace
// account (SMTP_USER). Mail can only be sent "from" SMTP_USER itself.
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const user = Deno.env.get("SMTP_USER")!;
  const pass = Deno.env.get("SMTP_PASS")!;

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({ from: user, to, subject, html, content: "text/html" });
  } finally {
    await client.close();
  }
}
