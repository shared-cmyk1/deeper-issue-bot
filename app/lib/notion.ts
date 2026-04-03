import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export interface NotionIssue {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  reporter: string;
  assignee: string;
  dueDate: string;
  url: string;
  lastEditedTime: string;
}

function getPropertyValue(properties: Record<string, any>, name: string): string {
  const prop = properties[name];
  if (!prop) return "";

  switch (prop.type) {
    case "title":
      return prop.title?.map((t: any) => t.plain_text).join("") || "";
    case "select":
      return prop.select?.name || "";
    case "multi_select":
      return prop.multi_select?.map((s: any) => s.name).join(", ") || "";
    case "people":
      return prop.people?.map((p: any) => p.name).join(", ") || "";
    case "rich_text":
      return prop.rich_text?.map((t: any) => t.plain_text).join("") || "";
    case "status":
      return prop.status?.name || "";
    case "date":
      return prop.date?.start || "";
    default:
      return "";
  }
}

export async function getRecentlyUpdatedIssues(since: string): Promise<NotionIssue[]> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      timestamp: "last_edited_time",
      last_edited_time: { after: since },
    },
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
  });

  return response.results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      title: getPropertyValue(props, "이름"),
      status: getPropertyValue(props, "상태"),
      priority: getPropertyValue(props, "Priority"),
      type: getPropertyValue(props, "Type"),
      reporter: getPropertyValue(props, "Reporter"),
      assignee: getPropertyValue(props, "Developer"),
      dueDate: getPropertyValue(props, "Due date"),
      url: `https://notion.so/${page.id.replace(/-/g, "")}`,
      lastEditedTime: page.last_edited_time,
    };
  });
}

export interface MentionedUser {
  id: string;
  name: string;
}

export interface NotionComment {
  id: string;
  author: string;
  authorId: string;
  text: string;
  mentionedUsers: MentionedUser[];
  createdTime: string;
  pageId: string;
  pageTitle: string;
  pageUrl: string;
}

export async function getRecentComments(since: string): Promise<NotionComment[]> {
  const [recentPages, allPages] = await Promise.all([
    notion.databases.query({
      database_id: DATABASE_ID,
      filter: { timestamp: "last_edited_time", last_edited_time: { after: since } },
    }),
    notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 10,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    }),
  ]);

  const pageMap = new Map<string, { id: string; title: string; url: string }>();
  for (const page of [...recentPages.results, ...allPages.results] as any[]) {
    if (!pageMap.has(page.id)) {
      pageMap.set(page.id, {
        id: page.id,
        title: getPropertyValue(page.properties, "이름"),
        url: `https://notion.so/${page.id.replace(/-/g, "")}`,
      });
    }
  }

  const pages = Array.from(pageMap.values());
  const comments: NotionComment[] = [];

  for (const page of pages) {
    try {
      const response = await notion.comments.list({ block_id: page.id });
      for (const comment of response.results as any[]) {
        const createdTime = comment.created_time;
        if (createdTime > since) {
          const text = comment.rich_text?.map((t: any) => t.plain_text).join("") || "";
          const mentionedUsers: MentionedUser[] = (comment.rich_text || [])
            .filter((t: any) => t.type === "mention" && t.mention?.type === "user")
            .map((t: any) => ({
              id: t.mention.user.id,
              name: t.mention.user.name || t.plain_text || "알 수 없음",
            }));
          comments.push({
            id: comment.id,
            author: comment.created_by?.name || "알 수 없음",
            authorId: comment.created_by?.id || "",
            text,
            mentionedUsers,
            createdTime,
            pageId: page.id,
            pageTitle: page.title,
            pageUrl: page.url,
          });
        }
      }
    } catch {
      // skip
    }
  }

  return comments;
}

export async function getRecentlyModifiedIssues(since: string, excludeIds: Set<string>): Promise<NotionIssue[]> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      timestamp: "last_edited_time",
      last_edited_time: { after: since },
    },
  });

  return response.results
    .filter((page: any) => !excludeIds.has(page.id))
    .filter((page: any) => page.created_time < since)
    .map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: getPropertyValue(props, "이름"),
        status: getPropertyValue(props, "상태"),
        priority: getPropertyValue(props, "Priority"),
        type: getPropertyValue(props, "Type"),
        reporter: getPropertyValue(props, "Reporter"),
        assignee: getPropertyValue(props, "Developer"),
        dueDate: getPropertyValue(props, "Due date"),
        url: `https://notion.so/${page.id.replace(/-/g, "")}`,
        lastEditedTime: page.last_edited_time,
      };
    });
}

export async function getNewIssues(since: string): Promise<NotionIssue[]> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      timestamp: "created_time",
      created_time: { after: since },
    },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });

  return response.results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      title: getPropertyValue(props, "이름"),
      status: getPropertyValue(props, "상태"),
      priority: getPropertyValue(props, "Priority"),
      type: getPropertyValue(props, "Type"),
      reporter: getPropertyValue(props, "Reporter"),
      assignee: getPropertyValue(props, "Developer"),
      dueDate: getPropertyValue(props, "Due date"),
      url: `https://notion.so/${page.id.replace(/-/g, "")}`,
      lastEditedTime: page.last_edited_time,
    };
  });
}
