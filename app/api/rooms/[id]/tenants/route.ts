import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rooms/[id]/tenants - Get all tenants for a specific room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const roomId = parseInt((await params).id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const tenants = await prisma.tenant.findMany({
      where: {
        roomId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants for room:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants for room" },
      { status: 500 }
    );
  }
}
