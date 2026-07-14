import { NextResponse } from "next/server";

export async function GET() {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USERNAME || process.env.SMTP_USER || "";
  const username = process.env.SMTP_USERNAME || process.env.SMTP_USER || fromEmail;
  const appPassword = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS || "";

  return NextResponse.json({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || "587",
    fromEmail: fromEmail || username,
    fromName: process.env.SMTP_FROM_NAME || "Little Dates Club",
    username,
    appPassword,
  });
}
