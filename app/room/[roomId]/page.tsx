import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RoomCanvas from "./room-canvas";

import { ElementData, ElementStyle, ElementType } from "@/types/canvas";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      elements: {
        where: { deletedAt: null },
        orderBy: { zIndex: "asc" },
      },
    },
  });

  if (!room) notFound();

  // Touch updatedAt
  await prisma.room.update({
    where: { id: roomId },
    data: { updatedAt: new Date() },
  });

  const initialElements = room.elements.map((el) => ({
    id: el.id,
    type: el.type as ElementType,
    data: el.data as unknown as ElementData,
    style: el.style as unknown as ElementStyle,
    posX: el.posX,
    posY: el.posY,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    zIndex: el.zIndex,
    version: el.version,
  }));

  return <RoomCanvas roomId={roomId} initialElements={initialElements} />;
}
