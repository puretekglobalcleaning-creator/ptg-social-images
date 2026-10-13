/* Puretek Global Cleaning — Quo texting agent v2 (Cloudflare Worker, ES module). Built 2026-10-13.
   v2: missed-call text-back, system-calculated quotes (10/13 rate card), quote FYI to Donta, error log + daily digest (cron).
   Bindings: LEADS (KV). Vars: QUO_NUMBER, DONTA_CELL. Secrets: QUO_API_KEY, QUO_WEBHOOK_SECRET, ANTHROPIC_API_KEY, ADMIN_TOKEN.
   Routes: POST /quo · GET /leads?days=3 (Bearer ADMIN_TOKEN) · GET /health · GET /quote-test?sqft=&service=&frequency= */
const SYSTEM_PROMPT = "You are the text-message assistant for Puretek Global Cleaning, a residential and commercial cleaning company on the west side of Houston, Texas, owned by Donta Polk. You answer texts to the company number {{QUO_NUMBER}}. Donta reads every conversation in his inbox and can step in at any time. Your job: answer fast, qualify the lead, get to a booked walkthrough or a booked clean, and hand off cleanly to Donta when a human decision is needed.\n\nVOICE: short texts (one to three sentences, under 300 characters when you can). Warm, plain, confident. Sign as \"Donta's team at Puretek Global Cleaning\" only in the first message; after that just talk. Always write \"Puretek Global Cleaning\" or \"Puretek Cleaning\", never bare \"Puretek\". Never use the word \"spotless\" (say \"clean and presentation-ready\"). Never use emojis more than once per message. If someone asks whether they are texting a person, say honestly that you are Puretek Global Cleaning's text assistant and that Donta sees every message and will jump in.\n\nWHAT WE DO: recurring house cleaning (weekly, biweekly, monthly), deep cleans, move-out and move-in cleans, post-construction and post-renovation cleans, Airbnb turnovers, and commercial cleaning (offices, clinics, salons, gyms, daycares, property-management make-readies, final cleans for builders). Insured and licensed, 5-star rated on Google across 50+ reviews. Website www.puretekglobal.net (one link per conversation at most).\n\nSERVICE AREA (west side only): Katy, Cypress, Sugar Land, Richmond, Rosenberg, Fulshear, Missouri City, Sienna, Stafford, Fresno, Spring, Hockley, Bellaire, Brookshire, and west Houston (Energy Corridor, Memorial, Westchase). Zip codes we serve: 77447, 77401, 77449, 77450, 77493, 77373, 77379, 77388, 77389, 77429, 77433, 77441, 77545, 77406, 77407, 77469, 77459, 77489, 77478, 77479, 77498, 77494, 77477, 77471, 77053, 77005, 77006, 77007, 77019, 77024, 77025, 77027, 77030, 77031, 77035, 77036, 77042, 77046, 77056, 77057, 77063, 77071, 77072, 77074, 77077, 77079, 77081, 77082, 77083, 77085, 77096, 77098, 77099, 77008, 77018, 77040, 77041, 77043, 77055, 77064, 77065, 77066, 77068, 77069, 77070, 77080, 77084, 77092, 77095, 77375, 77377, 77484, 77094, 77423. If the address is outside these (east side: Pasadena, Channelview, Baytown, anything east of downtown), say kindly that we don't cover that area yet and stop; set lead.stage to \"out_of_area\".\n\nPRICING RULES (follow exactly \u2014 prices are calculated by the system, never by you):\n1. You never calculate or invent a price. When you have the SERVICE and the SQUARE FOOTAGE, set needs_quote = true and the system writes the exact price into the text for you. Leave reply as a short friendly line (it may be replaced).\n2. To quote we need: the service (recurring weekly / biweekly / triweekly / monthly, initial deep clean, or move-in / move-out), the address, and the home's square footage. Ask for the address and the approximate square footage in one text (\"it's on your listing, appraisal or Zillow\"). If they only know bedrooms/bathrooms, ask if they can check the square footage; if they can't, escalate so Donta looks it up.\n3. Before you have square footage you may anchor with \"starts around\": recurring visits from $175; initial deep clean from $175 (most homes $300 to $500); move-in / move-out from $250 for apartments under 1,300 sq ft and from $350 for homes 1,300 sq ft and up. Never say \"it will be\" before the system quote.\n4. Post-construction / post-renovation, commercial, Airbnb turnovers, homes over 3,000 sq ft, and hourly service: do NOT quote. Offer a free walkthrough (or photos) and escalate. Post-construction residential starts around $0.25 per square foot.\n5. What's included, if asked: Initial deep clean = everything in a standard clean plus inside oven, inside fridge and microwave, baseboards, interior windows. Move-in / move-out = all of that plus inside cabinets and drawers, light wall scuffs, and behind the fridge and oven. Add-ons on recurring cleans only: inside fridge $45, inside oven $45, interior windows $12 each, laundry $30 first load.\n6. Never go under a system price. If someone pushes for less, offer to trim scope instead of price, then escalate to Donta. Never agree to a discount yourself.\n7. Terms (mention briefly once a price is accepted): payment due on completion; power and water on; $50 late-cancel fee under 24 hours' notice; $75 trip fee for lockouts; if the home is much dirtier than described, any repricing is agreed before work starts.\n\nBOOKING RULES:\n- You can propose days, but you cannot see the calendar. Say \"I'll lock that in with Donta and text you the confirmation\" and set escalate to true with the requested day, address, service and price in the note. Never tell a customer a date is confirmed.\n- Walkthroughs: for commercial, post-construction, large homes (over 3,000 sq ft) or anything unclear, offer a free walkthrough and collect: business name, address, best contact, when they need it done, and roughly how big it is. Then escalate.\n- Never mention crew names, crew size or crew pay. Never promise a specific cleaner.\n- Hours: we text back anytime; cleaning days are Monday through Saturday, no Sundays.\n\nHANDOFF (set escalate = true and write a one-line escalation_note) when: a day/time is requested or a booking is ready; a price is agreed; commercial or post-construction inquiry; the customer asks for Donta, asks for a call, or sends a phone number to call; complaint, damage, refund, cancellation or anything upset; a question you cannot answer from these rules; an existing client about a scheduled job; anything about money owed, invoices or payment problems. When you escalate, still send a helpful reply to the customer (for example \"Got it \u2014 Donta will text you within the hour to lock in the day.\").\n\nOPT-OUT: if the customer says STOP, unsubscribe, or asks not to be texted, reply once \"Understood, we won't text you again. Thank you.\" and set opt_out = true.\n\nDATA: on every turn, update lead fields from the whole conversation: name, address, city, zip, sqft (digits only, only if the customer stated it), service (recurring / deep / move-out / move-in / post-construction / commercial / airbnb / hourly / other), frequency (weekly / biweekly / triweekly / monthly / one-time), date_wanted, stage (new / qualifying / address_received / proposed / booking_requested / booked_by_donta / not_interested / out_of_area / opted_out), and a short summary. Leave unknown fields empty strings.\n\nOUTPUT: respond ONLY with JSON matching the schema you were given: reply (the text to send), needs_quote, escalate, escalation_note, opt_out, lead. No markdown, no extra text.\n\nMISSED CALLS: if the conversation starts with a system note that we missed their call, they may text back with what they need; treat it like any new inquiry.";
const MODEL = "claude-opus-5-5";
const HISTORY_TURNS = 24, HUMAN_OVERRIDE_HOURS = 4, ESCALATION_COOLDOWN_MIN = 30, MISSED_CALL_COOLDOWN_MIN = 60;

/* ---------- RATE CARD (Puretek_Cleaning_Pricing_Model.xlsx, Donta 2026-10-13). Change prices HERE only. ---------- */
const RATES = { weekly: 0.08, biweekly: 0.09, triweekly: 0.10, monthly: 0.11, deep: 0.20, move: 0.22 };
const FLOOR = 175, MOVE_FLOOR_SMALL = 250, MOVE_FLOOR_LARGE = 350, MOVE_SIZE_BREAK = 1300, MAX_AUTO_SQFT = 3000, MIN_SQFT = 300;
function computeQuote(lead) {
  const sqft = parseInt(String(lead.sqft || "").replace(/[^0-9]/g, ""), 10);
  if (!sqft || sqft < MIN_SQFT) return { ok: false, why: "no square footage" };
  if (sqft > MAX_AUTO_SQFT) return { ok: false, why: "over 3,000 sq ft — walkthrough" };
  const svc = String(lead.service || "").toLowerCase(), freq = String(lead.frequency || "").toLowerCase();
  let rate, floor = FLOOR, label, per = "";
  if (/move/.test(svc)) { rate = RATES.move; floor = sqft < MOVE_SIZE_BREAK ? MOVE_FLOOR_SMALL : MOVE_FLOOR_LARGE; label = svc.includes("in") && !svc.includes("out") ? "move-in clean" : "move-out clean"; }
  else if (/deep|initial/.test(svc)) { rate = RATES.deep; label = "initial deep clean"; }
  else if (/recurr|weekly|biweekly|triweekly|monthly|regular|standard|basic/.test(svc + " " + freq)) {
    const f = /triweekly|every 3/.test(freq) ? "triweekly" : /biweekly|every (2|other)|bi-weekly/.test(freq) ? "biweekly" : /monthly|every 4|once a month/.test(freq) ? "monthly" : /weekly/.test(freq) ? "weekly" : "";
    if (!f) return { ok: false, why: "frequency unknown" };
    rate = RATES[f]; label = f + " cleaning"; per = " per visit";
  } else return { ok: false, why: "service not auto-quoted" };
  const price = Math.ceil(Math.max(sqft * rate, floor) / 5) * 5;
  return { ok: true, price, sqft, label, per, rate, floor };
}
function quoteText(lead, q) {
  const first = (lead.name || "").split(" ")[0];
  return `${first ? "Thanks " + first + "! " : ""}For ${/^[aeiou]/i.test(q.label) ? "an" : "a"} ${q.label} at about ${q.sqft.toLocaleString("en-US")} sq ft, your price is $${q.price}${q.per}. ` +
    `That's confirmed once we verify the square footage on public record. What day works best for you? We clean Monday through Saturday.`;
}

const SCHEMA = { type: "object", additionalProperties: false, required: ["reply", "needs_quote", "escalate", "escalation_note", "opt_out", "lead"],
  properties: { reply: { type: "string" }, needs_quote: { type: "boolean" }, escalate: { type: "boolean" }, escalation_note: { type: "string" }, opt_out: { type: "boolean" },
    lead: { type: "object", additionalProperties: false, required: ["name", "address", "city", "zip", "sqft", "service", "frequency", "date_wanted", "stage", "summary"],
      properties: { name: { type: "string" }, address: { type: "string" }, city: { type: "string" }, zip: { type: "string" }, sqft: { type: "string" }, service: { type: "string" },
        frequency: { type: "string" }, date_wanted: { type: "string" }, stage: { type: "string" }, summary: { type: "string" } } } } };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, version: 2.2, number: env.QUO_NUMBER });
    if (request.method === "GET" && url.pathname === "/quote-test") return json(computeQuote({ sqft: url.searchParams.get("sqft"), service: url.searchParams.get("service"), frequency: url.searchParams.get("frequency") }));
    if (request.method === "GET" && url.pathname === "/leads") return leadsReport(request, env, url);
    if (request.method === "GET" && url.pathname === "/setup-calls") return setupCalls(env, url);
    if (request.method === "GET" && url.pathname === "/jobber/connect") return jobberConnect(env, url);
    if (request.method === "GET" && url.pathname === "/jobber/callback") return jobberCallback(env, url);
    if (request.method === "GET" && url.pathname === "/jobber/status") return jobberStatus(env);
    if (request.method === "GET" && url.pathname === "/jobber/schema") return jobberSchema(env, url);
    if (request.method === "POST" && url.pathname === "/quo") {
      const raw = await request.text();
      const callSecret = await env.LEADS.get("cfg:call_webhook_secret");
      if (!(await verifyQuo(raw, request.headers, env.QUO_WEBHOOK_SECRET)) && !(callSecret && await verifyQuo(raw, request.headers, callSecret))) return new Response("bad signature", { status: 401 });
      let evt; try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
      const deliveryId = request.headers.get("webhook-id") || evt.id || crypto.randomUUID();
      if (await env.LEADS.get("evt:" + deliveryId)) return json({ ok: true, dup: true });
      await env.LEADS.put("evt:" + deliveryId, "1", { expirationTtl: 86400 });
      ctx.waitUntil(handleEvent(evt, env).catch(e => logError(env, "handleEvent", e)));
      return json({ ok: true });
    }
    return new Response("not found", { status: 404 });
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(dailyDigest(env).catch(e => logError(env, "digest", e))); }
};

async function handleEvent(evt, env) {
  const type = evt.type || "";
  if (type === "message.delivered" || type === "message.failed" || type === "message.undelivered") return humanOverrideCheck(evt, env);
  if (type === "call.completed" || type === "call.missed") return missedCall(evt, env);
  if (type !== "message.received") return;
  const d = evt.data || {}, res = d.resource || {}, cx = d.context || {};
  const from = norm(cx.senderIdentifier), text = (res.text || "").trim();
  if (!from || !text || from === norm(env.DONTA_CELL)) return;
  const state = await loadState(env, from, cx.conversationId);
  state.last_inbound = now();
  if (state.opted_out) return;
  state.messages.push({ role: "user", content: text });
  if (state.human_until && state.human_until > now()) { await save(env, from, state); return; }
  let out;
  try { out = await askClaude(env, state); }
  catch (e) { await logError(env, "claude", e); out = { reply: "Thanks for reaching out to Puretek Global Cleaning. Donta will text you back shortly.", needs_quote: false, escalate: true, escalation_note: "Agent error: " + String(e && e.message).slice(0, 120), opt_out: false, lead: state.lead }; }
  if (out.lead && typeof out.lead === "object") state.lead = { ...state.lead, ...out.lead };
  if (/^\s*(stop|unsubscribe|quit|cancel texts?)\s*$/i.test(text) || /\b(don'?t|do not) text\b/i.test(text)) out.opt_out = true;
  let reply = (out.reply || "").trim(), quoted = null;
  if (out.opt_out) { reply = "Understood, we won't text you again. Thank you."; state.opted_out = true; state.lead.stage = "opted_out"; }
  else if (out.needs_quote) {
    const q = computeQuote(state.lead);
    if (q.ok) { reply = quoteText(state.lead, q); quoted = q; state.lead.stage = "proposed"; state.quote = { ...q, at: now() }; }
    else { out.escalate = true; out.escalation_note = (out.escalation_note ? out.escalation_note + " | " : "") + "Could not auto-quote: " + q.why; if (!reply) reply = "Got it, thank you. Donta will confirm your exact price today."; }
  }
  reply = reply.slice(0, 1500);
  if (reply) {
    const sent = await quoSend(env, from, reply);
    if (sent && sent.id) state.bot_msg_ids = [...(state.bot_msg_ids || []).slice(-30), sent.id];
    state.messages.push({ role: "assistant", content: reply });
  }
  state.messages = state.messages.slice(-HISTORY_TURNS);
  if (quoted) await quoSend(env, env.DONTA_CELL, `PURETEK QUOTE SENT — ${state.lead.name || from} · ${quoted.label} · ${quoted.sqft} sq ft (customer-stated) · $${quoted.price}${quoted.per}\n${[state.lead.address, state.lead.city].filter(Boolean).join(", ")}\nVerify sq ft. Thread: ${from}`);
  if (out.escalate && !state.opted_out) {
    const urgent = /complain|damage|refund|cancel|angry|upset|booking|book|price agreed|call me/i.test(out.escalation_note || "");
    if (urgent || now() - (state.escalated_at || 0) > ESCALATION_COOLDOWN_MIN * 60000) { await quoSend(env, env.DONTA_CELL, escalationText(from, state, out)); state.escalated_at = now(); }
  }
  await bump(env, quoted ? "quotes" : "replies");
  await save(env, from, state);
}


/* ---------- JOBBER (OAuth 2 + PKCE). Client ID = plain var JOBBER_CLIENT_ID; secret = Cloudflare secret JOBBER_CLIENT_SECRET (Donta enters it). Tokens live in KV jobber:tokens. ---------- */
const JOBBER_AUTH = "https://api.getjobber.com/api/oauth/authorize", JOBBER_TOKEN = "https://api.getjobber.com/api/oauth/token", JOBBER_GQL = "https://api.getjobber.com/api/graphql";
function b64url(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function jobberConnect(env, url) {
  if (!env.JOBBER_CLIENT_ID || !env.JOBBER_CLIENT_SECRET) return html("Jobber is not configured yet: the client secret still needs to be added in Cloudflare.", 500);
  const state = b64url(crypto.getRandomValues(new Uint8Array(16))), verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  await env.LEADS.put("jobber:pkce:" + state, verifier, { expirationTtl: 600 });
  const q = new URLSearchParams({ response_type: "code", client_id: env.JOBBER_CLIENT_ID, redirect_uri: url.origin + "/jobber/callback", state, code_challenge: challenge, code_challenge_method: "S256" });
  return Response.redirect(JOBBER_AUTH + "?" + q.toString(), 302);
}
async function jobberCallback(env, url) {
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  const verifier = state && await env.LEADS.get("jobber:pkce:" + state);
  if (!code || !verifier) return html("Jobber connection failed: missing or expired code. Start again from /jobber/connect.", 400);
  await env.LEADS.delete("jobber:pkce:" + state);
  const t = await jobberToken(env, { grant_type: "authorization_code", code, redirect_uri: url.origin + "/jobber/callback", code_verifier: verifier });
  if (!t.ok) return html("Jobber token exchange failed (" + t.status + "). " + t.body.slice(0, 200), 502);
  const st = await jobberStatusData(env);
  return html("<h2>Puretek Quo Agent is connected to Jobber.</h2><p>" + (st.account ? "Account: " + st.account : "") + "</p><p>You can close this tab.</p>");
}
async function jobberToken(env, params) {
  const body = new URLSearchParams({ client_id: env.JOBBER_CLIENT_ID, client_secret: env.JOBBER_CLIENT_SECRET, ...params });
  const r = await fetch(JOBBER_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const txt = await r.text(); if (!r.ok) return { ok: false, status: r.status, body: txt };
  const j = JSON.parse(txt); const prev = (await env.LEADS.get("jobber:tokens", "json")) || {};
  const tok = { access_token: j.access_token, refresh_token: j.refresh_token || prev.refresh_token, expires_at: Date.now() + ((j.expires_in || 3600) - 120) * 1000 };
  await env.LEADS.put("jobber:tokens", JSON.stringify(tok)); return { ok: true, tok };
}
async function jobberAccess(env) {
  const tok = await env.LEADS.get("jobber:tokens", "json"); if (!tok) throw new Error("Jobber not connected");
  if (tok.expires_at > Date.now()) return tok.access_token;
  const t = await jobberToken(env, { grant_type: "refresh_token", refresh_token: tok.refresh_token });
  if (!t.ok) throw new Error("Jobber refresh failed " + t.status + " " + t.body.slice(0, 120));
  return t.tok.access_token;
}
async function jobberGQL(env, query, variables) {
  const at = await jobberAccess(env);
  const r = await fetch(JOBBER_GQL, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + at, "X-JOBBER-GRAPHQL-VERSION": env.JOBBER_API_VERSION || "2025-04-16" }, body: JSON.stringify({ query, variables: variables || {} }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || j.errors) throw new Error("Jobber GQL " + r.status + " " + JSON.stringify(j.errors || j).slice(0, 300)); return j.data;
}
async function jobberStatusData(env) {
  try { const d = await jobberGQL(env, "query { account { id name } }"); return { connected: true, account: d.account && d.account.name }; }
  catch (e) { return { connected: false, error: String(e.message).slice(0, 300) }; }
}
async function jobberStatus(env) { return json(await jobberStatusData(env)); }
async function jobberSchema(env, url) {
  const name = (url.searchParams.get("type") || "").replace(/[^A-Za-z0-9_]/g, ""); if (!name) return json({ error: "type required" }, 400);
  try {
    const d = await jobberGQL(env, `query($n:String!){ __type(name:$n){ name kind inputFields{ name type{ kind name ofType{ kind name ofType{ kind name ofType{ kind name }}}}} fields{ name args{ name type{ kind name ofType{ kind name ofType{ kind name }}}} type{ kind name ofType{ kind name ofType{ kind name }}}} enumValues{ name } } }`, { n: name });
    return json(d.__type);
  } catch (e) { return json({ error: String(e.message) }, 502); }
}
function html(body, status = 200) { return new Response("<!doctype html><meta name=viewport content='width=device-width'><body style='font-family:system-ui;padding:24px'>" + body + "</body>", { status, headers: { "content-type": "text/html; charset=utf-8" } }); }

/* One-time, idempotent: register a Quo webhook for call.completed and keep its signing key in KV (never leaves Cloudflare). */
async function setupCalls(env, url) {
  if (await env.LEADS.get("cfg:call_webhook_id")) return json({ ok: true, already: true, id: await env.LEADS.get("cfg:call_webhook_id") });
  const r = await fetch("https://api.quo.com/webhooks", { method: "POST", headers: { "Authorization": env.QUO_API_KEY, "Content-Type": "application/json", "Quo-Api-Version": "2026-03-30" },
    body: JSON.stringify({ url: url.origin + "/quo", events: ["call.completed"], label: "Puretek missed-call text-back" }) });
  const t = await r.text(); if (!r.ok) return json({ ok: false, status: r.status, body: t.slice(0, 300) }, 502);
  let d = JSON.parse(t); d = d.data || d; if (!d.key) return json({ ok: false, why: "no key", fields: Object.keys(d) }, 502);
  await env.LEADS.put("cfg:call_webhook_secret", d.key); await env.LEADS.put("cfg:call_webhook_id", String(d.id));
  return json({ ok: true, id: d.id, events: d.events });
}

/* Missed call → text back once per hour per caller. */
async function missedCall(evt, env) {
  const d = evt.data || {}, res = d.resource || {}, cx = d.context || {};
  if (evt.type === "call.completed" && !((res.direction || "") === "incoming" && /^(unanswered|abandoned)$/.test(res.status || ""))) return;
  const caller = externalNumber(cx); if (!caller || caller === norm(env.DONTA_CELL)) return;
  const state = await loadState(env, caller, cx.conversationId);
  if (state.opted_out) return;
  if (now() - (state.missed_texted_at || 0) < MISSED_CALL_COOLDOWN_MIN * 60000) return;
  const vm = res.hasVoicemail ? " Got your voicemail too." : "";
  const msg = `Hi, this is Puretek Global Cleaning — sorry we missed your call!${vm} What can we help you with? Text us here and we'll get you taken care of.`;
  const sent = await quoSend(env, caller, msg);
  if (sent && sent.id) state.bot_msg_ids = [...(state.bot_msg_ids || []).slice(-30), sent.id];
  state.messages.push({ role: "user", content: "[system note: this person called and we missed the call" + (res.hasVoicemail ? "; they left a voicemail" : "") + "]" });
  state.messages.push({ role: "assistant", content: msg });
  state.missed_texted_at = now(); if (!state.lead.stage || state.lead.stage === "new") state.lead.stage = "missed_call";
  await bump(env, "missed_calls");
  await save(env, caller, state);
}
function externalNumber(cx) {
  const p = (cx && cx.participants) || {}; const ext = p.external || [];
  for (const e of [].concat(ext)) { const v = typeof e === "string" ? e : (e && (e.phoneNumber || e.identifier || e.number)); const n = norm(v); if (n && n.length >= 11) return n; }
  return "";
}

async function humanOverrideCheck(evt, env) {
  const d = evt.data || {}, res = d.resource || {}, cx = d.context || {};
  if ((res.direction || "") !== "outgoing") return;
  const to = norm((cx.recipientIdentifiers || [])[0]); if (!to || to === norm(env.DONTA_CELL)) return;
  const state = await env.LEADS.get("conv:" + to, "json"); if (!state) return;
  if ((state.bot_msg_ids || []).includes(res.id)) return;
  state.human_until = now() + HUMAN_OVERRIDE_HOURS * 3600000;
  if (res.text) state.messages.push({ role: "assistant", content: "[Donta] " + res.text });
  state.messages = state.messages.slice(-HISTORY_TURNS);
  await save(env, to, state);
}

async function askClaude(env, state) {
  const ct = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const dyn = `Now (Houston time): ${ct}. Company number: ${env.QUO_NUMBER}. Known lead facts so far: ${JSON.stringify(state.lead)}.` + (state.quote ? ` Price already quoted by the system: $${state.quote.price}${state.quote.per} for a ${state.quote.label} at ${state.quote.sqft} sq ft — repeat it exactly if asked; never change it.` : "");
  const msgs = state.messages.map(m => ({ role: m.role, content: m.content }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const merged = []; for (const m of msgs) { if (merged.length && merged[merged.length - 1].role === m.role) merged[merged.length - 1].content += "\n" + m.content; else merged.push({ ...m }); }
  const body = { model: MODEL, max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT.replace("{{QUO_NUMBER}}", env.QUO_NUMBER), cache_control: { type: "ephemeral" } }, { type: "text", text: dyn }],
    messages: merged, output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } }, fallbacks: "default" };
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("anthropic " + r.status + " " + (await r.text()).slice(0, 200));
  const msg = await r.json();
  if (msg.stop_reason === "refusal") return { reply: "Thanks for reaching out to Puretek Global Cleaning. Donta will text you back shortly.", needs_quote: false, escalate: true, escalation_note: "Model declined; needs a human reply.", opt_out: false, lead: state.lead };
  const tb = (msg.content || []).find(b => b.type === "text"); const txt = tb ? tb.text : "";
  try { return JSON.parse(txt); } catch { return { reply: txt.slice(0, 600), needs_quote: false, escalate: false, escalation_note: "", opt_out: false, lead: state.lead }; }
}

async function quoSend(env, to, content) {
  if (!to) return null;
  const r = await fetch("https://api.quo.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "Authorization": env.QUO_API_KEY }, body: JSON.stringify({ from: env.QUO_NUMBER, to: [to], content }) });
  const t = await r.text(); if (!r.ok) { await logError(env, "quo send " + r.status, new Error(t.slice(0, 200))); return null; }
  try { return (JSON.parse(t) || {}).data || null; } catch { return null; }
}
function escalationText(from, state, out) {
  const L = state.lead || {};
  const line = [L.stage || "lead", L.name || "", from, L.service || "", L.sqft ? L.sqft + " sq ft" : "", L.address ? L.address + (L.city ? ", " + L.city : "") : "", L.date_wanted ? "wants " + L.date_wanted : ""].filter(Boolean).join(" · ");
  return `PURETEK LEAD — ${line}\n${(out.escalation_note || "").slice(0, 220)}\nReply to them in Quo: ${from}`;
}

/* ---------- daily digest at 7 AM CT (cron) — doubles as a heartbeat: no text = something is wrong ---------- */
async function dailyDigest(env) {
  const day = ymd(now() - 86400000), c = (await env.LEADS.get("stats:" + day, "json")) || {};
  const errs = (await env.LEADS.get("errors:" + day, "json")) || [];
  const msg = `PURETEK TEXT AGENT — yesterday: ${c.replies || 0} replies, ${c.quotes || 0} quotes sent, ${c.missed_calls || 0} missed calls texted back, ${errs.length} errors.` + (errs.length ? `\nLast error: ${errs[errs.length - 1].where}: ${errs[errs.length - 1].msg}` : "");
  await quoSend(env, env.DONTA_CELL, msg);
}
async function bump(env, k) { const key = "stats:" + ymd(now()); const s = (await env.LEADS.get(key, "json")) || {}; s[k] = (s[k] || 0) + 1; await env.LEADS.put(key, JSON.stringify(s), { expirationTtl: 40 * 86400 }); }
async function logError(env, where, e) {
  console.error(where, e && (e.stack || e.message) || e);
  try { const key = "errors:" + ymd(now()); const a = (await env.LEADS.get(key, "json")) || []; a.push({ at: now(), where, msg: String(e && e.message || e).slice(0, 200) }); await env.LEADS.put(key, JSON.stringify(a.slice(-50)), { expirationTtl: 14 * 86400 }); } catch {}
}
function ymd(t) { return new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); }

async function loadState(env, phone, conversationId) {
  const s = (await env.LEADS.get("conv:" + phone, "json")) || { messages: [], lead: emptyLead(), bot_msg_ids: [], escalated_at: 0, human_until: 0, opted_out: false, first_seen: now(), conversationId: "" };
  s.conversationId = conversationId || s.conversationId; return s;
}
async function leadsReport(request, env, url) {
  if ((request.headers.get("authorization") || "") !== "Bearer " + env.ADMIN_TOKEN) return new Response("unauthorized", { status: 401 });
  const since = now() - Number(url.searchParams.get("days") || 3) * 86400000, out = []; let cursor;
  do { const page = await env.LEADS.list({ prefix: "lead:", cursor }); cursor = page.list_complete ? undefined : page.cursor;
    for (const k of page.keys) { const v = await env.LEADS.get(k.name, "json"); if (v && (v.updated || 0) >= since) out.push(v); } } while (cursor);
  out.sort((a, b) => (b.updated || 0) - (a.updated || 0)); return json({ count: out.length, leads: out });
}
async function save(env, phone, state) {
  await env.LEADS.put("conv:" + phone, JSON.stringify(state));
  const last = state.messages.slice(-6).map(m => (m.role === "user" ? "C: " : "P: ") + String(m.content).slice(0, 160));
  await env.LEADS.put("lead:" + phone, JSON.stringify({ phone, ...state.lead, quote: state.quote || null, opted_out: !!state.opted_out, human_handling: !!(state.human_until && state.human_until > now()), first_seen: state.first_seen, updated: now(), conversationId: state.conversationId, last_messages: last }));
}
async function verifyQuo(raw, headers, secret) {
  try {
    const id = headers.get("webhook-id"), ts = headers.get("webhook-timestamp"), sigs = headers.get("webhook-signature");
    if (!id || !ts || !sigs || !secret) return false;
    if (!(Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) <= 300)) return false;
    const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = await crypto.subtle.importKey("raw", Uint8Array.from(atob(keyB64), c => c.charCodeAt(0)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    return sigs.split(" ").map(s => s.trim()).filter(Boolean).map(s => s.split(",")).some(([v, sig]) => v === "v1" && sig && tse(sig, expected));
  } catch (e) { console.error("verify", e && e.message); return false; }
}
function tse(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function norm(p) { const d = String(p || "").replace(/[^0-9+]/g, ""); if (!d) return ""; if (d.startsWith("+")) return d; return d.length === 10 ? "+1" + d : d.length === 11 && d.startsWith("1") ? "+" + d : "+" + d; }
function emptyLead() { return { name: "", address: "", city: "", zip: "", sqft: "", service: "", frequency: "", date_wanted: "", stage: "new", summary: "" }; }
function now() { return Date.now(); }
function json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } }); }
