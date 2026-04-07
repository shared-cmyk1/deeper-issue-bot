import { NextRequest, NextResponse } from "next/server";
import { getNewIssues, getRecentComments, getRecentlyModifiedIssues } from "../../../lib/notion";
import { sendNewIssueNotification, sendCommentNotification, sendUpdateNotification } from "../../../lib/slack";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sinceParam = request.nextUrl.searchParams.get("since");
    const since = sinceParam || new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const newIssues = await getNewIssues(since);
    const newIssueIds = new Set(newIssues.map((i) => i.id));
    for (const issue of newIssues) {
      await sendNewIssueNotification(issue);
    }

    const newComments = await getRecentComments(since);
    for (const comment of newComments) {
      await sendCommentNotification(comment);
    }

    const commentPageIds = new Set(newComments.map((c) => c.pageId));
    const excludeIds = new Set([...newIssueIds, ...commentPageIds]);
    const modifiedIssues = await getRecentlyModifiedIssues(since, excludeIds);
    for (const issue of modifiedIssues) {
      await sendUpdateNotification(issue);
    }

    return NextResponse.json({
      message: "OK",
      newIssues: newIssues.length,
      newComments: newComments.length,
      updatedIssues: modifiedIssues.length,
    });
  } catch (error) {
    console.error("[check-notion] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
