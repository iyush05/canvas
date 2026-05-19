import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/rooms/[roomId]/elements — Batch create elements
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const { elements } = await request.json();

    if (!Array.isArray(elements) || elements.length === 0) {
      return NextResponse.json(
        { error: "elements must be a non-empty array" },
        { status: 400 }
      );
    }

    const created = await prisma.element.createMany({
      data: elements.map(
        (el: {
          id: string;
          type: string;
          data: object;
          style: object;
          posX: number;
          posY: number;
          width: number;
          height: number;
          rotation: number;
          zIndex: number;
        }) => ({
          ...el,
          roomId,
        })
      ),
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (error) {
    console.error("Failed to create elements:", error);
    return NextResponse.json(
      { error: "Failed to create elements" },
      { status: 500 }
    );
  }
}

// PATCH /api/rooms/[roomId]/elements — Batch update elements
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const { elements } = await request.json();

    if (!Array.isArray(elements) || elements.length === 0) {
      return NextResponse.json(
        { error: "elements must be a non-empty array" },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(
      elements.map(
        (el: { id: string } & Record<string, unknown>) =>
          prisma.element.update({
            where: { id: el.id, roomId },
            data: {
              ...(el.type !== undefined && { type: el.type as string }),
              ...(el.data !== undefined && { data: el.data as object }),
              ...(el.style !== undefined && { style: el.style as object }),
              ...(el.posX !== undefined && { posX: el.posX as number }),
              ...(el.posY !== undefined && { posY: el.posY as number }),
              ...(el.width !== undefined && { width: el.width as number }),
              ...(el.height !== undefined && { height: el.height as number }),
              ...(el.rotation !== undefined && {
                rotation: el.rotation as number,
              }),
              ...(el.zIndex !== undefined && { zIndex: el.zIndex as number }),
              version: { increment: 1 },
            },
          })
      )
    );

    return NextResponse.json({ count: results.length });
  } catch (error) {
    console.error("Failed to update elements:", error);
    return NextResponse.json(
      { error: "Failed to update elements" },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[roomId]/elements — Batch soft-delete elements
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    const { elementIds } = await request.json();

    if (!Array.isArray(elementIds) || elementIds.length === 0) {
      return NextResponse.json(
        { error: "elementIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await prisma.element.updateMany({
      where: { id: { in: elementIds }, roomId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error("Failed to delete elements:", error);
    return NextResponse.json(
      { error: "Failed to delete elements" },
      { status: 500 }
    );
  }
}
