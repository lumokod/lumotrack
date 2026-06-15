import { render } from "@react-email/render";
import { createElement } from "react";
import { resend, FROM } from "./client";
import { ReviewRequestEmail } from "./templates/ReviewRequestEmail";

export async function sendReviewRequestEmail(
  email: string,
  shipmentContent: string,
  reviewUrl: string,
) {
  const html = await render(
    createElement(ReviewRequestEmail, { shipmentContent, reviewUrl }),
  );

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "How was your delivery? Leave a review",
    html,
  });
}
