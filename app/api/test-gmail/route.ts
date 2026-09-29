import { google } from "googleapis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = "anil.kumar.giit123@gmail.com";

function encodeMessage(message: string) {
  return Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function GET() {
  try {
    // Gmail authentication
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    // 👇 PUT THE TEST CODE HERE

    const testMessage = [
      `From: ${ADMIN_EMAIL}`,
      `To: ${ADMIN_EMAIL}`,
      "Subject: PriceMyTrip Gmail API Test",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      "Hello Anil,",
      "",
      "This is a direct Gmail API test from PriceMyTrip.",
      "",
      "If you receive this email, Gmail API sending is working.",
    ].join("\r\n");

    const raw = encodeMessage(testMessage);

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
      },
    });

    console.log("TEST MESSAGE ID:", result.data.id);

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully.",
      messageId: result.data.id,
    });

  } catch (error: any) {
    console.error("GMAIL TEST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Gmail test failed",
      },
      { status: 500 }
    );
  }
}