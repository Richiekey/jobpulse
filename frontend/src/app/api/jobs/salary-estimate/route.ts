import { NextRequest, NextResponse } from "next/server";
import { estimateJobSalary } from "@/lib/salaryEstimator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "";
  const location = searchParams.get("location") || "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const estimate = estimateJobSalary(title, location);
  if (!estimate) {
    return NextResponse.json({ error: "Could not estimate salary" }, { status: 404 });
  }

  return NextResponse.json(estimate);
}
