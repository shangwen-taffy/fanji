"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Camera, Check, ChevronRight, CircleHelp, Copy, FileText, Heart, Mail,
  Loader2, LogOut, Minus, Play, Plus, Search, Settings, ShieldCheck,
  Sparkles, Star, Trash2, UserRound, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status = "wish" | "watching" | "done" | "paused" | "dropped";
type Tab = "search" | "watching" | "done" | "profile";
type Anime = { id: number; name: string; name_cn?: string; image?: string; eps?: number; score?: number; summary?: string };
type RecordItem = Anime & { status: Status; progress: number; rating: number; note?: string };
const CONTACT_EMAIL = "shaidurmxnxboeiei63929999@gmail.com";

const statusMeta: Record<Status, { label: string; color: string }> = {
  wish: { label: "待确认", color: "#818cf8" }, watching: { label: "正看", color: "#22c55e" },
  done: { label: "看完", color: "#f59e0b" }, paused: { label: "搁置", color: "#94a3b8" },
  dropped: { label: "弃番", color: "#f87171" },
};

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("番剧旅行者");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const cleanAddress = () => {
      if (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setDisplayName(data.user?.user_metadata?.display_name || data.user?.email?.split("@")[0] || "番剧旅行者");
      setAvatarUrl(data.user?.user_metadata?.avatar_url || "");
      if (data.user) cleanAddress();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setDisplayName(session?.user.user_metadata?.display_name || session?.user.email?.split("@")[0] || "番剧旅行者");
      setAvatarUrl(session?.user.user_metadata?.avatar_url || "");
      if (session) cleanAddress();
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !userEmail) return;
    supabase.from("user_anime").select("*").order("updated_at", { ascending: false }).then(({ data }) => {
      setRecords((data ?? []).map((x) => ({
        id: x.anime_id, name: x.name, name_cn: x.name_cn, image: x.image_url,
        eps: x.total_episodes, score: x.community_score, status: x.status,
        progress: x.progress, rating: x.rating, note: x.note,
      })));
    });
  }, [supabase, userEmail]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function searchAnime() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      setResults(data.items ?? []);
      if (!data.items?.length) showNotice("没有找到相关动画，换个关键词试试");
    } catch { showNotice("搜索暂时不可用，请稍后再试"); }
    setSearching(false);
  }

  async function saveRecord(item: RecordItem) {
    setRecords((old) => [item, ...old.filter((x) => x.id !== item.id)]);
    setSelected((current) => current?.id === item.id ? item : current);
    if (supabase && userEmail) {
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("user_anime").upsert({
        user_id: auth.user?.id, anime_id: item.id, name: item.name, name_cn: item.name_cn,
        image_url: item.image, total_episodes: item.eps, community_score: item.score,
        status: item.status, progress: item.progress, rating: item.rating, note: item.note,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,anime_id" });
    }
  }

  async function addFromSearch(anime: Anime) {
    await saveRecord({ ...anime, status: "wish", progress: 0, rating: 0 });
    showNotice(userEmail ? "已添加到收藏区" : "已临时添加；登录后才能永久保存");
  }

  async function deleteRecord(item: RecordItem) {
    if (!window.confirm(`确定从片库删除《${item.name_cn || item.name}》吗？`)) return;
    if (supabase && userEmail) {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_anime").delete().eq("user_id", auth.user?.id).eq("anime_id", item.id);
      if (error) return showNotice(`删除失败：${error.message}`);
    }
    setRecords((old) => old.filter((record) => record.id !== item.id));
    setSelected(null);
    showNotice("已从片库删除");
  }

  async function login() {
    if (!supabase) return showNotice("尚未配置Supabase");
    if (!email.includes("@")) return showNotice("请输入有效邮箱");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    showNotice(error ? "登录邮件发送过于频繁，请稍后再试" : "登录链接已发送，请检查邮箱");
  }

  async function saveProfile() {
    if (!supabase || !userEmail) return;
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() || "番剧旅行者" } });
    showNotice(error ? "昵称保存失败" : "个人资料已保存");
  }

  const watching = records.filter((item) => item.status === "watching");
  const done = records.filter((item) => item.status === "done");
  const added = records.filter((item) => !["watching", "done"].includes(item.status));
  const totalEpisodes = records.reduce((sum, item) => sum + item.progress, 0);

  return <main className="app-shell four-page-app">
    <header className="topbar compact-topbar">
      <button className="brand" onClick={() => setTab("search")}><span className="brand-mark"><Sparkles size={20}/></span><span>番迹<small>把热爱留在时间里</small></span></button>
      <div className="page-context">{tab === "search" ? "发现动画" : tab === "watching" ? "正在观看" : tab === "done" ? "看完收藏" : "个人中心"}</div>
    </header>

    <section className="page four-page-content">
      {tab === "search" && <SearchPage query={query} setQuery={setQuery} searchAnime={searchAnime} searching={searching} results={results} clearResults={()=>setResults([])} records={records} added={added} addFromSearch={addFromSearch} setSelected={setSelected}/>} 
      {tab === "watching" && <CollectionPage eyebrow="WATCHING" title="正在看的故事" description={`${watching.length} 部动画正在陪你度过这段时间。`} items={watching} empty="还没有正在看的动画；从搜索页加入后改为“正看”吧。" setSelected={setSelected}/>} 
      {tab === "done" && <CollectionPage eyebrow="COMPLETED" title="看完的每一次心动" description={`已经看完 ${done.length} 部，共记录 ${done.reduce((sum,item)=>sum+item.progress,0)} 集。`} items={done} empty="看完一部动画后，它会收藏在这里。" setSelected={setSelected}/>} 
      {tab === "profile" && <ProfilePage userEmail={userEmail} email={email} setEmail={setEmail} login={login} supabase={supabase} displayName={displayName} setDisplayName={setDisplayName} saveProfile={saveProfile} avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} stats={{all:records.length,pending:added.length,watching:watching.length,done:done.length,episodes:totalEpisodes}} showNotice={showNotice}/>} 
    </section>

    <nav className="bottom-nav persistent-nav">
      <NavButton active={tab === "search"} icon={<Search/>} label="搜索" onClick={() => setTab("search")}/>
      <NavButton active={tab === "watching"} icon={<Play/>} label="正看" badge={watching.length} onClick={() => setTab("watching")}/>
      <NavButton active={tab === "done"} icon={<Check/>} label="看完" badge={done.length} onClick={() => setTab("done")}/>
      <NavButton active={tab === "profile"} icon={<UserRound/>} label="我的" onClick={() => setTab("profile")}/>
    </nav>

    {notice && <div className="toast"><Check size={17}/>{notice}</div>}
    {selected && <EditModal item={selected} saveRecord={saveRecord} deleteRecord={deleteRecord} close={() => setSelected(null)} showNotice={showNotice} afterSave={(status)=>{if(status === "watching") setTab("watching"); if(status === "done") setTab("done")}}/>} 
  </main>;
}

function SearchPage({query,setQuery,searchAnime,searching,results,clearResults,records,added,addFromSearch,setSelected}:{query:string;setQuery:(x:string)=>void;searchAnime:()=>void;searching:boolean;results:Anime[];clearResults:()=>void;records:RecordItem[];added:RecordItem[];addFromSearch:(x:Anime)=>void;setSelected:(x:RecordItem)=>void}) {
  return <>
    <div className="simple-head search-heading"><p className="eyebrow">DISCOVER</p><h1>找到下一部喜欢的番</h1><p>搜索动画资料，加入清单，再慢慢把故事看完。</p></div>
    <div className="main-search"><Search size={20}/><input value={query} onChange={(event)=>setQuery(event.target.value)} onKeyDown={(event)=>event.key === "Enter" && searchAnime()} placeholder="搜索番剧名称，例如：葬送的芙莉莲"/><button onClick={searchAnime}>{searching?<Loader2 className="spin" size={18}/>:"搜索"}</button></div>
    {results.length > 0 && <><div className="search-results-heading"><SectionTitle title="搜索结果" meta={`${results.length} 个结果`}/><button className="search-back-button" onClick={clearResults}><ArrowLeft size={17}/>返回</button></div><div className="result-grid">{results.map(item=><SearchCard key={item.id} item={item} added={records.some(record=>record.id===item.id)} onAdd={addFromSearch}/>)}</div></>}
    {!results.length && !searching && <div className="discovery-blank"><div><Sparkles/><h2>从一部动画开始</h2><p>搜索结果会显示封面、集数和社区评分。</p></div></div>}
    {added.length > 0 && <><SectionTitle title="待确认" meta={`${added.length} 部动画`}/><div className="library-grid">{added.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected}/>)}</div></>}
  </>;
}

function CollectionPage({eyebrow,title,description,items,empty,setSelected}:{eyebrow:string;title:string;description:string;items:RecordItem[];empty:string;setSelected:(x:RecordItem)=>void}) {
  return <><div className="simple-head"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{items.length?<div className="library-grid collection-grid">{items.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected}/>)}</div>:<Empty text={empty}/>}</>;
}

function ProfilePage({userEmail,email,setEmail,login,supabase,displayName,setDisplayName,saveProfile,avatarUrl,setAvatarUrl,stats,showNotice}:{userEmail:string|null;email:string;setEmail:(x:string)=>void;login:()=>void;supabase:ReturnType<typeof createClient>;displayName:string;setDisplayName:(x:string)=>void;saveProfile:()=>void;avatarUrl:string;setAvatarUrl:(x:string)=>void;stats:{all:number;pending:number;watching:number;done:number;episodes:number};showNotice:(x:string)=>void}) {
  const [contactOpen,setContactOpen]=useState(false);
  const [uploadingAvatar,setUploadingAvatar]=useState(false);
  if (!userEmail) return <div className="profile-card"><div className="profile-icon"><UserRound size={30}/></div><p className="eyebrow">CLOUD SYNC</p><h1>登录你的番迹</h1><p>使用邮箱魔法链接登录，在不同设备同步片库。</p><div className="login-row"><input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="你的邮箱"/><button onClick={login}>发送登录链接</button></div></div>;
  const initial = (displayName || userEmail)[0]?.toUpperCase();
  async function uploadAvatar(file?:File) {
    if (!file || !supabase) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) return showNotice("请选择JPG、PNG或WebP图片");
    if (file.size > 2 * 1024 * 1024) return showNotice("头像不能超过2MB");
    setUploadingAvatar(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setUploadingAvatar(false); return showNotice("请先登录"); }
    const path = `${auth.user.id}/avatar`;
    const { error } = await supabase.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
    if (error) { setUploadingAvatar(false); return showNotice(`头像上传失败：${error.message}`); }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error:profileError } = await supabase.auth.updateUser({data:{avatar_url:publicUrl}});
    setUploadingAvatar(false);
    if (profileError) return showNotice("头像资料保存失败");
    setAvatarUrl(publicUrl);
    showNotice("头像已更新");
  }
  return <div className="account-page">
    <section className="account-hero"><label className="avatar-upload" title="更换头像"><span className="large-avatar">{avatarUrl?<img src={avatarUrl} alt="个人头像"/>:initial}</span><span className="camera-badge">{uploadingAvatar?<Loader2 className="spin"/>:<Camera/>}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} onChange={event=>uploadAvatar(event.target.files?.[0])}/></label><div><p className="eyebrow">MY ANIME PROFILE</p><h1>{displayName}</h1><p>{userEmail}</p><small className="avatar-tip">点击头像更换图片</small></div><button className="outline-button" onClick={()=>supabase?.auth.signOut()}><LogOut size={16}/>退出登录</button></section>
    <section className="profile-stats"><ProfileStat value={stats.all} label="全部收藏"/><ProfileStat value={stats.pending} label="待确认"/><ProfileStat value={stats.watching} label="正在看"/><ProfileStat value={stats.done} label="已看完"/><ProfileStat value={stats.episodes} label="观看集数"/></section>
    <div className="profile-columns"><section className="settings-card"><SectionTitle title="个人资料" meta="PROFILE"/><label>昵称</label><div className="profile-name-row"><input value={displayName} maxLength={24} onChange={event=>setDisplayName(event.target.value)}/><button onClick={saveProfile}>保存</button></div><label>登录邮箱</label><div className="readonly-field">{userEmail}<ShieldCheck size={17}/></div></section>
    <section className="settings-card"><SectionTitle title="设置与帮助" meta="SETTINGS"/><SettingRow icon={<Mail/>} title="联系我们" subtitle="联系番迹开发者" onClick={()=>setContactOpen(true)}/><SettingRow icon={<Settings/>} title="应用设置" subtitle="主题、语言与数据显示" onClick={()=>showNotice("应用设置正在建设中")}/><SettingRow icon={<FileText/>} title="用户条款与隐私" subtitle="查看服务规则和隐私说明" onClick={()=>showNotice("条款页面将在正式发布前补齐")}/><SettingRow icon={<CircleHelp/>} title="帮助与反馈" subtitle="使用问题与意见反馈" onClick={()=>showNotice("反馈入口正在建设中")}/></section></div>
    <p className="version">番迹 Fanji · Version 0.1.0</p>
    {contactOpen && <div className="contact-backdrop" onClick={()=>setContactOpen(false)}><section className="contact-dialog" onClick={event=>event.stopPropagation()}><button className="close" onClick={()=>setContactOpen(false)}><X/></button><div className="contact-icon"><Mail/></div><p className="eyebrow">CONTACT US</p><h2>联系我们</h2><p>如果你有建议、遇到问题，欢迎通过邮箱联系。</p><a className="contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><div className="contact-actions"><button onClick={async()=>{await navigator.clipboard.writeText(CONTACT_EMAIL);showNotice("联系邮箱已复制")}}><Copy size={16}/>复制邮箱</button><a href={`mailto:${CONTACT_EMAIL}`}><Mail size={16}/>发送邮件</a></div></section></div>}
  </div>;
}

function EditModal({item,saveRecord,deleteRecord,close,showNotice,afterSave}:{item:RecordItem;saveRecord:(x:RecordItem)=>Promise<void>;deleteRecord:(x:RecordItem)=>void;close:()=>void;showNotice:(x:string)=>void;afterSave:(status:Status)=>void}) {
  const [draft,setDraft]=useState(item);
  return <div className="modal-backdrop" onClick={close}><div className="modal" onClick={event=>event.stopPropagation()}><button className="close" onClick={close}><X/></button><img src={draft.image || "/placeholder.svg"} alt=""/><div className="modal-content"><p className="eyebrow">EDIT RECORD</p><h2>{draft.name_cn || draft.name}</h2><p className="muted">{draft.name}</p><label>放到哪里</label><div className="status-pills">{(["watching","done"] as Status[]).map(status=><button key={status} className={draft.status===status?"chosen":""} onClick={()=>setDraft({...draft,status})}>{statusMeta[status].label}</button>)}</div><label>观看进度</label><div className="counter"><button onClick={()=>setDraft({...draft,progress:Math.max(0,draft.progress-1)})}><Minus/></button><b>{draft.progress} <small>/ {draft.eps || "?"} 集</small></b><button onClick={()=>setDraft({...draft,progress:Math.min(draft.eps||999,draft.progress+1)})}><Plus/></button></div><label>我的评分</label><div className="rating">{[1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} className={draft.rating>=n?"lit":""} onClick={()=>setDraft({...draft,rating:n})}>{n}</button>)}</div><label htmlFor="anime-note">我的短评</label><textarea id="anime-note" className="note-input" maxLength={500} value={draft.note || ""} onChange={event=>setDraft({...draft,note:event.target.value})} placeholder="写下看完后的感受……"/><div className="modal-actions"><button className="delete-record" onClick={()=>deleteRecord(draft)}><Trash2 size={17}/> 删除</button><button className="save-close" onClick={async()=>{await saveRecord(draft);close();afterSave(draft.status);showNotice(draft.status === "watching" ? "已移到正看" : draft.status === "done" ? "已移到看完" : "记录已保存")}}><Check size={17}/> 保存并关闭</button></div></div></div></div>;
}

function AnimeCard({item,onOpen}:{item:RecordItem;onOpen:(x:RecordItem)=>void}) { const percent=item.eps?Math.round(item.progress/item.eps*100):0; return <button className="anime-card" onClick={()=>onOpen(item)}><div className="cover"><img src={item.image || "/placeholder.svg"} alt=""/><span style={{background:statusMeta[item.status].color}}>{statusMeta[item.status].label}</span></div><div className="card-copy"><h3>{item.name_cn || item.name}</h3><p>{item.name}</p><div className="progress-line"><i style={{width:`${percent}%`}}/></div><div className="card-meta"><span>{item.progress} / {item.eps || "?"} 集</span>{item.rating>0?<span><Star size={13} fill="currentColor"/> {item.rating}</span>:item.score?<span><Star size={13}/> {item.score}</span>:null}</div></div></button> }
function SearchCard({item,added,onAdd}:{item:Anime;added:boolean;onAdd:(x:Anime)=>void}) { return <article className="search-card"><img src={item.image || "/placeholder.svg"} alt=""/><div><h3>{item.name_cn || item.name}</h3><p>{item.name}</p><span>{item.eps || "?"} 集 · <Star size={13} fill="currentColor"/> {item.score || "暂无"}</span><button className={added?"added":""} disabled={added} onClick={()=>onAdd(item)}>{added?<><Check size={16}/>已添加</>:<><Plus size={16}/>添加</>}</button></div></article> }
function NavButton({active,icon,label,badge,onClick}:{active:boolean;icon:React.ReactNode;label:string;badge?:number;onClick:()=>void}) { return <button className={active?"active":""} onClick={onClick}><span className="nav-icon">{icon}{badge? <b>{badge}</b>:null}</span><span>{label}</span></button> }
function SectionTitle({title,meta}:{title:string;meta:string}) { return <div className="section-title compact-section-title"><div><h2>{title}</h2></div><span>{meta}</span></div> }
function ProfileStat({value,label}:{value:string|number;label:string}) { return <div><b>{value}</b><span>{label}</span></div> }
function SettingRow({icon,title,subtitle,onClick}:{icon:React.ReactNode;title:string;subtitle:string;onClick:()=>void}) { return <button className="setting-row" onClick={onClick}><i>{icon}</i><span><b>{title}</b><small>{subtitle}</small></span><ChevronRight/></button> }
function Empty({text}:{text:string}) { return <div className="empty"><Heart/><p>{text}</p></div> }
