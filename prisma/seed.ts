import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding the database...");

  // Create rooms based on the image (G1+G2+G3, F1-F12, S1-S6)
  const groundFloorRooms = ["G1 + G2 + G3"];
  const firstFloorRooms = Array.from({ length: 12 }, (_, i) => `F${i + 1}`);
  const secondFloorRooms = Array.from({ length: 6 }, (_, i) => `S${i + 1}`);

  const allRooms = [
    ...groundFloorRooms,
    ...firstFloorRooms,
    ...secondFloorRooms,
  ];

  console.log(`Creating ${allRooms.length} rooms...`);

  // Create each room in the database, skipping if it already exists
  for (const roomName of allRooms) {
    const exists = await prisma.room.findUnique({
      where: { name: roomName },
    });

    if (!exists) {
      await prisma.room.create({
        data: { name: roomName },
      });
      console.log(`Created room: ${roomName}`);
    } else {
      console.log(`Room ${roomName} already exists, skipping...`);
    }
  }

  console.log("Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error seeding the database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
