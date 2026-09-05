export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DATABASE_URL?.trim()) {
    const { migrate } = await import("@/lib/db")
    await migrate()
  }
}
