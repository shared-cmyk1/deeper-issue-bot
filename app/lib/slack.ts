import { NotionIssue, NotionComment } from "./notion";

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!;

const NOTION_TO_SLACK_USER: Record<string, string> = {
  "2814adc4-2844-4f20-b0a7-569c376c777d": "U082856MRL1", // 김민정
  "318d872b-594c-8161-8ec6-0002beb6079f": "U0AJHDR508H", // 김윤하
  "27ed872b-594c-813f-9ebd-0002f8f1743a": "U081NRE5MF0", // 박민서
  "107bba66-1440-8352-8800-0159fe3c36bb": "U0ACAR89H98", // 박봉호 - 프로필 ID
  "87f69e34-482f-46bd-aeb3-cc181caa853d": "U0ACAR89H98", // 박봉호 - 멘션 ID
  "292bba66-1440-8282-92ed-0166df019b50": "U0AMW2SFRS8", // 최승아
  "c9bbba66-1440-8225-a179-01d807ab5726": "U0AGB9N5QJX", // 민수 (Woody)
  "2b5d872b-594c-8134-b3e3-0002fe61a34e": "U09V6EZ8UQ1", // 임지원 (Emily)
  "318d872b-594c-815b-ae6e-00024814df8e": "U0AJ13T7CPP", // 이정연
  "00b8ca2a-828f-4d01-9476-f6dcdf092716": "U0AJ4GC92UA", // 박정민
  "277d872b-594c-81fc-ae5d-00026a90e26f": "U0AHY4R35S7", // 정세현
};

function getSlackMention(notionUserId: string, fallbackName: string): string {
  const slackId = NOTION_TO_SLACK_USER[notionUserId];
  return slackId ? `<@${slackId}>` : fallbackName;
}

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
      text: { type: "plain_text", text: `${getTypeEmoji(issue.type)} 새 이슈 등록`, emoji: true },
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
        { type: "button", text: { type: "plain_text", text: "노션에서 보기", emoji: true }, url: issue.url, style: "primary" },
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

export async function sendCommentNotification(comment: NotionComment) {
  const authorName = comment.author || "알 수 없음";
  const mentionTags = comment.mentionedUsers
    .map((u) => getSlackMention(u.id, u.name));
  const mentionText = mentionTags.length > 0 ? `*멘션*\n${mentionTags.join(" ")}` : "";

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: ":speech_balloon: 새 댓글", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*이슈*\n${comment.pageTitle}` },
        { type: "mrkdwn", text: `*작성자*\n${authorName}` },
      ],
    },
    ...(mentionText ? [{ type: "section", text: { type: "mrkdwn", text: mentionText } }] : []),
    {
      type: "section",
      text: { type: "mrkdwn", text: `> ${comment.text}` },
    },
    {
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "노션에서 보기", emoji: true }, url: comment.pageUrl, style: "primary" },
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

export async function sendUpdateNotification(issue: NotionIssue) {
  const STATUS_EMOJI: Record<string, string> = {
    Backlog: ":inbox_tray:",
    "To-do": ":clipboard:",
    "In Progress": ":hammer_and_wrench:",
    "In Review": ":eyes:",
    Done: ":white_check_mark:",
  };
  const statusEmoji = STATUS_EMOJI[issue.status] || ":arrows_counterclockwise:";

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `${statusEmoji} 이슈 업데이트`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*제목*\n${issue.title}` },
        { type: "mrkdwn", text: `*현재 상태*\n${statusEmoji} *${issue.status}*` },
        { type: "mrkdwn", text: `*담당자*\n${issue.assignee || "미배정"}` },
        { type: "mrkdwn", text: `*우선순위*\n${getPriorityEmoji(issue.priority)} ${issue.priority}` },
      ],
    },
    {
      type: "actions",
      elements: [
        { type: "button", text: { type: "plain_text", text: "노션에서 보기", emoji: true }, url: issue.url, style: "primary" },
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

export async function sendDailySummary(
  newIssues: NotionIssue[],
  newComments: NotionComment[],
  modifiedIssues: NotionIssue[],
  hours: number,
) {
  const total = newIssues.length + newComments.length + modifiedIssues.length;

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `:clipboard: 이슈 요약 (최근 ${hours}시간)`, emoji: true },
    },
  ];

  if (total === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "새로운 이슈, 댓글, 업데이트가 없습니다." },
    });
  } else {
    if (newIssues.length > 0) {
      const issueLines = newIssues
        .map((i) => `• ${getPriorityEmoji(i.priority)} <${i.url}|${i.title}> (${i.assignee || "미배정"})`)
        .join("\n");
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*:memo: 새 이슈 (${newIssues.length}건)*\n${issueLines}` },
      });
    }

    if (newComments.length > 0) {
      const commentLines = newComments
        .map((c) => `• <${c.pageUrl}|${c.pageTitle}> — ${c.author}: "${c.text.slice(0, 50)}${c.text.length > 50 ? "..." : ""}"`)
        .join("\n");
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*:speech_balloon: 새 댓글 (${newComments.length}건)*\n${commentLines}` },
      });
    }

    if (modifiedIssues.length > 0) {
      const updateLines = modifiedIssues
        .map((i) => `• <${i.url}|${i.title}> — ${i.status || "상태 없음"}`)
        .join("\n");
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*:arrows_counterclockwise: 업데이트 (${modifiedIssues.length}건)*\n${updateLines}` },
      });
    }
  }

  blocks.push({ type: "divider" });

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
}
