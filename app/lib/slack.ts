import { NotionIssue } from "./notion";

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!;

const PRIORITY_EMOJI: Record<string, string> = {
  Critical: ":red_circle:",
  High: ":large_orange_circle:",
  Medium: ":large_yellow_circle:",
  Low: ":large_green_circle:",
};

const TYPE_EMOJI: Record<string, string> = {
  Bug: ":bug:",
  Crash: ":boom:",
  Enhancement: ":sparkles:",
  "UI/UX": ":art:",
  Performance: ":zap:",
};

function getPriorityEmoji(priority: string): string {
  return PRIORITY_EMOJI[priority] || ":white_circle:";
}

function getTypeEmoji(type: string): string {
  return TYPE_EMOJI[type] || ":memo:";
}

export async function sendNewIssueNotification(issue: NotionIssue) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${getTypeEmoji(issue.type)} 새 이슈 등록`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*제목*\n${issue.title}` },
        { type: "mrkdwn", text: `*우선순위*\n${getPriorityEmoji(issue.priority)} ${issue.priority}` },
        { type: "mrkdwn", text: `*유형*\n${issue.type || "-"}` },
        { type: "mrkdwn", text: `*담당자*\n${issue.assignee || "미배정"}` },
        { type: "mrkdwn", text: `*보고자*\n${issue.reporter || "-"}` },
        { type: "mrkdwn", text: `*마감일*\n${issue.dueDate || "-"}` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "노션에서 보기", emoji: true },
          url: issue.url,
          style: "primary",
        },
      ],
    },
    { type: "divider" },
  ];

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
}

export async function sendStatusChangeNotification(issue: NotionIssue, oldStatus: string) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: ":arrows_counterclockwise: 이슈 상태 변경",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*제목*\n${issue.title}` },
        { type: "mrkdwn", text: `*상태 변경*\n~${oldStatus}~ → *${issue.status}*` },
        { type: "mrkdwn", text: `*담당자*\n${issue.assignee || "미배정"}` },
        { type: "mrkdwn", text: `*우선순위*\n${getPriorityEmoji(issue.priority)} ${issue.priority}` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "노션에서 보기", emoji: true },
          url: issue.url,
          style: "primary",
        },
      ],
    },
    { type: "divider" },
  ];

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
}
