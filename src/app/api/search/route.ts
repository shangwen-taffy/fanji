import { NextRequest, NextResponse } from "next/server";

type BangumiSubject = {
  id: number; name: string; name_cn?: string; eps?: number; summary?: string;
  images?: { large?: string; common?: string };
  rating?: { score?: number };
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ items: [] });
  try {
    const response = await fetch("https://api.bgm.tv/v0/search/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Fanji/0.1 (anime tracker)" },
      body: JSON.stringify({ keyword: q, filter: { type: [2] } }),
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("Bangumi request failed");
    const data = await response.json();
    const items = ((data.data ?? []) as BangumiSubject[]).slice(0, 20).map((x) => ({ id: x.id, name: x.name, name_cn: x.name_cn, image: x.images?.large || x.images?.common, eps: x.eps, score: x.rating?.score, summary: x.summary }));
    return NextResponse.json({ items });
  } catch { return NextResponse.json({ items: [], error: "搜索服务暂时不可用" }, { status: 502 }); }
}
