"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Binoculars, Camera, Check, CaretRight as ChevronRight, Question as CircleHelp,
  Copy, FileText, Folder, FolderOpen, Heart, Envelope as Mail, CircleNotch as Loader2,
  SignOut as LogOut, Minus, Plus, MagnifyingGlass as Search,
  Gear as Settings, SealCheck, ShieldCheck, Star, Trash as Trash2,
  PlayCircle, User as UserRound, UserCircle, X, UserPlus, UsersThree, PaperPlaneTilt,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

type Status = "wish" | "watching" | "done" | "paused" | "dropped";
type Tab = "search" | "watching" | "done" | "profile";
type Anime = { id: number; name: string; name_cn?: string; image?: string; eps?: number; score?: number; summary?: string };
type AnimeCollection = { id: number; name: string };
type RecordItem = Anime & { status: Status; progress: number; rating: number; note?: string; collectionId?: number | null };
type FriendProfile = { id: string; email: string; display_name?: string; avatar_url?: string };
type Friendship = { id: number; requester_id: string; addressee_id: string; status: "pending" | "accepted" | "declined"; profile: FriendProfile };
const CONTACT_EMAIL = "shaidurmxnxboeiei63929999@gmail.com";

const statusMeta: Record<Status, { label: string; color: string }> = {
  wish: { label: "待确认", color: "#d79986" }, watching: { label: "正看", color: "#a77761" },
  done: { label: "看完", color: "#755046" }, paused: { label: "搁置", color: "#a79a91" },
  dropped: { label: "弃番", color: "#c27c76" },
};

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [collections, setCollections] = useState<AnimeCollection[]>([]);
  const [collectionsEnabled, setCollectionsEnabled] = useState(false);
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("番剧旅行者");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [theme, setTheme] = useState(()=>typeof window === "undefined" ? "light" : localStorage.getItem("fanji-theme") || "light");

  useEffect(() => {
    if (!supabase) return;
    const cleanAddress = () => {
      if (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setMyUserId(data.user?.id ?? null);
      setDisplayName(data.user?.user_metadata?.display_name || data.user?.email?.split("@")[0] || "番剧旅行者");
      setAvatarUrl(data.user?.user_metadata?.avatar_url || "");
      if (data.user) cleanAddress();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setMyUserId(session?.user.id ?? null);
      setDisplayName(session?.user.user_metadata?.display_name || session?.user.email?.split("@")[0] || "番剧旅行者");
      setAvatarUrl(session?.user.user_metadata?.avatar_url || "");
      if (session) cleanAddress();
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !userEmail) return;
    Promise.all([
      supabase.from("user_anime").select("*").order("updated_at", { ascending: false }),
      supabase.from("anime_collections").select("id,name").order("created_at", { ascending: true }),
    ]).then(([animeResponse, collectionResponse]) => {
      setRecords((animeResponse.data ?? []).map((x) => ({
        id: x.anime_id, name: x.name, name_cn: x.name_cn, image: x.image_url,
        eps: x.total_episodes, score: x.community_score, status: x.status,
        progress: x.progress, rating: x.rating, note: x.note, collectionId: x.collection_id,
      })));
      if (!collectionResponse.error) {
        setCollections(collectionResponse.data ?? []);
        setCollectionsEnabled(true);
      }
    });
  }, [supabase, userEmail]);

  async function loadFriends() {
    if (!supabase || !myUserId) return;
    const { data, error } = await supabase.from("friendships").select("id,requester_id,addressee_id,status").order("updated_at", { ascending: false });
    if (error) return;
    const rows = data ?? [];
    const otherIds = [...new Set(rows.map((row) => row.requester_id === myUserId ? row.addressee_id : row.requester_id))];
    const profilesResponse = otherIds.length ? await supabase.from("profiles").select("id,email,display_name,avatar_url").in("id", otherIds) : { data: [] as FriendProfile[] };
    const profiles = new Map((profilesResponse.data ?? []).map((profile) => [profile.id, profile as FriendProfile]));
    setFriendships(rows.map((row) => ({ ...row, profile: profiles.get(row.requester_id === myUserId ? row.addressee_id : row.requester_id) || { id: "", email: "好友" } })));
  }

  useEffect(() => {
    if (!supabase || !myUserId) return;
    supabase.from("friendships").select("id,requester_id,addressee_id,status").order("updated_at", { ascending: false }).then(async ({data,error}) => {
      if (error) return;
      const rows=data??[];
      const otherIds=[...new Set(rows.map(row=>row.requester_id===myUserId?row.addressee_id:row.requester_id))];
      const profileRows=otherIds.length?(await supabase.from("profiles").select("id,email,display_name,avatar_url").in("id",otherIds)).data??[]:[];
      const byId=new Map(profileRows.map(profile=>[profile.id,profile as FriendProfile]));
      setFriendships(rows.map(row=>({...row,profile:byId.get(row.requester_id===myUserId?row.addressee_id:row.requester_id)||{id:"",email:"好友"}})));
    });
  }, [supabase,myUserId]);

  async function sendFriendRequest(targetEmail: string) {
    if (!supabase || !myUserId) return false;
    const { error } = await supabase.rpc("send_friend_request", { target_email: targetEmail.trim() });
    if (error) { showNotice(error.message.replace("P0001: ", "")); return false; }
    showNotice("好友申请已送出，等对方同意吧");
    await loadFriends(); return true;
  }

  async function respondFriendRequest(id: number, accept: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("friendships").update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return showNotice(`操作失败：${error.message}`);
    showNotice(accept ? "你们已经成为好友" : "已忽略这条申请"); await loadFriends();
  }

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
      const payload: Record<string, unknown> = {
        user_id: auth.user?.id, anime_id: item.id, name: item.name, name_cn: item.name_cn,
        image_url: item.image, total_episodes: item.eps, community_score: item.score,
        status: item.status, progress: item.progress, rating: item.rating, note: item.note,
        updated_at: new Date().toISOString(),
      };
      if (collectionsEnabled) payload.collection_id = item.status === "done" ? item.collectionId ?? null : null;
      const { error } = await supabase.from("user_anime").upsert(payload, { onConflict: "user_id,anime_id" });
      if (error) showNotice(`保存失败：${error.message}`);
    }
  }

  async function createCollection(name: string) {
    const cleanName = name.trim().slice(0, 30);
    if (!cleanName) return false;
    if (!supabase || !userEmail) { showNotice("登录后才能创建并同步收藏夹"); return false; }
    if (!collectionsEnabled) { showNotice("请先在 Supabase 运行新版 supabase.sql"); return false; }
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("anime_collections").insert({ user_id: auth.user?.id, name: cleanName }).select("id,name").single();
    if (error) { showNotice(error.code === "23505" ? "已经有同名收藏夹" : `创建失败：${error.message}`); return false; }
    setCollections((old) => [...old, data]); showNotice(`已创建“${cleanName}”`); return true;
  }

  async function renameCollection(id: number, name: string) {
    const cleanName = name.trim().slice(0, 30);
    if (!cleanName || !supabase) return false;
    const { error } = await supabase.from("anime_collections").update({ name: cleanName, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { showNotice(`重命名失败：${error.message}`); return false; }
    setCollections((old) => old.map((folder) => folder.id === id ? { ...folder, name: cleanName } : folder)); return true;
  }

  async function deleteCollection(id: number) {
    if (!supabase || !window.confirm("删除收藏夹？其中的番剧会保留在“未分类”中。")) return;
    const { error } = await supabase.from("anime_collections").delete().eq("id", id);
    if (error) return showNotice(`删除失败：${error.message}`);
    setCollections((old) => old.filter((folder) => folder.id !== id));
    setRecords((old) => old.map((item) => item.collectionId === id ? { ...item, collectionId: null } : item));
    showNotice("收藏夹已删除，番剧已移到未分类");
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
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setAuthBusy(false);
    if (error) return showNotice(error.message.toLowerCase().includes("rate limit") ? "验证码发送过于频繁，请稍后再试" : `验证码发送失败：${error.message}`);
    setCodeSent(true);
    setOtp("");
    showNotice("八位验证码已发送，请检查邮箱");
  }

  async function verifyCode() {
    if (!supabase) return showNotice("尚未配置Supabase");
    if (!/^\d{8}$/.test(otp)) return showNotice("请输入邮件中的八位验证码");
    setAuthBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setAuthBusy(false);
    if (error) return showNotice(error.message.toLowerCase().includes("expired") ? "验证码已失效，请重新发送" : "验证码错误，请检查后重试");
    setCodeSent(false);
    setOtp("");
    showNotice("登录成功，正在同步你的片库");
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

  return <main className={`app-shell four-page-app theme-${theme} tab-${tab}`}>
    <header className="topbar compact-topbar">
      <button className="brand" onClick={() => setTab("search")}><span className="brand-mark"><img src="/icons/app-icon-source.png" alt="尚文番迹图标"/></span><span>尚文番迹<small>把热爱留在时间里</small></span></button>
      <div className="page-context">{tab === "search" ? "发现动画" : tab === "watching" ? "正在观看" : tab === "done" ? "看完收藏" : "个人中心"}</div>
    </header>

    <section className="page four-page-content">
      {tab === "search" && <SearchPage query={query} setQuery={setQuery} searchAnime={searchAnime} searching={searching} results={results} clearResults={()=>setResults([])} records={records} added={added} addFromSearch={addFromSearch} setSelected={setSelected}/>} 
      {tab === "watching" && <CollectionPage eyebrow="WATCHING" title="正在看的故事" description={`${watching.length} 部动画正在陪你度过这段时间。`} items={watching} empty="还没有正在看的动画；从搜索页加入后改为“正看”吧。" setSelected={setSelected} onDiscover={()=>setTab("search")}/>}
      {tab === "done" && <DonePage items={done} collections={collections} collectionsEnabled={collectionsEnabled} createCollection={createCollection} renameCollection={renameCollection} deleteCollection={deleteCollection} setSelected={setSelected} onDiscover={()=>setTab("search")}/>}
      {tab === "profile" && <ProfilePage userEmail={userEmail} myUserId={myUserId} email={email} setEmail={setEmail} otp={otp} setOtp={setOtp} codeSent={codeSent} setCodeSent={setCodeSent} authBusy={authBusy} login={login} verifyCode={verifyCode} supabase={supabase} displayName={displayName} setDisplayName={setDisplayName} saveProfile={saveProfile} avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} theme={theme} setTheme={setTheme} stats={{all:records.length,pending:added.length,watching:watching.length,done:done.length,episodes:totalEpisodes}} showNotice={showNotice} friendships={friendships} sendFriendRequest={sendFriendRequest} respondFriendRequest={respondFriendRequest}/>}
    </section>

    <nav className="bottom-nav persistent-nav">
      <NavButton active={tab === "search"} icon={<Binoculars weight="duotone"/>} label="搜索" onClick={() => setTab("search")}/>
      <NavButton active={tab === "watching"} icon={<PlayCircle weight="duotone"/>} label="正看" badge={watching.length} onClick={() => setTab("watching")}/>
      <NavButton active={tab === "done"} icon={<SealCheck weight="duotone"/>} label="看完" badge={done.length} onClick={() => setTab("done")}/>
      <NavButton active={tab === "profile"} icon={<UserCircle weight="duotone"/>} label="我的" onClick={() => setTab("profile")}/>
    </nav>

    {notice && <div className="toast"><Check size={17}/>{notice}</div>}
    {selected && <EditModal item={selected} collections={collections} saveRecord={saveRecord} deleteRecord={deleteRecord} close={() => setSelected(null)} showNotice={showNotice} afterSave={(status)=>{if(status === "watching") setTab("watching"); if(status === "done") setTab("done")}}/>}
  </main>;
}

function SearchPage({query,setQuery,searchAnime,searching,results,clearResults,records,added,addFromSearch,setSelected}:{query:string;setQuery:(x:string)=>void;searchAnime:()=>void;searching:boolean;results:Anime[];clearResults:()=>void;records:RecordItem[];added:RecordItem[];addFromSearch:(x:Anime)=>void;setSelected:(x:RecordItem)=>void}) {
  const [focused,setFocused]=useState(false);
  const [recommendations,setRecommendations]=useState<Anime[]>([]);
  const [recommendBusy,setRecommendBusy]=useState(false);
  const [hasSearched,setHasSearched]=useState(false);
  async function loadRecommendations() {
    setFocused(true);
    if (recommendations.length || recommendBusy) return;
    setRecommendBusy(true);
    const pool=["葬送的芙莉莲","摇曳露营","夏目友人帐","轻音少女","间谍过家家","跃动青春","孤独摇滚","迷宫饭","白箱","紫罗兰永恒花园","药屋少女的呢喃","胆大党"];
    const day=Math.floor(Date.now()/86400000);
    const picks=Array.from({length:6},(_,index)=>pool[(day+index*5)%pool.length]);
    const items=await Promise.all(picks.map(async title=>{try{const response=await fetch(`/api/search?q=${encodeURIComponent(title)}`);const data=await response.json();return data.items?.[0] as Anime|undefined}catch{return undefined}}));
    setRecommendations(items.filter((item):item is Anime=>Boolean(item)));
    setRecommendBusy(false);
  }
  function submitSearch(){setHasSearched(true);setFocused(false);searchAnime()}
  const showDaily=focused&&!hasSearched&&!results.length;
  return <div className="search-home">
    <section className="anime-hero"><img src="/art/search-hero.png" alt="樱花窗前与猫狗相伴的少女"/><div className="hero-copy"><p className="eyebrow">SHANGWEN ANIME JOURNEY</p><h1>找到下一部<br/><span>喜欢的番</span></h1><p>搜索动画资料，加入清单，再慢慢把故事看完。</p></div><aside className="hero-note">好看的动画<br/>总会在某个时刻<br/>温柔地见到你。<b>♥</b></aside><p className="hero-script">Anime for a<br/>Brighter Today.</p></section>
    <div className="main-search"><Search size={20}/><input value={query} onFocus={loadRecommendations} onChange={(event)=>{setQuery(event.target.value);setHasSearched(false)}} onKeyDown={(event)=>event.key === "Enter" && submitSearch()} placeholder="搜索番剧名称，例如：葬送的芙莉莲"/><button onClick={submitSearch}>{searching?<Loader2 className="spin" size={18}/>:"搜索"}</button></div>
    {showDaily&&<section className="daily-recommend"><div className="daily-title"><div><p className="eyebrow">DAILY PICKS</p><h2>今日份的心动推荐</h2></div><span>每天换一组 · 点卡片即可添加</span></div>{recommendBusy?<div className="recommend-loading"><Loader2 className="spin"/>正在翻找今天的好番…</div>:<div className="daily-grid">{recommendations.map(item=><SearchCard key={item.id} item={item} added={records.some(record=>record.id===item.id)} onAdd={addFromSearch}/>)}</div>}</section>}
    {results.length > 0 && <><div className="search-results-heading"><SectionTitle title="搜索结果" meta={`${results.length} 个结果`}/><button className="search-back-button" onClick={clearResults}><ArrowLeft size={17}/>返回</button></div><div className="result-grid">{results.map(item=><SearchCard key={item.id} item={item} added={records.some(record=>record.id===item.id)} onAdd={addFromSearch}/>)}</div></>}
    {!results.length && !searching && added.length === 0 && <div className="discovery-blank"><img src="/art/empty-companions.png" alt="猫咪和小狗守着番剧手账"/><div><p className="eyebrow">A NEW STORY AWAITS</p><h2>从一部动画开始</h2><p>搜索结果会显示封面、集数和社区评分。</p></div></div>}
    {added.length > 0 && <><SectionTitle title="待确认" meta={`${added.length} 部动画`}/><div className="library-grid">{added.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected}/>)}</div></>}
  </div>;
}

function CollectionPage({eyebrow,title,description,items,empty,setSelected,onDiscover}:{eyebrow:string;title:string;description:string;items:RecordItem[];empty:string;setSelected:(x:RecordItem)=>void;onDiscover:()=>void}) {
  return <><div className={`simple-head illustrated-head ${eyebrow.toLowerCase()}-head`}><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><img src="/art/profile-spring.png" alt="樱花树下的少女与宠物"/></div>{items.length?<div className="library-grid collection-grid">{items.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected}/>)}</div>:<Empty text={empty} onDiscover={onDiscover}/>}</>;
}

function DonePage({items,collections,collectionsEnabled,createCollection,renameCollection,deleteCollection,setSelected,onDiscover}:{items:RecordItem[];collections:AnimeCollection[];collectionsEnabled:boolean;createCollection:(name:string)=>Promise<boolean>;renameCollection:(id:number,name:string)=>Promise<boolean>;deleteCollection:(id:number)=>Promise<void>;setSelected:(x:RecordItem)=>void;onDiscover:()=>void}) {
  const [active,setActive]=useState<number | "all" | "uncategorized">("all");
  const [dialog,setDialog]=useState<"create" | AnimeCollection | null>(null);
  const [name,setName]=useState("");
  const filtered = active === "all" ? items : active === "uncategorized" ? items.filter((item)=>!item.collectionId) : items.filter((item)=>item.collectionId===active);
  const openCreate=()=>{setName("");setDialog("create")};
  const openEdit=(folder:AnimeCollection)=>{setName(folder.name);setDialog(folder)};
  return <>
    <div className="simple-head illustrated-head done-head"><div><p className="eyebrow">COMPLETED</p><h1>看完的每一次心动</h1><p>已经看完 {items.length} 部，共记录 {items.reduce((sum,item)=>sum+item.progress,0)} 集。</p></div><img src="/art/search-hero.png" alt="樱花窗前的少女与宠物"/><button className="new-folder" onClick={openCreate}><FolderOpen size={18}/><span>新建收藏夹</span></button></div>
    {!collectionsEnabled && <div className="folder-setup-tip"><Folder size={17}/>收藏夹功能需要先运行新版数据库脚本；番剧记录不受影响。</div>}
    <div className="folder-strip">
      <button className={active==="all"?"chosen":""} onClick={()=>setActive("all")}><FolderOpen/>全部 <b>{items.length}</b></button>
      <button className={active==="uncategorized"?"chosen":""} onClick={()=>setActive("uncategorized")}><Folder/>未分类 <b>{items.filter((item)=>!item.collectionId).length}</b></button>
      {collections.map((folder)=><button key={folder.id} className={active===folder.id?"chosen":""} onClick={()=>setActive(folder.id)} onDoubleClick={()=>openEdit(folder)}><Folder/> {folder.name} <b>{items.filter((item)=>item.collectionId===folder.id).length}</b><i onClick={(event)=>{event.stopPropagation();openEdit(folder)}}>•••</i></button>)}
    </div>
    {filtered.length?<div className="library-grid collection-grid">{filtered.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected} folderName={collections.find((folder)=>folder.id===item.collectionId)?.name}/>)}</div>:<Empty text={active === "all" ? "看完一部动画后，它会收藏在这里。" : "这个收藏夹还是空的，打开一部已看完的番剧就能把它放进来。"} onDiscover={onDiscover}/>}
    {dialog && <div className="contact-backdrop" onClick={()=>setDialog(null)}><section className="folder-dialog" onClick={(event)=>event.stopPropagation()}><button className="close" onClick={()=>setDialog(null)}><X/></button><div className="contact-icon"><FolderOpen/></div><p className="eyebrow">ANIME COLLECTION</p><h2>{dialog==="create"?"新建收藏夹":"管理收藏夹"}</h2><p>比如“治愈系”“年度最佳”“和朋友一起看”。</p><input autoFocus maxLength={30} value={name} onChange={(event)=>setName(event.target.value)} onKeyDown={async(event)=>{if(event.key==="Enter"){const ok=dialog==="create"?await createCollection(name):await renameCollection(dialog.id,name);if(ok)setDialog(null)}}} placeholder="收藏夹名称"/><div className="folder-dialog-actions">{dialog!=="create"&&<button className="danger" onClick={async()=>{await deleteCollection(dialog.id);setActive("all");setDialog(null)}}><Trash2/>删除</button>}<button className="primary" onClick={async()=>{const ok=dialog==="create"?await createCollection(name):await renameCollection(dialog.id,name);if(ok)setDialog(null)}}><Check/>{dialog==="create"?"创建":"保存"}</button></div></section></div>}
  </>;
}

function ProfilePage({userEmail,myUserId,email,setEmail,otp,setOtp,codeSent,setCodeSent,authBusy,login,verifyCode,supabase,displayName,setDisplayName,saveProfile,avatarUrl,setAvatarUrl,theme,setTheme,stats,showNotice,friendships,sendFriendRequest,respondFriendRequest}:{userEmail:string|null;myUserId:string|null;email:string;setEmail:(x:string)=>void;otp:string;setOtp:(x:string)=>void;codeSent:boolean;setCodeSent:(x:boolean)=>void;authBusy:boolean;login:()=>void;verifyCode:()=>void;supabase:ReturnType<typeof createClient>;displayName:string;setDisplayName:(x:string)=>void;saveProfile:()=>void;avatarUrl:string;setAvatarUrl:(x:string)=>void;theme:string;setTheme:(x:string)=>void;stats:{all:number;pending:number;watching:number;done:number;episodes:number};showNotice:(x:string)=>void;friendships:Friendship[];sendFriendRequest:(email:string)=>Promise<boolean>;respondFriendRequest:(id:number,accept:boolean)=>Promise<void>}) {
  const [contactOpen,setContactOpen]=useState(false);
  const [friendsOpen,setFriendsOpen]=useState(false);
  const [panel,setPanel]=useState<"friends"|"settings"|"terms"|"help"|null>(null);
  const [uploadingAvatar,setUploadingAvatar]=useState(false);
  function changeTheme(next:string) {
    setTheme(next);
    localStorage.setItem("fanji-theme",next);
    showNotice("外观设置已保存");
  }
  if (!userEmail) return <div className="profile-card"><div className="profile-icon"><UserRound size={30}/></div><p className="eyebrow">CLOUD SYNC</p><h1>登录尚文番迹</h1><p>{codeSent ? <>验证码已发送至 <b>{email}</b></> : "使用邮箱验证码登录，在不同设备同步片库。"}</p>{codeSent ? <><div className="login-row otp-row"><input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={event=>setOtp(event.target.value.replace(/\D/g,"").slice(0,8))} onKeyDown={event=>event.key === "Enter" && verifyCode()} placeholder="输入八位验证码"/><button disabled={authBusy} onClick={verifyCode}>{authBusy?<Loader2 className="spin" size={18}/>:"确认登录"}</button></div><div className="auth-links"><button disabled={authBusy} onClick={login}>重新发送验证码</button><button onClick={()=>{setCodeSent(false);setOtp("")}}>更换邮箱</button></div></> : <div className="login-row"><input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} onKeyDown={event=>event.key === "Enter" && login()} placeholder="你的邮箱"/><button disabled={authBusy} onClick={login}>{authBusy?<Loader2 className="spin" size={18}/>:"发送验证码"}</button></div>}<small className="auth-tip">验证码仅用于登录，我们不会保存你的邮箱密码。</small></div>;
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
    <section className="account-hero"><img className="account-art" src="/art/profile-spring.png" alt="樱花小径上的少女与宠物"/><div className="account-content"><label className="avatar-upload" title="更换头像"><span className="large-avatar">{avatarUrl?<img src={avatarUrl} alt="个人头像"/>:initial}</span><span className="camera-badge">{uploadingAvatar?<Loader2 className="spin"/>:<Camera/>}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} onChange={event=>uploadAvatar(event.target.files?.[0])}/></label><div><p className="eyebrow">MY ANIME PROFILE</p><h1>{displayName}</h1><p>{userEmail}</p><small className="avatar-tip">点击头像更换图片</small></div><button className="outline-button" onClick={()=>supabase?.auth.signOut()}><LogOut size={16}/>退出登录</button></div></section>
    <section className="profile-stats"><ProfileStat value={stats.all} label="全部收藏"/><ProfileStat value={stats.pending} label="待确认"/><ProfileStat value={stats.watching} label="正在看"/><ProfileStat value={stats.done} label="已看完"/><ProfileStat value={stats.episodes} label="观看集数"/></section>
    <div className="profile-columns"><section className="settings-card"><SectionTitle title="个人资料" meta="PROFILE"/><label>昵称</label><div className="profile-name-row"><input value={displayName} maxLength={24} onChange={event=>setDisplayName(event.target.value)}/><button onClick={saveProfile}>保存</button></div><label>登录邮箱</label><div className="readonly-field">{userEmail}<ShieldCheck size={17}/></div></section>
    <section className="settings-card"><SectionTitle title="好友与设置" meta="FRIENDS & SETTINGS"/><SettingRow icon={<UsersThree/>} title="我的好友" subtitle={`${friendships.filter(item=>item.status==="accepted").length} 位好友 · ${friendships.filter(item=>item.status==="pending"&&item.addressee_id===myUserId).length} 条新申请`} onClick={()=>setFriendsOpen(true)}/><SettingRow icon={<Mail/>} title="联系我们" subtitle="联系尚文番迹开发者" onClick={()=>setContactOpen(true)}/><SettingRow icon={<Settings/>} title="应用设置" subtitle="主题、语言与数据显示" onClick={()=>setPanel("settings")}/><SettingRow icon={<FileText/>} title="用户条款与隐私" subtitle="查看服务规则和隐私说明" onClick={()=>setPanel("terms")}/><SettingRow icon={<CircleHelp/>} title="帮助与反馈" subtitle="使用问题与意见反馈" onClick={()=>setPanel("help")}/></section></div>
    <p className="version">尚文番迹 · Version 0.2.0</p>
    {friendsOpen && <div className="contact-backdrop" onClick={()=>setFriendsOpen(false)}><section className="info-dialog friends-dialog" onClick={event=>event.stopPropagation()}><button className="close" onClick={()=>setFriendsOpen(false)}><X/></button><FriendPanel myUserId={myUserId} friendships={friendships} supabase={supabase} sendFriendRequest={sendFriendRequest} respondFriendRequest={respondFriendRequest} showNotice={showNotice}/></section></div>}
    {contactOpen && <div className="contact-backdrop" onClick={()=>setContactOpen(false)}><section className="contact-dialog" onClick={event=>event.stopPropagation()}><button className="close" onClick={()=>setContactOpen(false)}><X/></button><div className="contact-icon"><Mail/></div><p className="eyebrow">CONTACT US</p><h2>联系我们</h2><p>如果你有建议、遇到问题，欢迎通过邮箱联系。</p><a className="contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><div className="contact-actions"><button onClick={async()=>{await navigator.clipboard.writeText(CONTACT_EMAIL);showNotice("联系邮箱已复制")}}><Copy size={16}/>复制邮箱</button><a href={`mailto:${CONTACT_EMAIL}`}><Mail size={16}/>发送邮件</a></div></section></div>}
    {panel && <div className="contact-backdrop" onClick={()=>setPanel(null)}><section className="info-dialog" onClick={event=>event.stopPropagation()}><button className="close" onClick={()=>setPanel(null)}><X/></button>{panel==="settings"&&<><p className="eyebrow">APP SETTINGS</p><h2>应用设置</h2><div className="info-section"><h3>外观主题</h3><p>选择你喜欢的页面颜色，设置会保存在当前设备。</p><div className="theme-options">{[["light","明亮"],["soft","柔和"],["dark","深色"]].map(([value,label])=><button key={value} className={theme===value?"chosen":""} onClick={()=>changeTheme(value)}>{label}</button>)}</div></div><div className="info-section"><h3>语言</h3><div className="setting-value">简体中文 <span>当前版本</span></div></div><div className="info-section"><h3>数据同步</h3><p>番剧记录、昵称和头像通过你的登录账户同步；主题设置只保存在当前设备。</p></div></>}{panel==="terms"&&<><p className="eyebrow">TERMS & PRIVACY</p><h2>用户条款与隐私</h2><div className="legal-copy"><h3>服务说明</h3><p>尚文番迹用于记录个人观看进度、评分和短评。请勿利用本服务上传违法、有害或侵犯他人权益的内容。</p><h3>账户与数据</h3><p>邮箱用于登录和识别账户；番剧记录、昵称及头像存储于 Supabase 云端。我们不会要求或保存你的邮箱密码。</p><h3>第三方数据</h3><p>动画资料来自第三方公开数据服务，名称、封面、集数和评分可能存在延迟或误差。</p><h3>隐私与安全</h3><p>每位用户只能访问自己的番剧记录。头像为公开链接，请不要上传包含敏感个人信息的图片。</p><h3>数据管理</h3><p>你可以在番剧详情中删除记录。如需处理账户或其他数据，请通过“联系我们”与开发者联系。</p><small>更新日期：2026年9月13日</small></div></>}{panel==="help"&&<><p className="eyebrow">HELP & FEEDBACK</p><h2>帮助与反馈</h2><div className="faq"><details open><summary>怎样添加一部番剧？</summary><p>进入“搜索”，输入番剧名称，点击“添加”。它会先进入“待确认”。</p></details><details><summary>怎样移到正看或看完？</summary><p>点击待确认中的番剧，在详情里选择“正看”或“看完”，然后保存。</p></details><details><summary>记录会不会丢失？</summary><p>登录后数据会保存到云端。更换设备时使用同一个邮箱登录即可同步。</p></details><details><summary>头像为什么上传失败？</summary><p>请上传不超过 2MB 的 JPG、PNG 或 WebP 图片，并确认网络连接正常。</p></details></div><button className="feedback-button" onClick={()=>{setPanel(null);setContactOpen(true)}}><Mail size={17}/>联系开发者反馈</button></>}</section></div>}
  </div>;
}

function FriendPanel({myUserId,friendships,supabase,sendFriendRequest,respondFriendRequest,showNotice}:{myUserId:string|null;friendships:Friendship[];supabase:ReturnType<typeof createClient>;sendFriendRequest:(email:string)=>Promise<boolean>;respondFriendRequest:(id:number,accept:boolean)=>Promise<void>;showNotice:(x:string)=>void}) {
  const [friendEmail,setFriendEmail]=useState("");
  const [sending,setSending]=useState(false);
  const [selectedFriend,setSelectedFriend]=useState<FriendProfile|null>(null);
  const [friendAnime,setFriendAnime]=useState<RecordItem[]>([]);
  const [friendCollections,setFriendCollections]=useState<AnimeCollection[]>([]);
  const [loadingLibrary,setLoadingLibrary]=useState(false);
  const requests=friendships.filter(item=>item.status==="pending"&&item.addressee_id===myUserId);
  const sent=friendships.filter(item=>item.status==="pending"&&item.requester_id===myUserId);
  const friends=friendships.filter(item=>item.status==="accepted");
  async function openFriend(profile:FriendProfile){
    if(!supabase||!profile.id)return;
    setSelectedFriend(profile);setLoadingLibrary(true);
    const [animeResponse,collectionResponse]=await Promise.all([
      supabase.from("user_anime").select("*").eq("user_id",profile.id).eq("status","done").order("updated_at",{ascending:false}),
      supabase.from("anime_collections").select("id,name").eq("user_id",profile.id).order("created_at",{ascending:true}),
    ]);
    if(animeResponse.error)showNotice(`好友片库读取失败：${animeResponse.error.message}`);
    setFriendAnime((animeResponse.data??[]).map(x=>({id:x.anime_id,name:x.name,name_cn:x.name_cn,image:x.image_url,eps:x.total_episodes,score:x.community_score,status:"done",progress:x.progress,rating:x.rating,note:x.note,collectionId:x.collection_id})));
    setFriendCollections(collectionResponse.data??[]);setLoadingLibrary(false);
  }
  if(selectedFriend)return <div className="friend-library"><button className="friend-back" onClick={()=>setSelectedFriend(null)}><ArrowLeft/>返回好友列表</button><div className="friend-profile-head"><Avatar profile={selectedFriend}/><div><p className="eyebrow">FRIEND&apos;S COLLECTION</p><h2>{selectedFriend.display_name||selectedFriend.email.split("@")[0]}的看完收藏</h2><span>{friendAnime.length} 部动画 · {friendCollections.length} 个收藏夹</span></div></div>{loadingLibrary?<div className="recommend-loading"><Loader2 className="spin"/>正在打开好友片库…</div>:friendAnime.length?<div className="friend-folder-groups">{[{id:null,name:"未分类"},...friendCollections].map(folder=>{const items=friendAnime.filter(item=>item.collectionId===(folder.id??null));return items.length?<section key={folder.id??"none"}><h3><Folder/> {folder.name}<b>{items.length}</b></h3><div className="friend-anime-grid">{items.map(item=><div key={item.id}><img src={item.image||"/placeholder.svg"} alt=""/><strong>{item.name_cn||item.name}</strong><span><Star/> {item.rating||item.score||"暂无"}</span></div>)}</div></section>:null})}</div>:<div className="friend-empty"><Heart weight="duotone"/><b>好友还没有看完记录</b><span>以后再来看看吧</span></div>}</div>;
  return <><p className="eyebrow">ANIME FRIENDS</p><h2>一起收藏喜欢的故事</h2><p className="friends-intro">输入对方的登录邮箱发送申请。对方同意后，你们就能互相查看“看完”收藏夹。</p><div className="friend-add"><UserPlus/><input type="email" value={friendEmail} onChange={event=>setFriendEmail(event.target.value)} onKeyDown={event=>event.key==="Enter"&&!sending&&document.getElementById("friend-send")?.click()} placeholder="输入好友的登录邮箱"/><button id="friend-send" disabled={sending||!friendEmail.includes("@")} onClick={async()=>{setSending(true);const ok=await sendFriendRequest(friendEmail);if(ok)setFriendEmail("");setSending(false)}}>{sending?<Loader2 className="spin"/>:<PaperPlaneTilt/>}<span>发送申请</span></button></div>{requests.length>0&&<section className="friend-section"><h3>等待你同意 <b>{requests.length}</b></h3>{requests.map(item=><article className="request-card" key={item.id}><Avatar profile={item.profile}/><div><strong>{item.profile.display_name||item.profile.email.split("@")[0]}</strong><span>{item.profile.email}</span></div><button className="accept" onClick={()=>respondFriendRequest(item.id,true)}><Check/>同意</button><button className="decline" onClick={()=>respondFriendRequest(item.id,false)}><X/></button></article>)}</section>}<section className="friend-section"><h3>我的好友 <b>{friends.length}</b></h3>{friends.length?<div className="friends-grid">{friends.map(item=><button key={item.id} onClick={()=>openFriend(item.profile)}><Avatar profile={item.profile}/><span><strong>{item.profile.display_name||item.profile.email.split("@")[0]}</strong><small>查看看完收藏夹</small></span><ChevronRight/></button>)}</div>:<div className="mini-empty"><UsersThree/><span>还没有好友，发出第一份邀请吧</span></div>}</section>{sent.length>0&&<section className="friend-section sent-list"><h3>已发送申请 <b>{sent.length}</b></h3>{sent.map(item=><span key={item.id}>{item.profile.email}<small>等待同意</small></span>)}</section>}</>;
}

function Avatar({profile}:{profile:FriendProfile}){return <span className="friend-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:(profile.display_name||profile.email||"友")[0]?.toUpperCase()}</span>}

function EditModal({item,collections,saveRecord,deleteRecord,close,showNotice,afterSave}:{item:RecordItem;collections:AnimeCollection[];saveRecord:(x:RecordItem)=>Promise<void>;deleteRecord:(x:RecordItem)=>void;close:()=>void;showNotice:(x:string)=>void;afterSave:(status:Status)=>void}) {
  const [draft,setDraft]=useState(item);
  return <div className="modal-backdrop" onClick={close}><div className="modal" onClick={event=>event.stopPropagation()}><button className="close" onClick={close}><X/></button><img src={draft.image || "/placeholder.svg"} alt=""/><div className="modal-content"><p className="eyebrow">EDIT RECORD</p><h2>{draft.name_cn || draft.name}</h2><p className="muted">{draft.name}</p><label>放到哪里</label><div className="status-pills">{(["watching","done"] as Status[]).map(status=><button key={status} className={draft.status===status?"chosen":""} onClick={()=>setDraft({...draft,status,collectionId:status==="done"?draft.collectionId:null})}>{statusMeta[status].label}</button>)}</div>{draft.status==="done"&&<><label>看完收藏夹</label><div className="collection-pills"><button className={!draft.collectionId?"chosen":""} onClick={()=>setDraft({...draft,collectionId:null})}>未分类</button>{collections.map((folder)=><button key={folder.id} className={draft.collectionId===folder.id?"chosen":""} onClick={()=>setDraft({...draft,collectionId:folder.id})}>{folder.name}</button>)}</div>{!collections.length&&<small className="modal-tip">可在“看完”页新建收藏夹后再分类。</small>}</>}<label>观看进度</label><div className="counter"><button onClick={()=>setDraft({...draft,progress:Math.max(0,draft.progress-1)})}><Minus/></button><b>{draft.progress} <small>/ {draft.eps || "?"} 集</small></b><button onClick={()=>setDraft({...draft,progress:Math.min(draft.eps||999,draft.progress+1)})}><Plus/></button></div><label>我的评分</label><div className="rating">{[1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} className={draft.rating>=n?"lit":""} onClick={()=>setDraft({...draft,rating:n})}>{n}</button>)}</div><label htmlFor="anime-note">我的短评</label><textarea id="anime-note" className="note-input" maxLength={500} value={draft.note || ""} onChange={event=>setDraft({...draft,note:event.target.value})} placeholder="写下看完后的感受……"/><div className="modal-actions"><button className="delete-record" onClick={()=>deleteRecord(draft)}><Trash2 size={17}/> 删除</button><button className="save-close" onClick={async()=>{await saveRecord(draft);close();afterSave(draft.status);showNotice(draft.status === "watching" ? "已移到正看" : draft.status === "done" ? "已移到看完" : "记录已保存")}}><Check size={17}/> 保存并关闭</button></div></div></div></div>;
}

function AnimeCard({item,onOpen,folderName}:{item:RecordItem;onOpen:(x:RecordItem)=>void;folderName?:string}) { const percent=item.eps?Math.round(item.progress/item.eps*100):0; return <button className="anime-card" onClick={()=>onOpen(item)}><div className="cover"><img src={item.image || "/placeholder.svg"} alt=""/><span style={{background:statusMeta[item.status].color}}>{statusMeta[item.status].label}</span>{folderName&&<em><Folder size={11}/>{folderName}</em>}</div><div className="card-copy"><h3>{item.name_cn || item.name}</h3><p>{item.name}</p><div className="progress-line"><i style={{width:`${percent}%`}}/></div><div className="card-meta"><span>{item.progress} / {item.eps || "?"} 集</span>{item.rating>0?<span><Star size={13} fill="currentColor"/> {item.rating}</span>:item.score?<span><Star size={13}/> {item.score}</span>:null}</div></div></button> }
function SearchCard({item,added,onAdd}:{item:Anime;added:boolean;onAdd:(x:Anime)=>void}) { return <article className="search-card"><img src={item.image || "/placeholder.svg"} alt=""/><div><h3>{item.name_cn || item.name}</h3><p>{item.name}</p><span>{item.eps || "?"} 集 · <Star size={13} fill="currentColor"/> {item.score || "暂无"}</span><button className={added?"added":""} disabled={added} onClick={()=>onAdd(item)}>{added?<><Check size={16}/>已添加</>:<><Plus size={16}/>添加</>}</button></div></article> }
function NavButton({active,icon,label,badge,onClick}:{active:boolean;icon:React.ReactNode;label:string;badge?:number;onClick:()=>void}) { return <button className={active?"active":""} onClick={onClick}><span className="nav-icon">{icon}{badge? <b>{badge}</b>:null}</span><span>{label}</span></button> }
function SectionTitle({title,meta}:{title:string;meta:string}) { return <div className="section-title compact-section-title"><div><h2>{title}</h2></div><span>{meta}</span></div> }
function ProfileStat({value,label}:{value:string|number;label:string}) { return <div><b>{value}</b><span>{label}</span></div> }
function SettingRow({icon,title,subtitle,onClick}:{icon:React.ReactNode;title:string;subtitle:string;onClick:()=>void}) { return <button className="setting-row" onClick={onClick}><i>{icon}</i><span><b>{title}</b><small>{subtitle}</small></span><ChevronRight/></button> }
function Empty({text,onDiscover}:{text:string;onDiscover?:()=>void}) { return <div className="empty"><img src="/art/empty-companions.png" alt="守着番剧手账的猫咪和小狗"/><div><Heart weight="duotone"/><h2>下一段故事在等你</h2><p>{text}</p>{onDiscover&&<button onClick={onDiscover}><Binoculars weight="duotone"/>去发现动画</button>}</div></div> }
