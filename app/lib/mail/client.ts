import { Resend } from "resend";
import { env } from "@/core/env";

export const resend = new Resend(env.RESEND_API_KEY);
export const FROM = "LumoTrack <onboarding@resend.dev>";
