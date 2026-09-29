import { google } from "googleapis";
import { NextResponse } from "next/server";
import MailComposer from "nodemailer/lib/mail-composer";

export const runtime = "nodejs";

const ADMIN_EMAIL = "anil.kumar.giit123@gmail.com";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function buildRaw(opts: {
  to: string;
  subject: string;
  text: string;
  fileName: string;
  contentType: string;
  content: Buffer;
}) {
  const buf = await new MailComposer({
    from: `PriceMyTrip <${ADMIN_EMAIL}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: [
      {
        filename: opts.fileName,
        content: opts.content,
        contentType: opts.contentType,
      },
    ],
  })
    .compile()
    .build();

  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const email = String(formData.get("email") || "").trim();
    const report = formData.get("report") as File | null;
    const reportType = String(formData.get("reportType") || "");
    const field = (k: string) => String(formData.get(k) || "");

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report file is required." },
        { status: 400 }
      );
    }
    if (!["excel", "pdf"].includes(reportType)) {
      return NextResponse.json(
        { success: false, error: "Invalid report type." },
        { status: 400 }
      );
    }

    const content = Buffer.from(await report.arrayBuffer());
    const fileName =
      report.name ||
      (reportType === "excel" ? "zbc-trip.xlsx" : "zbc-trip.pdf");
    const contentType =
      reportType === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const details = [
      "Trip Details",
      "-------------------------",
      `Truck ID: ${field("truckId")}`,
      `Trip Type: ${field("tripType")}`,
      `Payload: ${field("payloadTons")} tons`,
      `Capacity: ${field("capacityTons")} tons`,
      "",
      `Origin: ${field("origin")}`,
      `Destination: ${field("destination")}`,
      "",
      `Distance: ${field("distanceKm")} km`,
      `Trip Days: ${field("tripDays")}`,
      "",
      `Total Cost: ₹${field("total")}`,
      "",
      `PTPK (Payload): ₹${field("ptpkPayload")}`,
      `PTPK (Capacity): ₹${field("ptpkCapacity")}`,
    ].join("\n");

    const subject = `PriceMyTrip Report - ${email}`;

    console.log("SENDING CUSTOMER EMAIL:", email, fileName, content.length, "bytes");

    const customerRaw = await buildRaw({
      to: email,
      subject,
      text: `Hello,\n\nPlease find your PriceMyTrip trip cost report attached.\n\n${details}\n\nRegards,\nPriceMyTrip`,
      fileName,
      contentType,
      content,
    });

    let customerId: string | null | undefined;
    try {
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: customerRaw },
      });
      customerId = res.data.id;
      console.log("CUSTOMER GMAIL MESSAGE ID:", customerId);
    } catch (err: any) {
      console.error("========== CUSTOMER EMAIL ERROR ==========");
      console.error("Message:", err?.message);
      console.error("Code:", err?.code);
      console.error("Response:", err?.response?.data);
      return NextResponse.json(
        { success: false, error: err?.message || "Failed to send report." },
        { status: 500 }
      );
    }

    try {
      const adminRaw = await buildRaw({
        to: ADMIN_EMAIL,
        subject,
        text: `Hello Anil,\n\nA PriceMyTrip report has been generated.\n\nRecipient Email: ${email}\n\n${details}\n\nThe generated report is attached.\n\nPriceMyTrip`,
        fileName,
        contentType,
        content,
      });
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: adminRaw },
      });
      console.log("ADMIN GMAIL MESSAGE ID:", res.data.id);
    } catch (err: any) {
      console.error("ADMIN EMAIL ERROR (customer email already sent):", err?.message);
    }

    return NextResponse.json({
      success: true,
      message: "Report sent successfully.",
      messageId: customerId,
    });
  } catch (error: any) {
    console.error("========== SEND REPORT ERROR ==========");
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Response:", error?.response?.data);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send report." },
      { status: 500 }
    );
  }
}