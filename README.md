# 尚文番迹

手机优先的云端追番记录 PWA，使用 Next.js、Vercel、Supabase 与 Bangumi API。

## 本地运行

1. 复制 `.env.example` 为 `.env.local`。
2. 在 Supabase 项目的 Settings → API 复制 Project URL 和 anon public key，填入 `.env.local`。
3. 在 Supabase SQL Editor 中完整执行 `supabase.sql`。
4. 在 Authentication → URL Configuration 中，将 Site URL 暂设为 `http://localhost:3000`。
5. 运行 `npm run dev`，打开 `http://localhost:3000`。

## 邮箱验证码登录

在 Supabase Dashboard 打开 Authentication → Email Templates：

1. 分别编辑 `Confirm signup` 和 `Magic Link` 模板。
2. 删除模板里的 `{{ .ConfirmationURL }}` 登录链接。
3. 在邮件正文中加入验证码，例如：`<h2>{{ .Token }}</h2><p>这是你的尚文番迹登录验证码。</p>`。
4. 保存两个模板。新用户和已有用户之后都会收到八位一次性验证码，在应用内输入即可登录。

没有环境变量时，应用会以演示模式打开；此时更改只在当前页面有效。

## 部署到 Vercel

1. 将项目推送到 GitHub（不要提交 `.env.local`）。
2. 在 Vercel 导入仓库。
3. 在 Vercel Environment Variables 添加 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
4. 部署后复制正式的 `https://项目名.vercel.app` 地址。
5. 回到 Supabase Authentication → URL Configuration，把 Site URL 改成正式地址，并把该地址加入 Redirect URLs。

`anon key` 可以放在前端，数据安全由 `supabase.sql` 中的 RLS 策略保证；绝不要把 `service_role` key 放入项目或 Vercel 前端环境变量。
