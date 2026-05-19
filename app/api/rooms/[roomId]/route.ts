import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/rooms/[roomId] — Load room with all active elements
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        elements: {
          where: { deletedAt: null },
          orderBy: { zIndex: "asc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Touch updatedAt to prevent auto-expiration
    await prisma.room.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to load room:", error);
    return NextResponse.json(
      { error: "Failed to load room" },
      { status: 500 }
    );
  }
}

// PATCH /api/rooms/[roomId] — Update room metadata
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const body = await request.json();
    const { name, viewportState } = body;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(name !== undefined && { name }),
        ...(viewportState !== undefined && { viewportState }),
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to update room:", error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[roomId] — Delete a room and all elements
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    await prisma.room.delete({ where: { id: roomId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
