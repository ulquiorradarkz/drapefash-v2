// Usage:
//   node --env-file=.env.local scripts/admin-user.mjs                -> ensures the admin user exists (email confirmed)
//   node --env-file=.env.local scripts/admin-user.mjs --link URL     -> also prints a one-time sign-in link for that site URL
//   node --env-file=.env.local scripts/admin-user.mjs --set-password -> asks for a new dashboard password (typing is hidden)
// Behind an HTTP proxy, prefix the command with NODE_USE_ENV_PROXY=1.
// The sign-in link and the password are secrets: never put them in the code, a commit or a chat.
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.ADMIN_EMAIL ?? "ahmedqlila99@gmail.com").toLowerCase();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

export async function ensureAdminUser() {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) return existing;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  return created.data.user;
}

export async function signInLink(siteUrl, next = "/admin") {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const u = new URL("/auth/callback", siteUrl);
  u.searchParams.set("token_hash", data.properties.hashed_token);
  u.searchParams.set("type", "magiclink");
  u.searchParams.set("next", next);
  return u.toString();
}

/** Reads a line from the terminal without showing what is typed. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    const NL = String.fromCharCode(10);
    rl._writeToOutput = (text) => {
      if (!muted || text.includes(NL)) rl.output.write(muted ? NL : text);
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

const user = await ensureAdminUser();
console.log(`Admin user ready: ${user.email} (${user.id})`);

if (process.argv.includes("--set-password")) {
  const password = await askHidden("New dashboard password (hidden): ");
  if (password.length < 10) {
    console.error("Use at least 10 characters.");
    process.exit(1);
  }
  const again = await askHidden("Type it again: ");
  if (again !== password) {
    console.error("The two passwords are different. Nothing changed.");
    process.exit(1);
  }
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  console.log(`Password set. Sign in at /admin/login with ${user.email} and that password.`);
}
const i = process.argv.indexOf("--link");
if (i !== -1) {
  const site = process.argv[i + 1] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  console.log(`One-time sign-in link (valid ~1h):\n${await signInLink(site)}`);
}
