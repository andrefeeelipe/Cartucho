// Roda no deploy do Netlify. Guarda uma cópia da versão mais recente em site/release.json,
// usada pelo site quando o GitHub não responde (limite de consultas, rede lenta etc.).
// Se o GitHub falhar aqui também, o deploy continua: o site cai para a página de versões.
import { writeFile } from "node:fs/promises";

const url = "https://api.github.com/repos/andrefeeelipe/cartucho/releases/latest";
const headers = { Accept: "application/vnd.github+json", "User-Agent": "cartucho-site" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

try {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
  const r = await res.json();
  const slim = {
    tag_name: r.tag_name,
    name: r.name,
    published_at: r.published_at,
    html_url: r.html_url,
    assets: r.assets.map(({ name, size, browser_download_url }) => ({ name, size, browser_download_url })),
  };
  await writeFile(new URL("./release.json", import.meta.url), JSON.stringify(slim));
  console.log(`release.json: ${slim.tag_name} (${slim.assets.length} arquivos)`);
} catch (err) {
  console.warn(`Aviso: release.json não gerado (${err.message}). O site usa o GitHub direto.`);
}
