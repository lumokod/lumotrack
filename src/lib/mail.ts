import { Resend } from "resend";
import { env } from "@/core/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, url: string) {
  await resend.emails.send({
    from: "LumoTrack <noreply@lumotrack.com>",
    to: email,
    subject: "Verify your email address",
    html: `
      <p>Thanks for signing up for LumoTrack.</p>
      <p><a href="${url}">Click here to verify your email address</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}
