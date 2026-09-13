"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, ChevronRight, Clock3, Compass, Heart, Library, Loader2, LogOut, Minus, Plus, Search, Sparkles, Star, Trash2, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status = "wish" | "watching" | "done" | "paused" | "dropped";
type Anime = { id: number; name: string; name_cn?: string; image?: string; eps?: number; score?: number; summary?: string };
type RecordItem = Anime & { status: Status; progress: number; rating: number; note?: string };

const demo: RecordItem[] = [
  { id: 265, name: "新世紀エヴァンゲリオン", name_cn: "新世纪福音战士", image: "https://lain.bgm.tv/pic/cover/l/88/0d/265_R2Gio.jpg", eps: 26, score: 8.9, status: "done", progress: 26, rating: 9 },
  { id: 253, name: "カウボーイビバップ", name_cn: "星际牛仔", image: "https://lain.bgm.tv/pic/cover/l/53/ef/253_6xE8X.jpg", eps: 26, score: 9.1, status: "watching", progress: 12, rating: 0 },
  { id: 326, name: "CLANNAD ～AFTER STORY～", name_cn: "CLANNAD ～AFTER STORY～", image: "https://lain.bgm.tv/pic/cover/l/33/2d/326_h4FR6.jpg", eps: 24, score: 9.1, status: "wish", progress: 0, rating: 0 },
];

const statusMeta: Record<Status, { label: string; color: string }> = {
  wish: { label: "想看", color: "#818cf8" }, watching: { label: "在看", color: "#22c55e" }, done: { label: "看完", color: "#f59e0b" }, paused: { label: "搁置", color: "#94a3b8" }, dropped: { label: "弃番", color: "#f87171" },
};

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<RecordItem[]>(demo);
  const [tab, setTab] = useState<"home" | "discover" | "library" | "profile">("home");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const clearAuthTokensFromAddress = () => {
      if (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) clearAuthTokensFromAddress();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      if (session) clearAuthTokensFromAddress();
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !userEmail) return;
    supabase.from("user_anime").select("*").order("updated_at", { ascending: false }).then(({ data }) => {
      if (data?.length) setRecords(data.map((x) => ({ id: x.anime_id, name: x.name, name_cn: x.name_cn, image: x.image_url, eps: x.total_episodes, score: x.community_score, status: x.status, progress: x.progress, rating: x.rating, note: x.note })));
      else setRecords([]);
    });
  }, [supabase, userEmail]);

  async function searchAnime() {
    if (!query.trim()) return;
    setSearching(true); setTab("discover");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.items ?? []);
    } catch { setNotice("搜索暂时不可用，请稍后再试"); }
    setSearching(false);
  }

  async function saveRecord(item: RecordItem) {
    setRecords((old) => [item, ...old.filter((x) => x.id !== item.id)]);
    setSelected((current) => current?.id === item.id ? item : current);
    if (supabase && userEmail) {
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("user_anime").upsert({ user_id: auth.user?.id, anime_id: item.id, name: item.name, name_cn: item.name_cn, image_url: item.image, total_episodes: item.eps, community_score: item.score, status: item.status, progress: item.progress, rating: item.rating, note: item.note, updated_at: new Date().toISOString() }, { onConflict: "user_id,anime_id" });
    }
  }

  async function addFromSearch(anime: Anime) {
    const item: RecordItem = { ...anime, status: "wish", progress: 0, rating: 0 };
    await saveRecord(item);
    setNotice(userEmail ? "已加入“想看”，并同步到云端" : "已加入“想看”；登录后才能永久保存");
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function deleteRecord(item: RecordItem) {
    if (!window.confirm(`确定从片库删除《${item.name_cn || item.name}》吗？`)) return;
    if (supabase && userEmail) {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_anime").delete().eq("user_id", auth.user?.id).eq("anime_id", item.id);
      if (error) {
        setNotice(`删除失败：${error.message}`);
        return;
      }
    }
    setRecords((old) => old.filter((record) => record.id !== item.id));
    setSelected(null);
    setNotice("已从片库删除");
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function login() {
    if (!supabase) return setNotice("请先按 README 配置 Supabase 环境变量");
    if (!email.includes("@")) return setNotice("请输入有效邮箱");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setNotice(error ? error.message : "登录链接已经发送，请检查邮箱");
  }

  const watching = records.filter((x) => x.status === "watching");
  const visible = filter === "all" ? records : records.filter((x) => x.status === filter);
  const totalEps = records.reduce((n, x) => n + x.progress, 0);

  return (
    <main className="app-shell">
      <header className="topbar">
        {tab !== "home" && <button className="back-button" onClick={() => setTab("home")} aria-label="返回首页"><ArrowLeft size={19}/><span>返回</span></button>}
        <button className="brand" onClick={() => setTab("home")}><span className="brand-mark"><Sparkles size={20}/></span><span>番迹<small>把热爱留在时间里</small></span></button>
        <div className="header-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchAnime()} placeholder="搜索番剧、角色或制作人..."/><button onClick={searchAnime}>{searching ? <Loader2 className="spin" size={17}/> : "搜索"}</button></div>
        <button className="avatar" onClick={() => setTab("profile")}><UserRound size={19}/></button>
      </header>

      <section className="page">
        {tab === "home" && <>
          <div className="hero">
            <div><p className="eyebrow">YOUR ANIME JOURNEY</p><h1>晚上好，<br/><em>继续你的故事。</em></h1><p className="hero-copy">每一部看过的番，都是时间留下的一枚书签。</p></div>
            <div className="hero-orbit"><div className="moon">{records.length}<small>部收藏</small></div><span className="star s1">✦</span><span className="star s2">·</span><span className="star s3">✧</span></div>
          </div>
          <div className="section-title"><div><span>正在观看</span><h2>接着上次继续</h2></div><button onClick={() => { setTab("library"); setFilter("watching"); }}>查看全部 <ChevronRight size={16}/></button></div>
          <div className="continue-grid">
            {watching.length ? watching.map((item) => <AnimeCard key={item.id} item={item} onOpen={setSelected}/>) : <Empty text="还没有正在看的番，去发现页逛逛吧"/>}
          </div>
          <div className="stats-row"><Stat icon={<Library/>} value={records.length} label="收录番剧"/><Stat icon={<Check/>} value={records.filter(x=>x.status === "done").length} label="已经看完"/><Stat icon={<Clock3/>} value={totalEps} label="观看集数"/><Stat icon={<Star/>} value={records.filter(x=>x.rating).length ? (records.reduce((n,x)=>n+x.rating,0)/records.filter(x=>x.rating).length).toFixed(1) : "—"} label="平均评分"/></div>
        </>}

        {tab === "discover" && <>
          <div className="simple-head"><p className="eyebrow">DISCOVER</p><h1>发现下一部心动</h1><p>从 Bangumi 搜索动画资料，把喜欢的作品收入片库。</p></div>
          <div className="mobile-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key === "Enter" && searchAnime()} placeholder="输入番剧名称"/><button onClick={searchAnime}>搜索</button></div>
          <div className="result-grid">{searching ? <Empty text="正在穿过次元壁搜索..."/> : results.length ? results.map(item => <SearchCard key={item.id} item={item} added={records.some(record => record.id === item.id)} onAdd={addFromSearch}/>) : <Empty text="搜索一部你喜欢的动画吧"/>}</div>
        </>}

        {tab === "library" && <>
          <div className="simple-head"><p className="eyebrow">MY LIBRARY</p><h1>我的片库</h1><p>{records.length} 部作品，{totalEps} 集共同组成了你的动画时光。</p></div>
          <div className="filters"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>全部 <b>{records.length}</b></button>{(Object.keys(statusMeta) as Status[]).map(s=><button key={s} className={filter===s?"active":""} onClick={()=>setFilter(s)}>{statusMeta[s].label} <b>{records.filter(x=>x.status===s).length}</b></button>)}</div>
          <div className="library-grid">{visible.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected}/>)}</div>
        </>}

        {tab === "profile" && <div className="profile-card">
          <div className="profile-icon"><UserRound size={30}/></div><p className="eyebrow">CLOUD SYNC</p><h1>{userEmail ? "云端已连接" : "登录你的番迹"}</h1>
          {userEmail ? <><p>{userEmail}</p><button className="primary" onClick={()=>supabase?.auth.signOut()}><LogOut size={17}/> 退出登录</button></> : <><p>使用邮箱魔法链接登录，在不同设备同步片库。</p><div className="login-row"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="你的邮箱"/><button onClick={login}>发送登录链接</button></div></>}
          {notice && <div className="notice">{notice}</div>}
        </div>}
      </section>

      {notice && tab !== "profile" && <div className="toast"><Check size={17}/>{notice}</div>}

      <nav className="bottom-nav"><NavButton active={tab==="home"} icon={<BookOpen/>} label="首页" onClick={()=>setTab("home")}/><NavButton active={tab==="discover"} icon={<Compass/>} label="发现" onClick={()=>setTab("discover")}/><NavButton active={tab==="library"} icon={<Library/>} label="片库" onClick={()=>setTab("library")}/><NavButton active={tab==="profile"} icon={<UserRound/>} label="我的" onClick={()=>setTab("profile")}/></nav>

      {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}><X/></button><img src={selected.image || "/placeholder.svg"} alt=""/><div className="modal-content"><p className="eyebrow">EDIT RECORD</p><h2>{selected.name_cn || selected.name}</h2><p className="muted">{selected.name}</p><label>观看状态</label><div className="status-pills">{(Object.keys(statusMeta) as Status[]).map(s=><button key={s} className={selected.status===s?"chosen":""} onClick={()=>saveRecord({...selected,status:s})}>{statusMeta[s].label}</button>)}</div><label>观看进度</label><div className="counter"><button onClick={()=>saveRecord({...selected,progress:Math.max(0,selected.progress-1)})}><Minus/></button><b>{selected.progress} <small>/ {selected.eps || "?"} 集</small></b><button onClick={()=>saveRecord({...selected,progress:Math.min(selected.eps||999,selected.progress+1)})}><Plus/></button></div><label>我的评分</label><div className="rating">{[1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} className={selected.rating>=n?"lit":""} onClick={()=>saveRecord({...selected,rating:n})}>{n}</button>)}</div><label htmlFor="anime-note">我的短评</label><textarea id="anime-note" className="note-input" maxLength={500} value={selected.note || ""} onChange={(event)=>setSelected({...selected,note:event.target.value})} placeholder="写下看完后的感受……"/><div className="modal-actions"><button className="delete-record" onClick={()=>deleteRecord(selected)}><Trash2 size={17}/> 删除</button><button className="save-close" onClick={async()=>{await saveRecord(selected);setSelected(null);setNotice("记录已保存");window.setTimeout(()=>setNotice(""),3500)}}><Check size={17}/> 保存并关闭</button></div></div></div></div>}
    </main>
  );
}

function AnimeCard({item,onOpen}:{item:RecordItem,onOpen:(x:RecordItem)=>void}) { const pct = item.eps ? Math.round(item.progress/item.eps*100) : 0; return <button className="anime-card" onClick={()=>onOpen(item)}><div className="cover"><img src={item.image || "/placeholder.svg"} alt=""/><span style={{background:statusMeta[item.status].color}}>{statusMeta[item.status].label}</span></div><div className="card-copy"><h3>{item.name_cn || item.name}</h3><p>{item.name}</p><div className="progress-line"><i style={{width:`${pct}%`}}/></div><div className="card-meta"><span>{item.progress} / {item.eps || "?"} 集</span>{item.score && <span><Star size={13} fill="currentColor"/> {item.score}</span>}</div></div></button> }
function SearchCard({item,added,onAdd}:{item:Anime,added:boolean,onAdd:(x:Anime)=>void}) { return <article className="search-card"><img src={item.image || "/placeholder.svg"} alt=""/><div><h3>{item.name_cn || item.name}</h3><p>{item.name}</p><span>{item.eps || "?"} 集 · <Star size={13} fill="currentColor"/> {item.score || "暂无"}</span><button className={added?"added":""} disabled={added} onClick={()=>onAdd(item)}>{added?<><Check size={16}/> 已在片库</>:<><Plus size={16}/> 加入想看</>}</button></div></article> }
function Stat({icon,value,label}:{icon:React.ReactNode,value:string|number,label:string}) { return <div className="stat">{icon}<div><b>{value}</b><span>{label}</span></div></div> }
function NavButton({active,icon,label,onClick}:{active:boolean,icon:React.ReactNode,label:string,onClick:()=>void}) { return <button className={active?"active":""} onClick={onClick}>{icon}<span>{label}</span></button> }
function Empty({text}:{text:string}) { return <div className="empty"><Heart/><p>{text}</p></div> }
