import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const iconPath = join(process.cwd(), "public", "favicon-32x32.png");

export async function GET() {
  try {
    const buffer = readFileSync(iconPath);
    return new NextResponse(buffer, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
