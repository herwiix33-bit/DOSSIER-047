-- DOSSIER 047 v2 — migration à exécuter dans Supabase SQL Editor
alter table public.clues
  add column if not exists hint text not null default '',
  add column if not exists map_url text not null default '';

alter table public.game_sessions
  add column if not exists duration_seconds integer not null default 1800;

alter table public.teams
  add column if not exists team_color text default '#d94d4d',
  add column if not exists access_token_hash text,
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz;

-- Les réponses restent stockées sous forme de hash et ne sont jamais exposées aux joueurs.
update public.clues set hint = coalesce(hint,'');
update public.clues set description = coalesce(description,'');

-- Session initiale de 30 minutes. Le code est à communiquer aux équipes.
insert into public.game_sessions(name, session_code, status, duration_seconds)
values ('DOSSIER 047 — L’AFFAIRE CLASSÉE','047-2026','waiting',1800)
on conflict (session_code) do nothing;

-- Six indices permanents : les QR Codes contiennent ?code=QR01 ... QR06.
insert into public.clues(code,title,description,media_type,order_index,is_active,hint)
values
('QR01','Le témoignage','Écoutez attentivement le témoignage.','audio',1,true,'Réécoutez les détails concernant le lieu et l’objet aperçu.'),
('QR02','La photographie','Observez la photographie et ses détails.','image',2,true,'Regardez l’arrière-plan et les éléments secondaires.'),
('QR03','La localisation','Suivez la carte pour retrouver la prochaine preuve.','map',3,true,'Repérez un point remarquable sur la carte.'),
('QR04','Le message de l’informateur','Écoutez ou regardez le message de l’informateur.','video',4,true,'Un détail important est donné vers la fin.'),
('QR05','L’interrogatoire','Croisez les déclarations et les indices.','image',5,true,'Éliminez les suspects qui ne correspondent pas aux faits.'),
('QR06','Le coffre','Résolvez l’ultime énigme pour ouvrir le coffre.','video',6,true,'Le numéro du dossier peut être utile.')
on conflict (code) do nothing;

create unique index if not exists teams_session_name_unique
on public.teams(session_id, lower(team_name));

create index if not exists teams_access_token_hash_idx
on public.teams(access_token_hash);

-- Toutes les opérations passent par la fonction Edge game-api.
-- Aucune lecture/écriture directe depuis le navigateur.
alter table public.game_sessions enable row level security;
alter table public.teams enable row level security;
alter table public.clues enable row level security;
alter table public.team_progress enable row level security;
alter table public.admin_users enable row level security;

revoke all on public.game_sessions from anon, authenticated;
revoke all on public.teams from anon, authenticated;
revoke all on public.clues from anon, authenticated;
revoke all on public.team_progress from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;

grant all on public.game_sessions to service_role;
grant all on public.teams to service_role;
grant all on public.clues to service_role;
grant all on public.team_progress to service_role;
grant all on public.admin_users to service_role;


-- Réponses de démonstration. À modifier ensuite depuis l'administration.
update public.clues set answer_hash = '53b540053cd9100eaf9bbc6a9f40329221ecccc3a890a6cfd9d5487409364ce6' where code='QR01' and answer_hash is null;
update public.clues set answer_hash = '2f4aeff2f2459fec3af36e03c27c808cdf4d829847c40efbb520fdedd1ca06ef' where code='QR02' and answer_hash is null;
update public.clues set answer_hash = '69e66461f5c67a9c172191f23c3a37a91196bf3002edaf9cc79b9461678459d0' where code='QR03' and answer_hash is null;
update public.clues set answer_hash = '5597ffc0d90eb19a301c96382e0d1f5573cb3985deed095714bcdba790eacec4' where code='QR04' and answer_hash is null;
update public.clues set answer_hash = '5597ffc0d90eb19a301c96382e0d1f5573cb3985deed095714bcdba790eacec4' where code='QR05' and answer_hash is null;
update public.clues set answer_hash = 'e6489353932b602d265d253e979292ea4ba2dc3f6618a6510722b74c80abfe4b' where code='QR06' and answer_hash is null;

-- Helper sécurisé pour autoriser uniquement les administrateurs à gérer les médias.
create or replace function public.is_d047_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_d047_admin() from public;
grant execute on function public.is_d047_admin() to authenticated;

-- Bucket public pour la lecture des médias, écriture réservée aux admins.
drop policy if exists "D047 public read media" on storage.objects;
create policy "D047 public read media" on storage.objects
for select to public
using (bucket_id = 'dossier047-media');

drop policy if exists "D047 admin upload media" on storage.objects;
create policy "D047 admin upload media" on storage.objects
for insert to authenticated
with check (bucket_id = 'dossier047-media' and public.is_d047_admin());

drop policy if exists "D047 admin update media" on storage.objects;
create policy "D047 admin update media" on storage.objects
for update to authenticated
using (bucket_id = 'dossier047-media' and public.is_d047_admin())
with check (bucket_id = 'dossier047-media' and public.is_d047_admin());

drop policy if exists "D047 admin delete media" on storage.objects;
create policy "D047 admin delete media" on storage.objects
for delete to authenticated
using (bucket_id = 'dossier047-media' and public.is_d047_admin());
