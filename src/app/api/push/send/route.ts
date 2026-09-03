import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import webpush from "web-push";
import { NextRequest, NextResponse } from "next/server";

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey
  );
}

export async function POST(request: NextRequest) {
  try {
    configureVapid();
  } catch (error) {
    console.error("VAPID config error:", error);
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { title = "물 정렬 퍼즐", message = "새 스테이지에 도전해 보세요!" } = body;

    const subs = await db.select().from(pushSubscriptions);
    const results = await Promise.allSettled(
      subs.map((row) =>
        webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          JSON.stringify({ title, body: message })
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ sent, failed, total: subs.length });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
