import { NextRequest, NextResponse } from "next/server";
import { getNewIssues, getRecentlyUpdatedIssues } from "../../../lib/notion";
import { sendNewIssueNotification, sendStatusChangeNotification } from "../../../lib/slack";
import {
  getLastCheckedAt,
  setLastCheckedAt,
  getIssueStatus,
  setIssueStatus,
  checkAndClearFirstRun,
} from "../../../lib/store";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    const isFirst = checkAndClearFirstRun();

    // 콜드스타트: 상태만 캐싱하고 알림은 보내지 않음
    if (isFirst || !getLastCheckedAt()) {
      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 최근 2분
      const issues = await getRecentlyUpdatedIssues(since);

      for (const issue of issues) {
        setIssueStatus(issue.id, issue.status);
      }

      setLastCheckedAt(now);
      return NextResponse.json({
        message: "Initial sync complete",
        cached: issues.length,
      });
    }

    const lastChecked = getLastCheckedAt()!;

    // 1. 새로 등록된 이슈 확인
    const newIssues = await getNewIssues(lastChecked);
    for (const issue of newIssues) {
      await sendNewIssueNotification(issue);
      setIssueStatus(issue.id, issue.status);
    }

    // 2. 상태가 변경된 이슈 확인
    const newIssueIds = new Set(newIssues.map((i) => i.id));
    const updatedIssues = await getRecentlyUpdatedIssues(lastChecked);

    for (const issue of updatedIssues) {
      // 새로 등록된 이슈는 스킵 (이미 위에서 알림 발송)
      if (newIssueIds.has(issue.id)) continue;

      const oldStatus = getIssueStatus(issue.id);
      if (oldStatus && oldStatus !== issue.status) {
        await sendStatusChangeNotification(issue, oldStatus);
      }
      setIssueStatus(issue.id, issue.status);
    }

    setLastCheckedAt(now);

    return NextResponse.json({
      message: "OK",
      newIssues: newIssues.length,
      statusChanges: updatedIssues.filter(
        (i) => !newIssueIds.has(i.id) && getIssueStatus(i.id) !== i.status
      ).length,
    });
  } catch (error) {
    console.error("[check-notion] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
