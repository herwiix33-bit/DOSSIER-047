-- DOSSIER 047 V4 — thèmes USA / Cinéma / Royauté
-- Migration additive : conserve les équipes, les indices et les QR01..QR06 déjà existants.
alter table public.teams
  add column if not exists theme text not null default 'usa';

alter table public.clues
  add column if not exists theme text not null default 'usa';

alter table public.teams
  drop constraint if exists teams_theme_check;
alter table public.teams
  add constraint teams_theme_check check (theme in ('usa','cinema','royaute'));

alter table public.clues
  drop constraint if exists clues_theme_check;
alter table public.clues
  add constraint clues_theme_check check (theme in ('usa','cinema','royaute'));

-- Les six QR déjà imprimés restent identiques et deviennent le parcours USA.
update public.clues set theme='usa' where code ~ '^QR[0-9]{2,}$';

-- Six nouveaux QR permanents pour le thème Cinéma.
insert into public.clues(code,theme,title,description,media_type,order_index,is_active,hint)
values
('CIN01','cinema','La première scène','Indice cinéma 1 — contenu à personnaliser.','text',101,true,''),
('CIN02','cinema','Le rôle mystérieux','Indice cinéma 2 — contenu à personnaliser.','text',102,true,''),
('CIN03','cinema','La réplique','Indice cinéma 3 — contenu à personnaliser.','text',103,true,''),
('CIN04','cinema','Le décor','Indice cinéma 4 — contenu à personnaliser.','text',104,true,''),
('CIN05','cinema','Le générique','Indice cinéma 5 — contenu à personnaliser.','text',105,true,''),
('CIN06','cinema','Le dernier plan','Indice cinéma 6 — contenu à personnaliser.','text',106,true,'')
on conflict (code) do nothing;

-- Six nouveaux QR permanents pour le thème Royauté.
insert into public.clues(code,theme,title,description,media_type,order_index,is_active,hint)
values
('ROY01','royaute','Le royaume','Indice royauté 1 — contenu à personnaliser.','text',201,true,''),
('ROY02','royaute','La couronne','Indice royauté 2 — contenu à personnaliser.','text',202,true,''),
('ROY03','royaute','Le blason','Indice royauté 3 — contenu à personnaliser.','text',203,true,''),
('ROY04','royaute','Le secret du château','Indice royauté 4 — contenu à personnaliser.','text',204,true,''),
('ROY05','royaute','Le serment','Indice royauté 5 — contenu à personnaliser.','text',205,true,''),
('ROY06','royaute','Le trône','Indice royauté 6 — contenu à personnaliser.','text',206,true,'')
on conflict (code) do nothing;

create index if not exists clues_theme_order_idx on public.clues(theme, order_index);
create index if not exists teams_session_theme_idx on public.teams(session_id, theme);
