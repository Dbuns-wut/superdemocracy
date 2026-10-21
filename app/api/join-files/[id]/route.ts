import { NextResponse } from "next/server"
import { getJoinFile } from "@/lib/join-files/store"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, context: Params) {
  const { id } = await context.params
  const found = await getJoinFile(id)
  if (!found) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return new NextResponse(new Uint8Array(found.bytes), {
    status: 200,
    headers: {
      "Content-Type": found.record.mime,
      "Content-Disposition": `inline; filename="${found.record.originalName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
