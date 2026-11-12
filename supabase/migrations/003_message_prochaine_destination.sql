-- DOSSIER 047 : messages personnalisés après validation d'une réponse.
-- Migration additive : aucune donnée existante n'est supprimée.
alter table public.clues
  add column if not exists next_location_message text not null default '';
