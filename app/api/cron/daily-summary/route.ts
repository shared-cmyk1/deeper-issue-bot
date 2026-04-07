import { NextRequest, NextResponse } from "next/server";
import { getNewIssues, getRecentComments, getRecentlyModifiedIssues } from "../../../lib/notion";
import { sendDailySummary } from "../../../lib/slack";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const hoursParam = request.nextUrl.searchParams.get("hours");
    const hours = hoursParam ? parseInt(hoursParam) : 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const newIssues = await getNewIssues(since);
    const newComments = await getRecentComments(since);
    const newIssueIds = new Set(newIssues.map((i) => i.id));
    const commentPageIds = new Set(newComments.map((c) => c.pageId));
    const excludeIds = new Set([...newIssueIds, ...commentPageIds]);
    const modifiedIssues = await getRecentlyModifiedIssues(since, excludeIds);

    await sendDailySummary(newIssues, newComments, modifiedIssues, hours);

    return NextResponse.json({
      message: "OK",
      hours,
      newIssues: newIssues.length,
      newComments: newComments.length,
      updatedIssues: modifiedIssues.length,
    });
  } catch (error) {
    console.error("[daily-summary] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
