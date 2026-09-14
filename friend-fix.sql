-- 尚文番迹好友功能修复脚本：可安全重复运行，不会删除任何番剧记录。
create or replace function public.send_friend_request(target_email text)
returns bigint language plpgsql security definer set search_path = public as $$
declare caller_id uuid := auth.uid(); target_id uuid; request_id bigint;
begin
  if caller_id is null then raise exception '登录状态已失效，请退出后重新登录'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(target_email));
  if target_id is null then raise exception '没有找到这个邮箱的用户'; end if;
  if target_id = caller_id then raise exception '不能添加自己'; end if;

  insert into public.profiles(id,email,display_name,avatar_url)
  select id,email,coalesce(raw_user_meta_data->>'display_name',split_part(email,'@',1)),raw_user_meta_data->>'avatar_url'
  from auth.users where id in (caller_id,target_id)
  on conflict(id) do update set
    email=excluded.email,
    display_name=coalesce(profiles.display_name,excluded.display_name),
    avatar_url=coalesce(profiles.avatar_url,excluded.avatar_url),
    updated_at=now();

  if exists(select 1 from public.friendships where status='accepted' and ((requester_id=caller_id and addressee_id=target_id) or (requester_id=target_id and addressee_id=caller_id))) then
    raise exception '你们已经是好友';
  end if;
  if exists(select 1 from public.friendships where status='pending' and requester_id=target_id and addressee_id=caller_id) then
    raise exception '对方已经向你发送申请，请到收到的申请中同意';
  end if;

  insert into public.friendships(requester_id,addressee_id,status)
  values(caller_id,target_id,'pending')
  on conflict(requester_id,addressee_id) do update set status='pending',updated_at=now()
  returning id into request_id;
  return request_id;
end; $$;

revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;

notify pgrst, 'reload schema';
