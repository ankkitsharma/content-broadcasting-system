import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

// seed uses the same Prisma client configuration as the app (adapter-based).
// Ensure env parsing doesn't fail in environments where JWT_SECRET isn't set.
process.env.JWT_SECRET ??= "0123456789abcdef0123456789abcdef";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/content_broadcasting?schema=public";

import { prisma } from "../src/db/prisma";

async function main() {
  const saltRounds = 12;

  const principalEmail = "principal@example.com";
  const teacher1Email = "teacher1@example.com";
  const teacher2Email = "teacher2@example.com";

  const principalPasswordHash = await bcrypt.hash("Principal@123", saltRounds);
  const teacherPasswordHash = await bcrypt.hash("Teacher@123", saltRounds);

  await prisma.user.upsert({
    where: { email: principalEmail },
    update: {},
    create: {
      name: "Principal",
      email: principalEmail,
      passwordHash: principalPasswordHash,
      role: UserRole.principal
    }
  });

  await prisma.user.upsert({
    where: { email: teacher1Email },
    update: {},
    create: {
      name: "Teacher One",
      email: teacher1Email,
      passwordHash: teacherPasswordHash,
      role: UserRole.teacher
    }
  });

  await prisma.user.upsert({
    where: { email: teacher2Email },
    update: {},
    create: {
      name: "Teacher Two",
      email: teacher2Email,
      passwordHash: teacherPasswordHash,
      role: UserRole.teacher
    }
  });

  console.log("Seeded users:");
  console.log(`- principal: ${principalEmail} / Principal@123`);
  console.log(`- teacher1: ${teacher1Email} / Teacher@123`);
  console.log(`- teacher2: ${teacher2Email} / Teacher@123`);
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

