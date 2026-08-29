// Shared setup for E2E specs. PREREQUISITES: `supabase start` and `bun run dev` both running
// (see CLAUDE.md). Run with `bun run test:e2e`.
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. bun run test:e2e loads .env automatically — if you're invoking ` +
        `playwright directly, pass --env-file=.env. Also make sure 'supabase start' and ` +
        `'bun run dev' are both running.`,
    );
  }
  return value;
}

const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A fresh, confirmed teacher account per test.
export async function createTestTeacher(): Promise<{
  id: string;
  email: string;
  password: string;
}> {
  const email = `e2e-teacher-${crypto.randomUUID()}@example.test`;
  const password = "e2e-test-password-not-real";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createTestTeacher: no user returned");
  return { id: data.user.id, email, password };
}

export async function deleteTestTeacher(id: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw error;
}
