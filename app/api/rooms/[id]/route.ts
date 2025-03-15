import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rooms/[id] - Get a specific room
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const roomId = parseInt((await params).id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        tenants: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

// PATCH /api/rooms/[id] - Update a room
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const roomId = parseInt((await params).id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const body = await req.json();
    const { rentAmount } = body;

    // Validate the required fields
    if (rentAmount !== undefined && (isNaN(rentAmount) || rentAmount < 0)) {
      return NextResponse.json(
        { error: "Rent amount must be a valid positive number" },
        { status: 400 }
      );
    }

    // Check if the room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Update the room using the exact field name Prisma expects
    try {
      await prisma.$executeRaw`
        UPDATE "rooms" 
        SET "rent_amount" = ${rentAmount} 
        WHERE "id" = ${roomId}
      `;

      // Fetch the updated room to return
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      return NextResponse.json(room);
    } catch (updateError) {
      console.error("Error in raw SQL update:", updateError);
      return NextResponse.json(
        { error: "Failed to update room rent amount" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] - Delete a room
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const roomId = parseInt((await params).id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    // Check if the room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: { tenants: true },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if the room has tenants
    if (existingRoom.tenants.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete room with active tenants" },
        { status: 400 }
      );
    }

    // Delete the room
    await prisma.room.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
