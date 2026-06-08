import { resend, FROM } from "./client";

export async function sendVerificationEmail(email: string, url: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your email address",
    html: `
      <p>Thanks for signing up for LumoTrack.</p>
      <p><a href="${url}">Click here to verify your email address</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}
