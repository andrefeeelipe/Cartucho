// Cartucho — monta os links de download a partir da versão mais recente publicada no GitHub.
// Ordem: GitHub (ao vivo) -> /release.json (gerado no deploy do Netlify) -> página de versões do GitHub.
(() => {
  const REPO = "andrefeeelipe/cartucho";
  const API = `https://api.github.com/repos/${REPO}/releases/latest`;
  const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
  const CACHE_KEY = "cartucho-release";
  const CACHE_MS = 10 * 60 * 1000;

  // Como cada arquivo aparece no site. A ordem aqui é a ordem da lista.
  const KINDS = [
    { re: /arm64-v8a\.apk$/i,          group: "android", name: "Android (arm64-v8a)", desc: "Quase todo celular atual.", tag: "Recomendado", main: true },
    { re: /universal\.apk$/i,          group: "android", name: "Android universal",   desc: "Funciona em qualquer aparelho. Maior." },
    { re: /armeabi-v7a\.apk$/i,        group: "android", name: "Android 32 bits",     desc: "Celulares bem antigos, sem os consoles mais pesados." },
    { re: /x86_64\.apk$/i,             group: "android", name: "Android x86_64",      desc: "Chromebooks e alguns TV box." },
    { re: /windows-instalador\.exe$/i, group: "windows", name: "Instalador para Windows", desc: "Windows 10 e 11, 64 bits.", tag: "Recomendado", main: true },
    { re: /windows-x64\.zip$/i,        group: "windows", name: "Windows sem instalar", desc: "Extraia a pasta e abra o Cartucho.exe." },
  ];

  const $ = (id) => document.getElementById(id);

  const fmtSize = (bytes) => {
    const mb = bytes / 1048576;
    return mb >= 1000 ? `${(mb / 1024).toFixed(1).replace(".", ",")} GB` : `${Math.round(mb)} MB`;
  };
  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const versionOf = (r) => (r.tag_name || r.name || "").replace(/^v/i, "");

  // Destaca o botão do aparelho de quem está visitando.
  function markMyDevice() {
    const ua = navigator.userAgent || "";
    const os = /Android/i.test(ua) ? "android" : /Windows/i.test(ua) ? "windows" : null;
    if (!os) return;
    const key = document.querySelector(`.key[data-os="${os}"]`);
    if (key) key.classList.add("is-mine");
    if (os === "windows") {
      // No computador, o botão do Windows vem primeiro.
      key.parentElement.insertBefore(key, key.parentElement.querySelector(".key"));
    }
  }

  async function loadRelease() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
    } catch (_) { /* sem armazenamento: segue */ }

    const sources = [API, "/release.json"];
    for (const url of sources) {
      try {
        const res = await fetch(url, { headers: url === API ? { Accept: "application/vnd.github+json" } : {} });
        if (!res.ok) continue;
        const data = await res.json();
        if (!data || !Array.isArray(data.assets) || !data.assets.length) continue;
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (_) {}
        return data;
      } catch (_) { /* tenta a próxima fonte */ }
    }
    return null;
  }

  function fileItem(kind, asset) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = kind.name;
    if (kind.tag) {
      const tag = document.createElement("span");
      tag.className = "file-tag";
      tag.textContent = kind.tag;
      name.append(tag);
    }
    const desc = document.createElement("span");
    desc.className = "file-desc";
    desc.textContent = kind.desc;
    const a = document.createElement("a");
    a.className = "file-btn";
    a.href = asset.browser_download_url;
    a.setAttribute("download", "");
    a.setAttribute("aria-label", `Baixar ${kind.name}, ${fmtSize(asset.size)}`);
    a.innerHTML = `Baixar <small>${fmtSize(asset.size)}</small>`;
    li.append(name, a, desc);
    return li;
  }

  function render(rel) {
    const version = versionOf(rel);
    const lists = { android: $("list-android"), windows: $("list-windows") };
    lists.android.textContent = "";
    lists.windows.textContent = "";

    for (const kind of KINDS) {
      const asset = rel.assets.find((a) => kind.re.test(a.name));
      if (!asset) continue;
      lists[kind.group].append(fileItem(kind, asset));
      if (kind.main) {
        const key = $(`dl-${kind.group}`);
        key.href = asset.browser_download_url;
        key.setAttribute("download", "");
        $(`dl-${kind.group}-sub`).textContent = fmtSize(asset.size);
      }
    }
    for (const g of Object.keys(lists)) {
      if (!lists[g].children.length) {
        lists[g].innerHTML = `<li class="file-empty">Ainda não há arquivo nesta versão. Veja as <a href="${RELEASES_PAGE}">versões no GitHub</a>.</li>`;
      }
    }

    $("cart-version").textContent = `versão ${version}`;
    $("release-meta").innerHTML = `Versão <b>${version}</b>, publicada em ${fmtDate(rel.published_at)}.`;
    $("files-intro").textContent =
      `Versão ${version}. Cada atualização do Cartucho aparece aqui sozinha, assim que fica pronta.`;

    const sums = rel.assets.filter((a) => /^SHA256SUMS/i.test(a.name));
    if (sums.length) {
      const checks = $("checks");
      checks.append("Conferir integridade (SHA-256): ");
      sums.forEach((a, i) => {
        const link = document.createElement("a");
        link.href = a.browser_download_url;
        link.textContent = /windows/i.test(a.name) ? "lista do Windows" : "lista do Android";
        if (i) checks.append(", ");
        checks.append(link);
      });
      checks.append(".");
    }
    $("led").classList.add("on");
  }

  function renderFallback() {
    $("release-meta").innerHTML =
      `Não deu para carregar a versão agora. Os arquivos estão na <a href="${RELEASES_PAGE}">página de versões do GitHub</a>.`;
    for (const g of ["android", "windows"]) {
      $(`list-${g}`).innerHTML =
        `<li class="file-empty">Abra a <a href="${RELEASES_PAGE}">página de versões</a> para baixar.</li>`;
    }
  }

  markMyDevice();
  loadRelease().then((rel) => (rel ? render(rel) : renderFallback()));
})();
