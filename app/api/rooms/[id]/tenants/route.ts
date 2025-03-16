import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rooms/[id]/tenants - Get all tenants for a specific room
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const roomId = parseInt((await params).id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const tenants = await prisma.tenant.findMany({
      where: {
        roomId: roomId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id]/tenants - Delete all tenants for a specific room (empty the room)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const roomId = parseInt((await params).id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    // First, check if the room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Delete all tenants for the room
    const result = await prisma.tenant.deleteMany({
      where: {
        roomId: roomId,
      },
    });

    return NextResponse.json({
      message: `Room emptied successfully`,
      count: result.count,
    });
  } catch (error) {
    console.error("Error emptying room:", error);
    return NextResponse.json(
      { error: "Failed to empty room" },
      { status: 500 }
    );
  }
}
