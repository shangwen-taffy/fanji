import { NextRequest, NextResponse } from "next/server";

type BangumiSubject = {
  id: number; name: string; name_cn?: string; eps?: number; summary?: string;
  images?: { large?: string; common?: string };
  rating?: { score?: number };
};

export async function GET(request: NextRequest) {
  const day = Number(request.nextUrl.searchParams.get("day")) || 0;
  const page = Math.max(0, Number(request.nextUrl.searchParams.get("page")) || 0);
  // 在高排名动画的较大范围内按日期选择起点，每次换组前进一整个区段，避免相邻组重叠。
  const offset = ((day * 173) % 600 + page * 24) % 1200;
  try {
    const response = await fetch(`https://api.bgm.tv/v0/subjects?type=2&sort=rank&limit=24&offset=${offset}`, {
      headers: { "User-Agent": "Fanji/0.1 (anime tracker)" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("Bangumi request failed");
    const data = await response.json();
    const items = ((data.data ?? []) as BangumiSubject[]).map((x) => ({
      id: x.id, name: x.name, name_cn: x.name_cn,
      image: x.images?.large || x.images?.common,
      eps: x.eps, score: x.rating?.score, summary: x.summary,
    }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: "推荐服务暂时不可用" }, { status: 502 });
  }
}
