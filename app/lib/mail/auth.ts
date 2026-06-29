import { render } from "@react-email/render";
import { createElement } from "react";
import { resend, FROM } from "./client";
import { VerificationEmail } from "./templates/VerificationEmail";

export async function sendVerificationEmail(email: string, url: string) {
  const html = await render(createElement(VerificationEmail, { url }));

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your email address",
    html,
  });
}
