import { db } from "@/db";
import { gameProgress, gameSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, level, moves, timeSeconds, highestLevel } = body;

    if (!deviceId || typeof level !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await db.insert(gameProgress).values({
      deviceId,
      level,
      moves: moves ?? 0,
      timeSeconds: timeSeconds ?? 0,
    });

    if (typeof highestLevel === "number") {
      const existing = await db
        .select()
        .from(gameSettings)
        .where(eq(gameSettings.deviceId, deviceId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(gameSettings)
          .set({
            highestLevel: Math.max(existing[0].highestLevel, highestLevel),
            updatedAt: new Date(),
          })
          .where(eq(gameSettings.deviceId, deviceId));
      } else {
        await db.insert(gameSettings).values({
          deviceId,
          highestLevel,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Progress save error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }

    const settings = await db
      .select()
      .from(gameSettings)
      .where(eq(gameSettings.deviceId, deviceId))
      .limit(1);

    const progress = await db
      .select()
      .from(gameProgress)
      .where(eq(gameProgress.deviceId, deviceId))
      .orderBy(gameProgress.completedAt)
      .limit(50);

    return NextResponse.json({
      highestLevel: settings[0]?.highestLevel ?? 1,
      progress,
    });
  } catch (error) {
    console.error("Progress load error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
