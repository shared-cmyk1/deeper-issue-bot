import { NextRequest, NextResponse } from "next/server";
import { getNewIssues, getRecentComments, getRecentlyModifiedIssues } from "../../../lib/notion";
import { sendNewIssueNotification, sendCommentNotification, sendUpdateNotification } from "../../../lib/slack";

const GH_REPO = "shared-cmyk1/deeper-issue-bot";

async function getLastChecked(): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/variables/LAST_CHECKED`,
      { headers: { Authorization: `token ${process.env.GH_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.value;
    }
  } catch {}
  return new Date(Date.now() - 15 * 60 * 1000).toISOString();
}

async function setLastChecked(time: string): Promise<void> {
  try {
    await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/variables/LAST_CHECKED`,
      {
        method: "PATCH",
        headers: { Authorization: `token ${process.env.GH_TOKEN}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
        body: JSON.stringify({ name: "LAST_CHECKED", value: time }),
      }
    );
  } catch {}
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sinceParam = request.nextUrl.searchParams.get("since");
    const since = sinceParam || await getLastChecked();

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

    if (!sinceParam) {
      await setLastChecked(new Date().toISOString());
    }

    return NextResponse.json({
      message: "OK",
      since,
      newIssues: newIssues.length,
      newComments: newComments.length,
      updatedIssues: modifiedIssues.length,
    });
  } catch (error) {
    console.error("[check-notion] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
