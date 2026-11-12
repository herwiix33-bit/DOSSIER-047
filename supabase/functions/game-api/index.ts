import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-team-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const sha = async (value: string) => {
  const bytes = new TextEncoder().encode(value.trim().normalize("NFKC").toLocaleUpperCase("fr-FR"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
};
const tokenHash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Méthode non autorisée." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const teamToken = req.headers.get("x-team-token") || "";

    async function requireTeam() {
      if (!teamToken || teamToken.length < 32) throw new Error("Équipe non identifiée. Reconnectez votre équipe.");
      const hash = await tokenHash(teamToken);
      const { data, error } = await db.from("teams").select("*,game_sessions(*)").eq("access_token_hash", hash).maybeSingle();
      if (error || !data) throw new Error("Jeton d'équipe invalide.");
      return data;
    }
    async function requireAdmin() {
      const auth = req.headers.get("Authorization") || "";
      if (!auth.startsWith("Bearer ")) throw new Error("Connexion administrateur requise.");
      const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
      const { data: { user }, error: authError } = await userClient.auth.getUser(auth.slice(7));
      if (authError || !user) throw new Error("Session administrateur invalide.");
      const { data: admin } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
      if (!admin) throw new Error("Ce compte n'est pas autorisé comme administrateur. Ajoutez son UUID à admin_users.");
      return user;
    }

    if (action === "create-team") {
      const teamName = String(body.team_name || "").trim().slice(0, 24);
      const sessionCode = String(body.session_code || "").trim().toUpperCase();
      const theme = String(body.theme || "");
      if (!["usa", "cinema", "royaute"].includes(theme)) throw new Error("Choisissez un thème valide.");
      if (teamName.length < 2) throw new Error("Le nom de l'équipe doit contenir au moins 2 caractères.");
      const { data: session, error: se } = await db.from("game_sessions").select("*").eq("session_code", sessionCode).maybeSingle();
      if (se || !session) throw new Error("Code de partie inconnu.");
      if (session.status === "finished") throw new Error("Cette partie est terminée.");
      const { count } = await db.from("teams").select("*", { count: "exact", head: true }).eq("session_id", session.id);
      if ((count || 0) >= 4) throw new Error("La partie a déjà atteint sa limite de quatre équipes.");
      const plainToken = crypto.randomUUID() + crypto.randomUUID();
      const hash = await tokenHash(plainToken);
      const colors = ["#d94d4d", "#4388d5", "#39a56b", "#d78a36"];
      const { data: team, error } = await db.from("teams").insert({
        session_id: session.id, team_name: teamName, theme, team_color: colors[count || 0],
        access_token_hash: hash, started_at: new Date().toISOString()
      }).select("id,team_name,team_color,theme,started_at,session_id").single();
      if (error) throw new Error(error.code === "23505" ? "Ce nom d'équipe est déjà utilisé." : error.message);
      return reply({ team, team_token: plainToken });
    }

    if (action === "team-state") {
      const team = await requireTeam();
      const [{ data: clues }, { data: progress }] = await Promise.all([
        db.from("clues").select("code,title,description,media_type,media_url,map_url,order_index,is_active,theme").eq("is_active", true).eq("theme", team.theme).order("order_index"),
        db.from("team_progress").select("clue_code,scanned_at,solved_at").eq("team_id", team.id)
      ]);
      const duration = team.game_sessions?.duration_seconds || 1800;
      const elapsed = team.started_at ? Math.floor((Date.now() - new Date(team.started_at).getTime()) / 1000) : 0;
      const remaining = Math.max(0, duration - elapsed);
      return reply({ team: { id: team.id, team_name: team.team_name, team_color: team.team_color, theme: team.theme, started_at: team.started_at, finished_at: team.finished_at }, clues: clues || [], progress: progress || [], total_clues: (clues || []).length, remaining_seconds: remaining });
    }

    if (action === "scan-clue") {
      const team = await requireTeam();
      const code = String(body.code || "").toUpperCase();
      const { data: clue, error } = await db.from("clues").select("code,title,description,media_type,media_url,map_url,order_index,is_active,theme").eq("code", code).eq("theme", team.theme).eq("is_active", true).maybeSingle();
      if (error || !clue) throw new Error("QR Code inconnu, désactivé ou réservé à un autre thème.");
      const { data: progress } = await db.from("team_progress").upsert({ team_id: team.id, clue_code: code, scanned_at: new Date().toISOString() }, { onConflict: "team_id,clue_code", ignoreDuplicates: false }).select("clue_code,scanned_at,solved_at").single();
      return reply({ clue, progress });
    }

    if (action === "submit-answer") {
      const team = await requireTeam();
      const code = String(body.code || "").toUpperCase();
      const answer = String(body.answer || "");
      const { data: clue } = await db.from("clues").select("answer_hash,is_active,theme").eq("code", code).maybeSingle();
      if (!clue || clue.theme !== team.theme || !clue.is_active || !clue.answer_hash) throw new Error("La réponse de cet indice n'est pas encore configurée.");
      const correct = (await sha(answer)) === clue.answer_hash;
      const { data: old } = await db.from("team_progress").select("attempts,scanned_at").eq("team_id", team.id).eq("clue_code", code).maybeSingle();
      await db.from("team_progress").upsert({
        team_id: team.id, clue_code: code, scanned_at: old?.scanned_at || new Date().toISOString(),
        attempts: (old?.attempts || 0) + 1,
        ...(correct ? { solved_at: new Date().toISOString() } : {})
      }, { onConflict: "team_id,clue_code" });
      return reply({ correct });
    }

    if (action === "request-hint") {
      const team = await requireTeam();
      const code = String(body.code || "").toUpperCase();
      const { data: clue } = await db.from("clues").select("hint,is_active,theme").eq("code", code).maybeSingle();
      if (!clue || clue.theme !== team.theme || !clue.is_active) throw new Error("Indice indisponible pour le thème de votre équipe.");
      return reply({ hint: clue.hint || "Aucun indice supplémentaire configuré." });
    }

    if (action === "admin-dashboard") {
      await requireAdmin();
      const { data: session } = await db.from("game_sessions").select("*").eq("session_code", "047-2026").maybeSingle();
      if (!session) throw new Error("Session 047-2026 introuvable.");
      const [{ data: teams }, { data: clues }] = await Promise.all([
        db.from("teams").select("id,team_name,team_color,theme,started_at,finished_at").eq("session_id", session.id).order("created_at"),
        db.from("clues").select("code,title,description,media_type,media_url,map_url,order_index,is_active,hint,theme").order("order_index")
      ]);
      const ids = (teams || []).map(t => t.id);
      const { data: progress } = ids.length ? await db.from("team_progress").select("team_id,clue_code,scanned_at,solved_at").in("team_id", ids) : { data: [] };
      const total = (clues || []).filter(c => c.is_active).length;
      const rows = (teams || []).map(t => {
        const p = (progress || []).filter(x => x.team_id === t.id);
        const teamTotal = (clues || []).filter(c => c.is_active && c.theme === t.theme).length;
        const solvedRows = p.filter(x => x.solved_at);
        const elapsed = t.started_at ? Math.floor((Date.now() - new Date(t.started_at).getTime()) / 1000) : 0;
        const remaining = Math.max(0, (session.duration_seconds || 1800) - elapsed);
        return { ...t, solved: solvedRows.length, scanned: p.length, solved_codes: solvedRows.map(x => x.clue_code).join(" · "), percent: Math.round(solvedRows.length / Math.max(1,teamTotal) * 100), total_clues: teamTotal, remaining_seconds: remaining, status: t.finished_at ? "Terminée" : remaining <= 0 ? "Temps écoulé" : "En cours" };
      });
      return reply({ session, teams: rows, clues: clues || [], total_clues: total });
    }

    if (action === "admin-create-clue") {
      await requireAdmin();
      const code = String(body.code || "").toUpperCase().trim();
      const theme = String(body.theme || "");
      const title = String(body.title || "").trim().slice(0, 100);
      const mediaType = String(body.media_type || "text");
      if (!["usa","cinema","royaute"].includes(theme)) throw new Error("Thème invalide.");
      const validCode = theme === "usa" ? /^QR[0-9]{2,}$/ : theme === "cinema" ? /^CIN[0-9]{2,}$/ : /^ROY[0-9]{2,}$/;
      if (!validCode.test(code)) throw new Error("Le code ne correspond pas au thème choisi.");
      if (title.length < 2) throw new Error("Le titre doit contenir au moins 2 caractères.");
      if (!["text", "image", "audio", "video", "map"].includes(mediaType)) throw new Error("Type de média invalide.");
      const { data: existing } = await db.from("clues").select("code").eq("code", code).maybeSingle();
      if (existing) throw new Error("Ce code QR existe déjà. Actualisez la page pour obtenir le prochain numéro disponible.");
      const { data: lastRows } = await db.from("clues").select("order_index").order("order_index", { ascending: false }).limit(1);
      const answer = String(body.answer || "").trim();
      const row: Record<string, unknown> = {
        code, theme, title, description: String(body.description || "").slice(0, 4000),
        media_type: mediaType, media_url: String(body.media_url || "").slice(0, 2000),
        map_url: "", hint: String(body.hint || "").slice(0, 2000),
        is_active: body.is_active !== false, order_index: (lastRows?.[0]?.order_index || 0) + 1
      };
      if (answer) row.answer_hash = await sha(answer);
      const { error } = await db.from("clues").insert(row);
      if (error) throw new Error(error.code === "23505" ? "Ce code QR existe déjà." : error.message);
      return reply({ ok: true, code });
    }

    if (action === "admin-save-clue") {
      await requireAdmin();
      const code = String(body.code || "").toUpperCase();
      const update: Record<string, unknown> = {
        title: String(body.title || "").slice(0,100), description: String(body.description || "").slice(0,4000),
        media_type: String(body.media_type || "text"), media_url: String(body.media_url || "").slice(0,2000),
        map_url: String(body.map_url || "").slice(0,2000), hint: String(body.hint || "").slice(0,2000),
        is_active: !!body.is_active
      };
      if (!["text","image","audio","video","map"].includes(String(update.media_type))) throw new Error("Type de média invalide.");
      if (String(body.answer || "").trim()) update.answer_hash = await sha(String(body.answer));
      const { error } = await db.from("clues").update(update).eq("code", code);
      if (error) throw new Error(error.message);
      return reply({ ok: true });
    }

    if (action === "admin-finish-team") {
      await requireAdmin();
      const teamId = String(body.team_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(teamId)) throw new Error("Identifiant d'équipe invalide.");
      const { error } = await db.from("teams").update({ finished_at: new Date().toISOString() }).eq("id", teamId);
      if (error) throw new Error(error.message);
      return reply({ ok: true });
    }

    if (action === "admin-session") {
      await requireAdmin();
      const status = String(body.status || "");
      if (!["waiting","running","finished"].includes(status)) throw new Error("État de partie invalide.");
      const { error } = await db.from("game_sessions").update({ status, ...(status === "finished" ? { finished_at: new Date().toISOString() } : {}) }).eq("session_code", "047-2026");
      if (error) throw new Error(error.message);
      return reply({ ok: true });
    }

    return reply({ error: "Action inconnue." }, 400);
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : "Erreur serveur." }, 400);
  }
});
