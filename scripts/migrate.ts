import { migrate, hasDatabase } from "../lib/db"

async function main() {
  if (!hasDatabase()) {
    console.error("DATABASE_URL is not set")
    process.exit(1)
  }
  await migrate()
  console.log("Database migrated.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
