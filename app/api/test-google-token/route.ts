import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
console.log('LEN:', process.env.GMAIL_REFRESH_TOKEN!.length,
     'START:', process.env.GMAIL_REFRESH_TOKEN!.slice(0,6), 
     'END:', process.env.GMAIL_REFRESH_TOKEN!.slice(-6));
    return NextResponse.json({
      status: response.status,
      success: response.ok,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Token request failed",
      },
      { status: 500 }
    );
  }
}