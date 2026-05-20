import { GameCode, type DrawRecord } from "@lottery/contracts";
import { jsonSourceHash, sourceHash } from "./hash";

export interface FetchedDraw {
  issue: string;
  drawDate: string | null;
  primaryNumbers: number[];
  secondaryNumbers: number[];
  prizeTiers: Array<Record<string, unknown>>;
  sourceUrl: string;
  sourceHash: string;
}

const sportteryHistoryUrl = "https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry";
const cwlDrawNoticeUrl = "https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice";
const cwlAnnouncementUrl = "https://www.cwl.gov.cn/ygkj/wqkjgg/ssq/";

function numbers(value: unknown): number[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => Number(item));
  }
  const matches = String(value).match(/\d+/g) ?? [];
  return matches.map((item) => Number(item));
}

function isoDate(value: unknown): string | null {
  if (!value) {
    return null;
  }
  const text = String(value).replaceAll("/", "-").trim().slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return text;
}

export function parseSportteryHistory(payload: Record<string, any>, sourceUrl: string): FetchedDraw[] {
  const container = payload.value ?? payload.data ?? payload;
  const records = container.list ?? container.drawList ?? [];
  const digest = jsonSourceHash(payload);
  const draws: FetchedDraw[] = [];
  for (const item of records) {
    const issue = String(item.lotteryDrawNum ?? item.drawNum ?? item.issue ?? item.code ?? "").trim();
    const result = numbers(item.lotteryDrawResult ?? item.drawResult ?? item.result ?? item.winningNumbers);
    if (!issue || result.length < 7) {
      continue;
    }
    draws.push({
      issue,
      drawDate: isoDate(item.lotteryDrawTime ?? item.drawTime ?? item.date),
      primaryNumbers: result.slice(0, 5).sort((a, b) => a - b),
      secondaryNumbers: result.slice(5, 7).sort((a, b) => a - b),
      prizeTiers: (item.prizeLevelList ?? item.prizeTiers ?? item.prizeGrades ?? []) as Array<Record<string, unknown>>,
      sourceUrl,
      sourceHash: digest,
    });
  }
  return draws;
}

function cwlRecords(payload: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [payload.result, payload.data, payload.list, payload.rows];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Record<string, unknown>[];
    }
    if (candidate && typeof candidate === "object") {
      for (const value of Object.values(candidate)) {
        if (Array.isArray(value)) {
          return value as Record<string, unknown>[];
        }
      }
    }
  }
  return [];
}

export function parseCwlDrawNotice(payload: Record<string, unknown>, sourceUrl: string): FetchedDraw[] {
  const digest = jsonSourceHash(payload);
  const draws: FetchedDraw[] = [];
  for (const item of cwlRecords(payload)) {
    const issue = String(item.code ?? item.issue ?? item.lotteryDrawNum ?? item.drawNum ?? "").trim();
    const red = numbers(item.red ?? item.redBalls ?? item.frontWinningNum ?? item.winningRed);
    const blue = numbers(item.blue ?? item.blueBalls ?? item.backWinningNum ?? item.winningBlue);
    if (!issue || red.length < 6 || blue.length < 1) {
      continue;
    }
    draws.push({
      issue,
      drawDate: isoDate(item.date ?? item.drawDate ?? item.day),
      primaryNumbers: red.slice(0, 6).sort((a, b) => a - b),
      secondaryNumbers: blue.slice(0, 1).sort((a, b) => a - b),
      prizeTiers: (item.prizegrades ?? item.prizeGrades ?? item.prizeLevelList ?? []) as Array<Record<string, unknown>>,
      sourceUrl,
      sourceHash: digest,
    });
  }
  return draws;
}

export function parseCwlNoticeHtml(html: string, sourceUrl: string): FetchedDraw[] {
  const issueMatch = html.match(/(\d{5,})/);
  const parsedNumbers = numbers(html);
  if (!issueMatch || parsedNumbers.length < 7) {
    return [];
  }
  const issue = issueMatch[1];
  const drawNumbers = parsedNumbers.filter((value) => value !== Number(issue));
  if (drawNumbers.length < 7) {
    return [];
  }
  return [
    {
      issue,
      drawDate: null,
      primaryNumbers: drawNumbers.slice(0, 6).sort((a, b) => a - b),
      secondaryNumbers: drawNumbers.slice(6, 7).sort((a, b) => a - b),
      prizeTiers: [],
      sourceUrl,
      sourceHash: sourceHash(html),
    },
  ];
}

export async function fetchSportterySuperLotto(limit: number, userAgent: string): Promise<FetchedDraw[]> {
  const pageSize = Math.min(Math.max(limit, 1), 100);
  const collected: FetchedDraw[] = [];
  const seenIssues = new Set<string>();
  let pageNo = 1;
  while (collected.length < limit) {
    const sourceUrl =
      `${sportteryHistoryUrl}?gameNo=85&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=${pageNo}`;
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        Referer: "https://www.lottery.gov.cn/",
        "User-Agent": userAgent,
      },
    });
    if (!response.ok) {
      throw new Error(`sporttery request failed with ${response.status}`);
    }
    const payload = (await response.json()) as Record<string, any>;
    const pageDraws = parseSportteryHistory(payload, sourceUrl);
    if (pageDraws.length === 0) {
      break;
    }
    for (const draw of pageDraws) {
      if (seenIssues.has(draw.issue)) {
        continue;
      }
      seenIssues.add(draw.issue);
      collected.push(draw);
      if (collected.length >= limit) {
        break;
      }
    }
    if (pageDraws.length < pageSize) {
      break;
    }
    pageNo += 1;
  }
  return collected.slice(0, limit);
}

export async function fetchCwlDoubleColorBall(limit: number, userAgent: string): Promise<FetchedDraw[]> {
  const params = new URLSearchParams({
    name: "ssq",
    issueCount: String(limit),
    issueStart: "",
    issueEnd: "",
    dayStart: "",
    dayEnd: "",
    pageNo: "1",
    pageSize: String(limit),
    week: "",
    systemType: "PC",
  });
  const response = await fetch(`${cwlDrawNoticeUrl}?${params.toString()}`, {
    headers: {
      Accept: "application/json,text/javascript,*/*;q=0.01",
      Referer: cwlAnnouncementUrl,
      "User-Agent": userAgent,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!response.ok) {
    const fallback = await fetch(cwlAnnouncementUrl, {
      headers: {
        Referer: cwlAnnouncementUrl,
        "User-Agent": userAgent,
      },
    });
    if (fallback.ok) {
      const html = await fallback.text();
      const parsed = parseCwlNoticeHtml(html, cwlAnnouncementUrl);
      if (parsed.length > 0) {
        return parsed.slice(0, limit);
      }
    }
    throw new Error("China Welfare Lottery source is currently blocked by WAF");
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    return parseCwlDrawNotice((await response.json()) as Record<string, unknown>, response.url);
  }
  const text = await response.text();
  try {
    return parseCwlDrawNotice(JSON.parse(text) as Record<string, unknown>, response.url);
  } catch {
    return parseCwlNoticeHtml(text, response.url);
  }
}

export async function fetchDraws(gameCode: GameCode, limit: number, userAgent: string): Promise<FetchedDraw[]> {
  if (gameCode === GameCode.SUPER_LOTTO) {
    return fetchSportterySuperLotto(limit, userAgent);
  }
  if (gameCode === GameCode.DOUBLE_COLOR_BALL) {
    return fetchCwlDoubleColorBall(limit, userAgent);
  }
  throw new Error(`unsupported game code: ${gameCode}`);
}

export function toDrawRecord(gameCode: GameCode, draw: FetchedDraw): DrawRecord {
  return {
    gameCode,
    issue: draw.issue,
    drawDate: draw.drawDate,
    primaryNumbers: draw.primaryNumbers,
    secondaryNumbers: draw.secondaryNumbers,
    prizeTiers: draw.prizeTiers,
    sourceUrl: draw.sourceUrl,
    sourceHash: draw.sourceHash,
  };
}
