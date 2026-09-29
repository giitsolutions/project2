import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code not found" },
      { status: 400 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("Gmail OAuth tokens received:");
    console.log(tokens);

    return NextResponse.json({
      success: true,
      message:
        "Gmail authorization successful. Check your terminal for the tokens.",
    });
  } catch (error) {
    console.error("Gmail OAuth error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to exchange authorization code for tokens",
      },
      { status: 500 }
    );
  }
}