/**
 * 간단한 인메모리 스토어
 * Vercel Serverless 환경에서는 콜드스타트마다 초기화되므로
 * 최초 실행 시에는 알림을 보내지 않고, 이후 변경분만 추적합니다.
 */

// 마지막 폴링 시간
let lastCheckedAt: string | null = null;

// 이슈별 마지막 상태 (상태 변경 감지용)
const issueStatusMap = new Map<string, string>();

// 콜드스타트 여부
let isFirstRun = true;

export function getLastCheckedAt(): string | null {
  return lastCheckedAt;
}

export function setLastCheckedAt(time: string) {
  lastCheckedAt = time;
}

export function getIssueStatus(issueId: string): string | undefined {
  return issueStatusMap.get(issueId);
}

export function setIssueStatus(issueId: string, status: string) {
  issueStatusMap.set(issueId, status);
}

export function checkAndClearFirstRun(): boolean {
  if (isFirstRun) {
    isFirstRun = false;
    return true;
  }
  return false;
}
