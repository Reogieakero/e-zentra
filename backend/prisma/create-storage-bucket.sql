















insert into storage.buckets (id, name, "public")
values ('zentra-uploads', 'zentra-uploads', false)
on conflict (id) do nothing;
