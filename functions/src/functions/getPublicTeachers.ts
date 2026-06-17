import type { Env } from "../env";
import { requireUser } from "../lib/auth";
import * as db from "../lib/db";

// Base44: getPublicTeachers -> lista todos los profesores (requiere usuario autenticado).
export async function getPublicTeachers(env: Env, req: Request) {
  await requireUser(env, req);
  const teachers = await db.list(env, "teachers");
  return { teachers };
}
