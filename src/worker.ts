import { addNode, addEdge, traverse, crossDomainQuery, findPath, domainStats, getDomainNodes } from './lib/knowledge-graph.ts';
import { loadSeedIntoKG, FLEET_REPOS, loadAllSeeds } from './lib/seed-loader.ts';
// src/worker.ts — HealthLog AI Worker
// Part of the Cocapn ecosystem at cocapn.ai
import { loadBYOKConfig, callLLM, saveBYOKConfig, generateSetupHTML, type BYOKConfig, type LLMMessage } from './lib/byok.ts';
import { softActualize, confidenceScore } from './lib/soft-actualize.ts';

export interface Env {
  HEALTHLOG_KV: KVNamespace;
  AGENT_NAME?: string;
  AGENT_TONE?: string;
  AGENT_AVATAR?: string;
}

const AGENT_NAME = 'HealthLog';
const DOMAIN = 'symptoms';
const ITEM = 'symptom';
const SYSTEM_PROMPT = 'You are HealthLog, a health tracking companion. Help users log symptoms, track health patterns, and stay organized with their wellness data. You are NOT a doctor — always recommend consulting healthcare professionals for medical advice. Be empathetic and evidence-based.';
const ACCENT = '#ef4444';

// ── Domain Data Layer ──

async function getItems(env: Env, userId: string): Promise<any[]> {
  const raw = await env.HEALTHLOG_KV.get(`${userId}:${DOMAIN}`, 'json');
  return Array.isArray(raw) ? raw : [];
}

async function saveItems(env: Env, userId: string, items: any[]): Promise<void> {
  await env.HEALTHLOG_KV.put(`${userId}:${DOMAIN}`, JSON.stringify(items));
}

async function getItem(env: Env, userId: string, id: string): Promise<any | null> {
  const items = await getItems(env, userId);
  return items.find((i: any) => i.id === id) || null;
}

async function createItem(env: Env, userId: string, data: any): Promise<any> {
  const items = await getItems(env, userId);
  const item = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
  items.push(item);
  await saveItems(env, userId, items);
  return item;
}

async function updateItem(env: Env, userId: string, id: string, data: any): Promise<any | null> {
  const items = await getItems(env, userId);
  const idx = items.findIndex((i: any) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
  await saveItems(env, userId, items);
  return items[idx];
}

async function deleteItem(env: Env, userId: string, id: string): Promise<boolean> {
  const items = await getItems(env, userId);
  const filtered = items.filter((i: any) => i.id !== id);
  if (filtered.length === items.length) return false;
  await saveItems(env, userId, filtered);
  return true;
}

// ── User Identity ──

async function getUserId(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  const fp = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const hash = Array.from(new Uint8Array(fp)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hash.slice(0, 16);
}

// ── HTML Generation ──

function generateLandingHTML(): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Healthlog — AI health & fitness companion</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:#0a0a0f;color:#e2e8f0;min-height:100vh}a{color:#4ade80;text-decoration:none}.hero{max-width:800px;margin:0 auto;padding:80px 24px 40px;text-align:center}.logo{font-size:64px;margin-bottom:16px}h1{font-size:clamp(2rem,5vw,3rem);font-weight:700;background:linear-gradient(135deg,#4ade80,#4ade8088);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}.tagline{font-size:1.15rem;color:#94a3b8;max-width:500px;margin:0 auto 48px;line-height:1.6}.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:700px;margin:0 auto;padding:0 24px 60px}.feat{background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;transition:border-color .2s}.feat:hover{border-color:#4ade8044}.feat-icon{color:#4ade80;font-size:1.2rem;margin-bottom:8px}.feat-text{font-size:.9rem;color:#cbd5e1}.chat-section{max-width:700px;margin:0 auto;padding:0 24px 80px}.chat-box{background:#111118;border:1px solid #1e1e2e;border-radius:16px;padding:24px}.chat-box h3{font-size:1.1rem;margin-bottom:12px;color:#4ade80}.chat-box p{font-size:.9rem;color:#94a3b8;line-height:1.6;margin-bottom:16px}.chat-input{display:flex;gap:8px}.chat-input input{flex:1;background:#0a0a0f;border:1px solid #1e1e2e;border-radius:8px;padding:10px 14px;color:#e2e8f0;font-size:.9rem;outline:none}.chat-input input:focus{border-color:#4ade80}.chat-input button{background:#4ade80;color:#0a0a0f;border:none;border-radius:8px;padding:10px 18px;font-weight:600;cursor:pointer;font-size:.9rem}.chat-input button:hover{opacity:.9}.fleet{text-align:center;padding:40px 24px;color:#475569;font-size:.8rem}.fleet a{color:#64748b;margin:0 8px}</style></head><body><div class="hero"><div class="logo">💪</div><h1>Healthlog</h1><p class="tagline">Track workouts, meals, sleep, and mood with AI-powered wellness insights.</p></div><div class="features"><div class="feat"><div class="feat-icon">✦</div><div class="feat-text">Workout tracking</div></div><div class="feat"><div class="feat-icon">✦</div><div class="feat-text">Meal logging</div></div><div class="feat"><div class="feat-icon">✦</div><div class="feat-text">Sleep analysis</div></div><div class="feat"><div class="feat-icon">✦</div><div class="feat-text">Mood tracking</div></div><div class="feat"><div class="feat-icon">✦</div><div class="feat-text">Health metrics</div></div><div class="feat"><div class="feat-icon">✦</div><div class="feat-text">AI wellness coach</div></div></div><div class="chat-section"><div class="chat-box"><h3>💪 Chat with Healthlog</h3><p>Powered by <a href="https://cocapn.ai">Cocapn</a> — bring your own API key or try with 5 free messages.</p><div class="chat-input"><input type="text" id="msg" placeholder="Ask anything..."><button onclick="send()">Send</button></div></div></div><div class="fleet"><a href="https://the-fleet.casey-digennaro.workers.dev">⚓ The Fleet</a> · <a href="https://cocapn.ai">Cocapn</a> · <a href="https://github.com/Lucineer/healthlog-ai">GitHub</a></div><script>async function send(){const m=document.getElementById("msg"),t=m.value.trim();if(!t)return;const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})});const d=await r.json();alert(d.response||d.error||"No response");m.value=""}document.getElementById("msg").addEventListener("keydown",e=>{if(e.key==="Enter")send()});</script></body></html>`;
  }

// ── Seed Data ──

function getSeedData(): any[] {
  return [
    { id: crypto.randomUUID(), name: 'Sample Symptom', notes: 'Created by seed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
}

// ── Routes ──

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    // ── Knowledge Graph (Phase 4B) ──
    if (path.startsWith('/api/kg')) {
      const _kj = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      if (path === '/api/kg' && method === 'GET') return _kj({ domain: url.searchParams.get('domain') || 'healthlog-ai', nodes: await getDomainNodes(env, url.searchParams.get('domain') || 'healthlog-ai') });
      if (path === '/api/kg/explore' && method === 'GET') {
        const nid = url.searchParams.get('node');
        if (!nid) return _kj({ error: 'node required' }, 400);
        return _kj(await traverse(env, nid, parseInt(url.searchParams.get('depth') || '2'), url.searchParams.get('domain') || undefined));
      }
      if (path === '/api/kg/cross' && method === 'GET') return _kj({ query: url.searchParams.get('query') || '', domain: url.searchParams.get('domain') || 'healthlog-ai', results: await crossDomainQuery(env, url.searchParams.get('query') || '', url.searchParams.get('domain') || 'healthlog-ai') });
      if (path === '/api/kg/domains' && method === 'GET') return _kj(await domainStats(env));
      if (path === '/api/kg/sync' && method === 'POST') return _kj(await loadAllSeeds(env, FLEET_REPOS));
      if (path === '/api/kg/seed' && method === 'POST') { const b = await request.json(); return _kj(await loadSeedIntoKG(env, b, b.domain || 'healthlog-ai')); }
    }

    if (path === '/health') {
      return Response.json({ status: 'ok', agent: AGENT_NAME, domain: DOMAIN, timestamp: new Date().toISOString() });
    }
    if (path === '/vessel.json') { try { const vj = await import('./vessel.json', { with: { type: 'json' } }); return new Response(JSON.stringify(vj.default || vj), { headers: { 'Content-Type': 'application/json' } }); } catch { return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); } }

    // Setup wizard
    if (path === '/api/efficiency' && request.method === 'GET') {
      try {
        return new Response(JSON.stringify({
        totalCached: 0, totalHits: 0, cacheHitRate: 0, tokensSaved: 0,
        repo: 'healthlog-ai', timestamp: Date.now()
        }), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
      } catch (e) {
        return new Response(JSON.stringify({ totalCached: 0, totalHits: 0, cacheHitRate: 0, tokensSaved: 0, repo: 'healthlog-ai', timestamp: Date.now(), error: 'efficiency tracking not initialized' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

  if (path === '/setup') {
      return new Response(generateSetupHTML(AGENT_NAME, ACCENT), { headers: { 'Content-Type': 'text/html' } });
    }

    // Landing page
    if (path === '/' || path === '') {
      return new Response(generateLandingHTML(), { headers: { 'Content-Type': 'text/html' } });
    }

    // API routes
    if (path.startsWith('/api/')) {
      // Chat endpoint
      if (path === '/api/chat' && request.method === 'POST') {
        const config = await loadBYOKConfig(request, env);
        if (!config) return Response.json({ error: 'No LLM configured. Visit /setup to configure.' }, { status: 401 });

        const body = await request.json() as { message: string; history?: any[] };
        const userId = await getUserId(request, env);
        const items = await getItems(env, userId);
        const contextSummary = items.length > 0
          ? `User has ${items.length}  entries. Latest: ${JSON.stringify(items.slice(-3))}`
          : 'No symptoms data yet.';

        const messages: LLMMessage[] = [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\nUser context: ${contextSummary}\nRespond in markdown when helpful. Be concise.` },
          ...(body.history || []).map((m: any) => ({ role: m.role, content: m.content })),
          { role: 'user', content: body.message },
        ];

        const llmResponse = await callLLM(config, messages);
        // Extract text from response
        const respData = await llmResponse.json();
        const reply = respData.choices?.[0]?.message?.content
          || respData.content?.[0]?.text
          || 'Unable to generate response.';

        return Response.json({ reply, confidence: confidenceScore(body.message, items.length > 0, true) });
      }

      // BYOK config save
      if (path === '/api/byok/config' && request.method === 'POST') {
        const config = await request.json() as BYOKConfig;
        await saveBYOKConfig(config, request, env);
        return Response.json({ ok: true });
      }

      // Seed endpoint
      if (path === '/api/seed' && request.method === 'POST') {
        const userId = await getUserId(request, env);
        const existing = await getItems(env, userId);
        if (existing.length > 0) {
          return Response.json({ message: 'Already seeded', count: existing.length });
        }
        const seed = getSeedData();
        await saveItems(env, userId, seed);
        return Response.json({ message: 'Seeded successfully', count: seed.length });
      }

      // Domain CRUD: GET /api/symptoms
      if (path === `/api/${DOMAIN}` && request.method === 'GET') {
        const userId = await getUserId(request, env);
        const items = await getItems(env, userId);
        return Response.json({ items, count: items.length });
      }

      // Domain CRUD: POST /api/symptoms
      if (path === `/api/${DOMAIN}` && request.method === 'POST') {
        const userId = await getUserId(request, env);
        const data = await request.json();
        const item = await createItem(env, userId, data);
        return Response.json({ item }, { status: 201 });
      }

      // Domain CRUD: GET /api/symptoms/:id
      const domainMatch = path.match(`^/api/${DOMAIN}/([^/]+)$`);
      if (domainMatch) {
        const id = domainMatch[1];
        const userId = await getUserId(request, env);

        if (request.method === 'GET') {
          const item = await getItem(env, userId, id);
          return item ? Response.json({ item }) : Response.json({ error: 'Not found' }, { status: 404 });
        }
        if (request.method === 'PATCH') {
          const data = await request.json();
          const item = await updateItem(env, userId, id, data);
          return item ? Response.json({ item }) : Response.json({ error: 'Not found' }, { status: 404 });
        }
        if (request.method === 'DELETE') {
          const deleted = await deleteItem(env, userId, id);
          return deleted ? Response.json({ ok: true }) : Response.json({ error: 'Not found' }, { status: 404 });
        }
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
