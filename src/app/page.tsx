"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Camera, Check, CaretRight as ChevronRight, Question as CircleHelp,
  Copy, FileText, Heart, Envelope as Mail, CircleNotch as Loader2,
  SignOut as LogOut, Minus, PawPrint, Play, Plus, MagnifyingGlass as Search,
  Gear as Settings, ShieldCheck, Star, Trash as Trash2,
  User as UserRound, X,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

type Status = "wish" | "watching" | "done" | "paused" | "dropped";
type Tab = "search" | "watching" | "done" | "profile";
type Anime = { id: number; name: string; name_cn?: string; image?: string; eps?: number; score?: number; summary?: string };
type RecordItem = Anime & { status: Status; progress: number; rating: number; note?: string };
const CONTACT_EMAIL = "shaidurmxnxboeiei63929999@gmail.com";

const statusMeta: Record<Status, { label: string; color: string }> = {
  wish: { label: "待确认", color: "#d79986" }, watching: { label: "正看", color: "#a77761" },
  done: { label: "看完", color: "#755046" }, paused: { label: "搁置", color: "#a79a91" },
  dropped: { label: "弃番", color: "#c27c76" },
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
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("番剧旅行者");
  const [avatarUrl, setAvatarUrl] = useState("");
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

  return <main className={`app-shell four-page-app theme-${theme}`}>
    <header className="topbar compact-topbar">
      <button className="brand" onClick={() => setTab("search")}><span className="brand-mark"><PawPrint size={24} weight="fill"/></span><span>尚文番迹<small>把热爱留在时间里</small></span></button>
      <div className="page-context">{tab === "search" ? "发现动画" : tab === "watching" ? "正在观看" : tab === "done" ? "看完收藏" : "个人中心"}</div>
    </header>

    <section className="page four-page-content">
      {tab === "search" && <SearchPage query={query} setQuery={setQuery} searchAnime={searchAnime} searching={searching} results={results} clearResults={()=>setResults([])} records={records} added={added} addFromSearch={addFromSearch} setSelected={setSelected}/>} 
      {tab === "watching" && <CollectionPage eyebrow="WATCHING" title="正在看的故事" description={`${watching.length} 部动画正在陪你度过这段时间。`} items={watching} empty="还没有正在看的动画；从搜索页加入后改为“正看”吧。" setSelected={setSelected}/>} 
      {tab === "done" && <CollectionPage eyebrow="COMPLETED" title="看完的每一次心动" description={`已经看完 ${done.length} 部，共记录 ${done.reduce((sum,item)=>sum+item.progress,0)} 集。`} items={done} empty="看完一部动画后，它会收藏在这里。" setSelected={setSelected}/>} 
      {tab === "profile" && <ProfilePage userEmail={userEmail} email={email} setEmail={setEmail} otp={otp} setOtp={setOtp} codeSent={codeSent} setCodeSent={setCodeSent} authBusy={authBusy} login={login} verifyCode={verifyCode} supabase={supabase} displayName={displayName} setDisplayName={setDisplayName} saveProfile={saveProfile} avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} theme={theme} setTheme={setTheme} stats={{all:records.length,pending:added.length,watching:watching.length,done:done.length,episodes:totalEpisodes}} showNotice={showNotice}/>}
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
    <section className="anime-hero"><img src="/art/search-hero.png" alt="樱花窗前与猫狗相伴的少女"/><div className="hero-copy"><p className="eyebrow">SHANGWEN ANIME JOURNEY</p><h1>找到下一部<br/>喜欢的番</h1><p>搜索动画资料，加入清单，再慢慢把故事看完。</p></div></section>
    <div className="main-search"><Search size={20}/><input value={query} onChange={(event)=>setQuery(event.target.value)} onKeyDown={(event)=>event.key === "Enter" && searchAnime()} placeholder="搜索番剧名称，例如：葬送的芙莉莲"/><button onClick={searchAnime}>{searching?<Loader2 className="spin" size={18}/>:"搜索"}</button></div>
    {results.length > 0 && <><div className="search-results-heading"><SectionTitle title="搜索结果" meta={`${results.length} 个结果`}/><button className="search-back-button" onClick={clearResults}><ArrowLeft size={17}/>返回</button></div><div className="result-grid">{results.map(item=><SearchCard key={item.id} item={item} added={records.some(record=>record.id===item.id)} onAdd={addFromSearch}/>)}</div></>}
    {!results.length && !searching && <div className="discovery-blank"><img src="/art/empty-companions.png" alt="猫咪和小狗守着番剧手账"/><div><p className="eyebrow">A NEW STORY AWAITS</p><h2>从一部动画开始</h2><p>搜索结果会显示封面、集数和社区评分。</p></div></div>}
    {added.length > 0 && <><SectionTitle title="待确认" meta={`${added.length} 部动画`}/><div className="library-grid">{added.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected}/>)}</div></>}
  </>;
}

function CollectionPage({eyebrow,title,description,items,empty,setSelected}:{eyebrow:string;title:string;description:string;items:RecordItem[];empty:string;setSelected:(x:RecordItem)=>void}) {
  return <><div className="simple-head"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{items.length?<div className="library-grid collection-grid">{items.map(item=><AnimeCard key={item.id} item={item} onOpen={setSelected}/>)}</div>:<Empty text={empty}/>}</>;
}

function ProfilePage({userEmail,email,setEmail,otp,setOtp,codeSent,setCodeSent,authBusy,login,verifyCode,supabase,displayName,setDisplayName,saveProfile,avatarUrl,setAvatarUrl,theme,setTheme,stats,showNotice}:{userEmail:string|null;email:string;setEmail:(x:string)=>void;otp:string;setOtp:(x:string)=>void;codeSent:boolean;setCodeSent:(x:boolean)=>void;authBusy:boolean;login:()=>void;verifyCode:()=>void;supabase:ReturnType<typeof createClient>;displayName:string;setDisplayName:(x:string)=>void;saveProfile:()=>void;avatarUrl:string;setAvatarUrl:(x:string)=>void;theme:string;setTheme:(x:string)=>void;stats:{all:number;pending:number;watching:number;done:number;episodes:number};showNotice:(x:string)=>void}) {
  const [contactOpen,setContactOpen]=useState(false);
  const [panel,setPanel]=useState<"settings"|"terms"|"help"|null>(null);
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
    <section className="settings-card"><SectionTitle title="设置与帮助" meta="SETTINGS"/><SettingRow icon={<Mail/>} title="联系我们" subtitle="联系尚文番迹开发者" onClick={()=>setContactOpen(true)}/><SettingRow icon={<Settings/>} title="应用设置" subtitle="主题、语言与数据显示" onClick={()=>setPanel("settings")}/><SettingRow icon={<FileText/>} title="用户条款与隐私" subtitle="查看服务规则和隐私说明" onClick={()=>setPanel("terms")}/><SettingRow icon={<CircleHelp/>} title="帮助与反馈" subtitle="使用问题与意见反馈" onClick={()=>setPanel("help")}/></section></div>
    <p className="version">尚文番迹 · Version 0.2.0</p>
    {contactOpen && <div className="contact-backdrop" onClick={()=>setContactOpen(false)}><section className="contact-dialog" onClick={event=>event.stopPropagation()}><button className="close" onClick={()=>setContactOpen(false)}><X/></button><div className="contact-icon"><Mail/></div><p className="eyebrow">CONTACT US</p><h2>联系我们</h2><p>如果你有建议、遇到问题，欢迎通过邮箱联系。</p><a className="contact-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><div className="contact-actions"><button onClick={async()=>{await navigator.clipboard.writeText(CONTACT_EMAIL);showNotice("联系邮箱已复制")}}><Copy size={16}/>复制邮箱</button><a href={`mailto:${CONTACT_EMAIL}`}><Mail size={16}/>发送邮件</a></div></section></div>}
    {panel && <div className="contact-backdrop" onClick={()=>setPanel(null)}><section className="info-dialog" onClick={event=>event.stopPropagation()}><button className="close" onClick={()=>setPanel(null)}><X/></button>{panel==="settings"&&<><p className="eyebrow">APP SETTINGS</p><h2>应用设置</h2><div className="info-section"><h3>外观主题</h3><p>选择你喜欢的页面颜色，设置会保存在当前设备。</p><div className="theme-options">{[["light","明亮"],["soft","柔和"],["dark","深色"]].map(([value,label])=><button key={value} className={theme===value?"chosen":""} onClick={()=>changeTheme(value)}>{label}</button>)}</div></div><div className="info-section"><h3>语言</h3><div className="setting-value">简体中文 <span>当前版本</span></div></div><div className="info-section"><h3>数据同步</h3><p>番剧记录、昵称和头像通过你的登录账户同步；主题设置只保存在当前设备。</p></div></>}{panel==="terms"&&<><p className="eyebrow">TERMS & PRIVACY</p><h2>用户条款与隐私</h2><div className="legal-copy"><h3>服务说明</h3><p>尚文番迹用于记录个人观看进度、评分和短评。请勿利用本服务上传违法、有害或侵犯他人权益的内容。</p><h3>账户与数据</h3><p>邮箱用于登录和识别账户；番剧记录、昵称及头像存储于 Supabase 云端。我们不会要求或保存你的邮箱密码。</p><h3>第三方数据</h3><p>动画资料来自第三方公开数据服务，名称、封面、集数和评分可能存在延迟或误差。</p><h3>隐私与安全</h3><p>每位用户只能访问自己的番剧记录。头像为公开链接，请不要上传包含敏感个人信息的图片。</p><h3>数据管理</h3><p>你可以在番剧详情中删除记录。如需处理账户或其他数据，请通过“联系我们”与开发者联系。</p><small>更新日期：2026年9月13日</small></div></>}{panel==="help"&&<><p className="eyebrow">HELP & FEEDBACK</p><h2>帮助与反馈</h2><div className="faq"><details open><summary>怎样添加一部番剧？</summary><p>进入“搜索”，输入番剧名称，点击“添加”。它会先进入“待确认”。</p></details><details><summary>怎样移到正看或看完？</summary><p>点击待确认中的番剧，在详情里选择“正看”或“看完”，然后保存。</p></details><details><summary>记录会不会丢失？</summary><p>登录后数据会保存到云端。更换设备时使用同一个邮箱登录即可同步。</p></details><details><summary>头像为什么上传失败？</summary><p>请上传不超过 2MB 的 JPG、PNG 或 WebP 图片，并确认网络连接正常。</p></details></div><button className="feedback-button" onClick={()=>{setPanel(null);setContactOpen(true)}}><Mail size={17}/>联系开发者反馈</button></>}</section></div>}
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
