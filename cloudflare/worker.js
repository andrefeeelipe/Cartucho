// Cartucho — servidor de retransmissão (Cloudflare Worker).
// Entrega ao app senhas TEMPORÁRIAS do TURN da Cloudflare, para a sala online funcionar mesmo
// com todos os jogadores nos dados móveis. A chave fixa (TURN_KEY_API_TOKEN) fica só aqui,
// guardada como segredo no Worker; o app nunca a vê.
//
// Variáveis do Worker (Configurações > Variáveis e segredos):
//   TURN_KEY_ID         — "Turn Token ID" da chave criada em Realtime > TURN
//   TURN_KEY_API_TOKEN  — "API Token" da mesma chave (marque como Segredo)

export default {
  async fetch(request, env) {
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "X-Cartucho" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.headers.get("X-Cartucho") !== "1") return new Response("Cartucho", { status: 403, headers: cors });
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return new Response("TURN não configurado", { status: 500, headers: cors });

    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: 6 * 3600 }),
      },
    );
    if (!r.ok) return new Response("TURN indisponível", { status: 502, headers: cors });
    const data = await r.json();
    // A porta 53 costuma travar sem "trickle ICE"; fica de fora.
    const iceServers = (data.iceServers || []).map((s) => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53\b/.test(u)),
    }));
    return new Response(JSON.stringify({ iceServers }), {
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  },
};
