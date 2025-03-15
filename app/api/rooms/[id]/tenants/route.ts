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

// DELETE /api/rooms/[id]/tenants - Delete all tenants for a specific room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const roomId = parseInt((await params).id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Delete all tenants for this room
    const deleteResult = await prisma.tenant.deleteMany({
      where: { roomId },
    });

    return NextResponse.json({
      message: `Deleted ${deleteResult.count} tenant(s) from room ${roomId}`,
      count: deleteResult.count,
    });
  } catch (error) {
    console.error("Error deleting tenants for room:", error);
    return NextResponse.json(
      { error: "Failed to delete tenants for room" },
      { status: 500 }
    );
  }
}
