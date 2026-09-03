import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, subscription } = body;

    if (!deviceId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "deviceId and subscription required" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.deviceId, deviceId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ subscription, createdAt: new Date() })
        .where(eq(pushSubscriptions.deviceId, deviceId));
    } else {
      await db.insert(pushSubscriptions).values({ deviceId, subscription });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
