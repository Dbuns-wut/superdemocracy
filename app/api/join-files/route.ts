import { NextResponse } from "next/server"
import { saveJoinFile } from "@/lib/join-files/store"

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "expected multipart form data" }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 })
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  const result = await saveJoinFile({
    originalName: file.name,
    mime: file.type,
    bytes,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ file: result.file }, { status: 201 })
}
