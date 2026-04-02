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
      last_edited_time: {
        after: since,
      },
    },
    sorts: [
      {
        timestamp: "last_edited_time",
        direction: "descending",
      },
    ],
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

export async function getNewIssues(since: string): Promise<NotionIssue[]> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      timestamp: "created_time",
      created_time: {
        after: since,
      },
    },
    sorts: [
      {
        timestamp: "created_time",
        direction: "descending",
      },
    ],
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
