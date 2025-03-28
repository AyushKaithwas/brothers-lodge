import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rooms - Get all rooms
export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
