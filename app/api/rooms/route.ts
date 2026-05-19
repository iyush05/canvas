import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/rooms — Create a new room (optionally with initial elements)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, elements } = body as {
      name?: string;
      elements?: Array<{
        id: string;
        type: string;
        data: unknown;
        style: unknown;
        posX: number;
        posY: number;
        width: number;
        height: number;
        rotation: number;
        zIndex: number;
      }>;
    };

    const room = await prisma.room.create({
      data: {
        name: name || null,
        elements: elements?.length
          ? {
              create: elements.map((el) => ({
                id: el.id,
                type: el.type,
                data: el.data as object,
                style: el.style as object,
                posX: el.posX,
                posY: el.posY,
                width: el.width,
                height: el.height,
                rotation: el.rotation,
                zIndex: el.zIndex,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json({ id: room.id, name: room.name }, { status: 201 });
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
