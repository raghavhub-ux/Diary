import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sample } from "../shared/model.js";
if (process.env.NODE_ENV === "production")
  throw Error("Seed is for local development only");
const db = new PrismaClient(),
  email = "sample@mindspace.local",
  password = randomBytes(18).toString("base64url");
try {
  const data = sample();
  await db.user.create({
    data: {
      email,
      name: "Alex",
      passwordHash: await bcrypt.hash(password, 12),
      entries: { create: data.journals.map(({ id, ...entry }) => entry) },
      habits: {
        create: data.habits.map(({ id, completions, ...habit }) => habit),
      },
    },
  });
  console.log(
    "Local sample account:",
    email,
    "One-time generated password:",
    password,
  );
} finally {
  await db.$disconnect();
}
