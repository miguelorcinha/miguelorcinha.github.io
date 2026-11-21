/* Renders the website from content/config.js and the .bib files in bib/.
   You should not need to edit this file to update content. */
(function () {
  "use strict";
  const SITE = window.SITE;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const BIB_FILES = {
    pubs: ["bib/bib.articles.bib", "bib/bib.proceedings.bib", "bib/bib.theses.bib", "bib/bib.software.bib"],
    talks: ["bib/bib.talks.bib", "bib/bib.seminars.bib"]
  };
  const ME = /Orcinha/;           // how my name appears in author lists
  const KEYWORD = "ORCINHA";      // only entries with this keyword are shown

  /* ------------------------------------------------------------------ */
  /* BibTeX parsing                                                       */
  /* ------------------------------------------------------------------ */
  function parseBib(text) {
    text = text.split("\n").filter((l) => !/^\s*%/.test(l)).join("\n");
    const out = [];
    let i = 0;
    while ((i = text.indexOf("@", i)) !== -1) {
      const m = /^@(\w+)\s*\{\s*([^,\s]+)\s*,/.exec(text.slice(i));
      if (!m) { i++; continue; }
      const entry = { type: m[1].toLowerCase(), key: m[2] };
      let p = i + m[0].length, depth = 1;
      // read fields until the entry's closing brace
      while (p < text.length && depth > 0) {
        const fm = /^\s*(\w+)\s*=\s*/.exec(text.slice(p));
        if (!fm) {
          if (text[p] === "}") { depth = 0; p++; break; }
          p++; continue;
        }
        p += fm[0].length;
        let val = "";
        if (text[p] === "{") {
          let d = 0, s = p;
          for (; p < text.length; p++) {
            if (text[p] === "{" && text[p - 1] !== "\\") d++;
            else if (text[p] === "}" && text[p - 1] !== "\\") { d--; if (d === 0) { p++; break; } }
          }
          val = text.slice(s + 1, p - 1);
        } else if (text[p] === '"') {
          const e = text.indexOf('"', p + 1); val = text.slice(p + 1, e); p = e + 1;
        } else {
          const vm = /^[^,}\s]+/.exec(text.slice(p)); val = vm ? vm[0] : ""; p += val.length;
        }
        const name = fm[1].toLowerCase();
        entry[name === "type" ? "type_field" : name] = val.replace(/\s+/g, " ").trim();
        const rest = /^\s*,?/.exec(text.slice(p)); p += rest[0].length;
      }
      out.push(entry);
      i = p;
    }
    return out;
  }

  const ACC = { '"': { a: "ä", o: "ö", u: "ü", e: "ë", i: "ï", A: "Ä", O: "Ö", U: "Ü" },
    "'": { a: "á", e: "é", i: "í", o: "ó", u: "ú", c: "ć", E: "É" },
    "`": { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
    "~": { a: "ã", o: "õ", n: "ñ", A: "Ã", O: "Õ" },
    "^": { a: "â", e: "ê", i: "î", o: "ô", u: "û" },
    c: { c: "ç", C: "Ç" } };
  const GREEK = { phi: "φ", Phi: "Φ", alpha: "α", beta: "β", gamma: "γ", mu: "μ", pi: "π", sim: "~", times: "×", pm: "±", bar: "" };
  function tex(s) {
    if (!s) return "";
    s = s.replace(/\\enquote\{([^}]*)\}/g, "“$1”")
      .replace(/\\textendash\b\s?|--/g, "–").replace(/\\textemdash\b\s?|---/g, "—")
      .replace(/\\&/g, "&").replace(/\\%/g, "%").replace(/\\_/g, "_")
      .replace(/\{?\\(["'`~^])\{?\\?(\w)\}?\}?/g, (m, a, l) => (ACC[a] && ACC[a][l]) || l)
      .replace(/\{?\\c\{?(\w)\}?\}?/g, (m, l) => ACC.c[l] || l)
      .replace(/\$([^$]*)\$/g, (m, x) => x.replace(/\^\{?\+\}?/g, "⁺").replace(/\^\{?-\}?/g, "⁻")
        .replace(/\\(\w+)/g, (q, w) => (w in GREEK ? GREEK[w] : w)).replace(/[{}^_]/g, ""))
      .replace(/\\(\w+)/g, "$1").replace(/[{}]/g, "");
    return s.trim();
  }
  function authors(a) {
    if (!a) return [];
    return a.split(/\s+and\s+/).map((p) => {
      p = tex(p);
      if (p === "others") return "et al.";
      if (p.includes(",")) {
        const [fam, giv] = p.split(",").map((x) => x.trim());
        const ini = giv.split(/\s+/).filter(Boolean).map((w) => w.split("-").map((x) => x[0] + ".").join("-")).join(" ");
        return (ini + " " + fam).trim();
      }
      return p;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Turning bib entries into publications and talks                      */
  /* ------------------------------------------------------------------ */
  const KIND = { article: "Journal", proceedings: "Proceedings", software: "Software & data", thesis: "Thesis" };
  const topicKeys = Object.keys(SITE.topics);
  const kwRegex = {};
  topicKeys.forEach((k) => {
    kwRegex[k] = (SITE.topics[k].keywords || []).map((w) => new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  });

  function topicsFor(p) {
    const t = [];
    topicKeys.forEach((k) => {
      const cfg = SITE.topics[k];
      if ((cfg.exclude || []).includes(p.key)) return;
      if ((cfg.include || []).includes(p.key) || kwRegex[k].some((r) => r.test(p.title)) || (k === "ams" && p.collab)) t.push(k);
    });
    return t;
  }

  function toPub(e) {
    const kind = e.type === "article" ? "article"
      : (e.type === "inproceedings" || e.type === "inbook") ? "proceedings"
      : e.type === "thesis" || e.type === "phdthesis" || e.type === "mastersthesis" ? "thesis"
      : (e.type === "software" || e.type === "dataset") ? "software" : null;
    if (!kind) return null;
    const au = authors(e.author);
    if (kind === "proceedings" && !au.some((a) => ME.test(a))) return null;   // only proceedings I co-authored
    const collab = !!e.collaboration;
    let venue = "";
    if (kind === "article") venue = `<i>${esc(tex(e.journaltitle || e.journal))}</i>${e.volume ? " " + esc(e.volume) : ""}${e.pages ? ", " + esc(tex(e.pages)) : ""}`;
    if (kind === "proceedings") venue = `<i>${esc(tex(e.booktitle))}</i>${e.series ? ", " + esc(tex(e.series)) : ""}${e.volume ? " " + esc(e.volume) : ""}${e.pages ? ", " + esc(tex(e.pages)) : ""}`;
    if (kind === "thesis") venue = `<i>${esc(thesisLabel(e))}</i>, ${esc(tex(e.institution || e.school))}`;
    if (kind === "software") venue = `<i>${esc(tex(e.type_field || ""))}</i>${e.publisher ? ", " + esc(tex(e.publisher)) : ""}${e.version ? ", version " + esc(e.version) : ""}`;
    const p = {
      key: e.key, kind, collab, authors: au,
      title: tex(e.title), date: e.date || e.year || "", year: (e.date || e.year || "").slice(0, 4),
      venue, doi: e.doi || "", arxiv: e.eprint && /arxiv/i.test(e.eprinttype || "arxiv") ? e.eprint : "",
      url: e.url || "", inpress: e.pubstate === "inpress"
    };
    p.topics = topicsFor(p);
    return p;
  }
  function thesisLabel(e) {
    const t = (e.thesistype || e.type_field || "").toLowerCase();
    if (/phd/.test(t)) return "PhD thesis";
    if (/ma|msc|master/.test(t)) return "MSc thesis";
    if (/bachelor/.test(t)) return "BSc thesis";
    return "Thesis";
  }

  function toTalk(e) {
    const au = authors(e.author);
    if (au.length && !ME.test(au[0])) return null;   // only talks I presented
    if (e.type_field === "collaboration") return null; // collaboration meetings are left out
    return {
      date: e.date || "", title: tex(e.title), type: e.type_field || "",
      event: tex(e.eventtitle || e.institution || e.organization || ""), place: tex(e.location || e.venue || ""),
      url: e.url || ""
    };
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                            */
  /* ------------------------------------------------------------------ */
  function authorLine(p, max = 10) {
    if (p.collab) return "<b>AMS Collaboration</b>";
    let a = p.authors.filter((x) => x !== "et al."), cut = p.authors.includes("et al.");
    if (a.length > max) { const i = a.findIndex((x) => ME.test(x)); a = a.slice(0, Math.max(max - 1, i + 1)); cut = true; }
    return a.map((x) => (ME.test(x) ? "<b>" + esc(x) + "</b>" : esc(x))).join(", ") + (cut ? ", et al." : "");
  }
  const mainLink = (p) => (p.doi ? "https://doi.org/" + p.doi : p.arxiv ? "https://arxiv.org/abs/" + p.arxiv : p.url || "");
  function linkButtons(p) {
    let h = "";
    if (p.doi) h += `<a href="https://doi.org/${esc(p.doi)}">DOI</a>`;
    if (p.arxiv) h += `<a href="https://arxiv.org/abs/${esc(p.arxiv)}">arXiv</a>`;
    if (p.url && /\.pdf$/i.test(p.url)) h += `<a href="${esc(p.url)}">PDF</a>`;
    else if (p.url && !p.doi) h += `<a href="${esc(p.url)}">Link</a>`;
    return h ? `<span class="lk">${h}</span>` : "";
  }

  let PUBS = [], TALKS = [];
  const state = { kind: "all", topic: "all", collab: false, tab: topicKeys[0], talkType: "all" };

  const PAGE = document.body.dataset.page || "home";
  function renderChrome() {
    const nav = [["research", "Research", "index.html#research"], ["publications", "Publications", "publications.html"], ["talks", "Talks", "talks.html"], ["cv", "CV", SITE.cv || "#"]];
    const bar = $("site-bar");
    if (bar) bar.innerHTML = `<a class="brand" href="index.html"><img src="images/logo/mark_midnight_tight.svg" alt="" width="52" height="42"><span class="brand-text"><span class="brand-name">${esc(SITE.name)}</span><span class="brand-label">${esc(SITE.brandLabel || "")}</span></span></a>
      <nav aria-label="Pages">${nav.map(([k, l, h]) => `<a href="${esc(h)}"${k === PAGE ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
    const foot = $("site-footer");
    if (foot) foot.innerHTML = `<div class="inner foot"><div id="links" class="links"></div><div class="muted">Perugia, Italy · <span id="updated"></span></div></div>`;
  }

  function fill() {
    document.querySelectorAll("[data-site]").forEach((el) => { el.textContent = SITE[el.dataset.site] || ""; });
    document.querySelectorAll("[data-site-href]").forEach((el) => { el.href = SITE[el.dataset.siteHref] || "#"; });
    if ($("lead")) $("lead").innerHTML = esc(SITE.lead).replace(/\*([^*]+)\*/g, "<em>$1</em>");
    if ($("affiliations")) $("affiliations").innerHTML = SITE.affiliations.map((a) => `<span>${esc(a)}</span>`).join("");
    const links = SITE.links.filter((l) => l.url).map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`);
    if (SITE.email) links.unshift(`<span>${esc(SITE.email)}</span>`);
    $("links").innerHTML = links.join("");
    const d = new Date(document.lastModified);
    $("updated").textContent = isNaN(d) ? "" : "Updated " + d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  function renderTabs() {
    $("tabs").innerHTML = topicKeys.map((k) =>
      `<button role="tab" id="tab-${k}" data-k="${k}" aria-selected="${state.tab === k}" aria-controls="panel">${esc(SITE.topics[k].tab)}</button>`).join("");
    const t = SITE.topics[state.tab];
    const all = PUBS.filter((p) => p.topics.includes(state.tab));
    const list = all.filter((p) => !p.collab).concat(all.filter((p) => p.collab)).slice(0, SITE.papersPerTopic || 4);
    const fig = t.figure ? `<img src="${esc(t.figure)}" alt="${esc(t.caption || t.title)}">` : sketch(state.tab);
    $("panel").innerHTML = `<div class="panel" role="tabpanel" aria-labelledby="tab-${state.tab}">
      <div><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>
        <ul class="mini">${list.map((p) => `<li><a href="${esc(mainLink(p))}">${esc(p.title)}</a><br><span>${p.collab ? "AMS Collaboration" : esc(p.authors[0]) + (p.authors.length > 1 ? " et al." : "")}, ${p.year}</span></li>`).join("")}</ul>
        ${all.length > list.length ? `<a class="seeall" href="publications.html#${state.tab}">See all ${all.length} in Publications →</a>` : ""}
      </div>
      <figure style="margin:0"><div class="fig">${fig}</div><figcaption class="cap">${esc(t.caption || "")}</figcaption></figure></div>`;
  }

  function chips(el, list, key) {
    el.innerHTML = list.map(([v, l]) => `<button class="chip" data-key="${key}" data-v="${v}" aria-pressed="${state[key] === v}">${esc(l)}</button>`).join("")
      + (key === "topic" ? `<button class="chip" data-key="collab" aria-pressed="${state.collab}">Include AMS Collaboration papers</button>` : "");
  }

  function pubItem(p) {
    const tg = p.topics.filter((t) => !(t === "ams" && p.collab))[0];
    const title = mainLink(p) ? `<a class="t" href="${esc(mainLink(p))}">${esc(p.title)}</a>` : `<span class="t">${esc(p.title)}</span>`;
    return `<li>${title}${tg ? `<span class="tag" style="color:var(--t-${tg});border-color:var(--t-${tg})">${esc(SITE.topics[tg].tab)}</span>` : ""}${p.inpress ? '<span class="press">in press</span>' : ""}<br>
      <span class="au">${authorLine(p)}</span><br><span class="ve">${p.venue}</span>${linkButtons(p)}</li>`;
  }

  function renderRecent() {
    const n = SITE.recentShown || 3;
    const list = PUBS.filter((p) => !p.collab && p.kind !== "software").slice(0, n);
    $("recent").innerHTML = list.map((p) => `<div class="yrow"><div class="y">${p.year}</div><ul>${pubItem(p)}</ul></div>`).join("");
  }

  function renderPubs() {
    const kinds = [["all", "All"]].concat(Object.keys(KIND).filter((k) => PUBS.some((p) => p.kind === k)).map((k) => [k, KIND[k]]));
    chips($("f-kind"), kinds, "kind");
    chips($("f-topic"), [["all", "All topics"]].concat(topicKeys.map((k) => [k, SITE.topics[k].tab])), "topic");
    const ps = PUBS.filter((p) => (state.collab || !p.collab) && (state.kind === "all" || p.kind === state.kind) && (state.topic === "all" || p.topics.includes(state.topic)));
    const hidden = PUBS.filter((p) => p.collab && !state.collab && (state.kind === "all" || p.kind === state.kind) && (state.topic === "all" || p.topics.includes(state.topic))).length;
    $("count").textContent = `${ps.length} ${ps.length === 1 ? "entry" : "entries"}` + (hidden ? ` · ${hidden} AMS Collaboration papers hidden` : "");
    const by = {};
    ps.forEach((p) => (by[p.year] = by[p.year] || []).push(p));
    $("publist").innerHTML = Object.keys(by).sort().reverse().map((y) => `<div class="yrow"><div class="y">${y}</div><ul>${by[y].map(pubItem).join("")}</ul></div>`).join("");
  }

  const TALK_TYPES = { contributed: "Contributed talks", invited: "Invited seminars", poster: "Posters" };
  const TALK_ONE = { contributed: "Contributed talk", invited: "Invited seminar", poster: "Poster", collaboration: "Collaboration meeting" };
  function renderTalks() {
    const types = [["all", "All"]].concat(Object.keys(TALK_TYPES).filter((k) => TALKS.some((t) => t.type === k)).map((k) => [k, TALK_TYPES[k]]));
    $("f-talk").innerHTML = types.map(([v, l]) => `<button class="chip" data-key="talkType" data-v="${v}" aria-pressed="${state.talkType === v}">${esc(l)}</button>`).join("");
    const list = TALKS.filter((t) => state.talkType === "all" || t.type === state.talkType);
    $("count").textContent = `${list.length} ${list.length === 1 ? "entry" : "entries"}`;
    const by = {};
    list.forEach((t) => (by[t.date.slice(0, 4)] = by[t.date.slice(0, 4)] || []).push(t));
    $("talklist").innerHTML = Object.keys(by).sort().reverse().map((y) => `<div class="yrow"><div class="y">${y}</div><ul>${by[y].map((t) => `<li>
      <span class="t">${esc(t.title)}</span><span class="tag tt-${esc(t.type)}">${esc(TALK_ONE[t.type] || t.type)}</span><br>
      <span class="ve"><i>${esc(t.event)}</i>${t.place ? ", " + esc(t.place) : ""} · ${esc(fmtDate(t.date))}</span></li>`).join("")}</ul></div>`).join("");
  }
  function fmtDate(d) {
    const x = new Date(d.slice(0, 10) + (d.length <= 7 ? "-01" : ""));
    return isNaN(x) ? d : x.toLocaleDateString("en-GB", d.length > 7 ? { day: "numeric", month: "short", year: "numeric" } : { month: "short", year: "numeric" });
  }

  document.addEventListener("click", (e) => {
    const tab = e.target.closest("#tabs button");
    if (tab) { state.tab = tab.dataset.k; renderTabs(); return; }
    const chip = e.target.closest(".chip");
    if (chip) {
      if (chip.dataset.key === "collab") state.collab = !state.collab; else state[chip.dataset.key] = chip.dataset.v;
      if (chip.dataset.key === "talkType") renderTalks(); else renderPubs();
      return;
    }
  });
  if ($("tabs")) $("tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = topicKeys.indexOf(state.tab), n = topicKeys.length;
    state.tab = topicKeys[(i + (e.key === "ArrowRight" ? 1 : n - 1)) % n]; renderTabs(); $("tab-" + state.tab).focus();
  });

  /* ------------------------------------------------------------------ */
  /* Built-in research sketches (used when a topic has no figure)         */
  /* ------------------------------------------------------------------ */
  function sketch(kind) {
    const w = 240, h = 150, m = 14;
    const P = (f, x0, x1, n = 80) => { let d = ""; for (let i = 0; i <= n; i++) { const [X, Y] = f(x0 + (x1 - x0) * i / n); d += (i ? "L" : "M") + X.toFixed(1) + " " + Y.toFixed(1); } return d; };
    const axis = `<path d="M${m} ${m}V${h - m}H${w - m}" fill="none" stroke="currentColor" stroke-opacity=".4"/>`;
    const lbl = (x, y, s, a = "start") => `<text x="${x}" y="${y}" font-size="9" text-anchor="${a}" fill="currentColor">${s}</text>`;
    if (kind === "modulation") {
      const lx = (lg) => m + (w - 2 * m) * (lg + 0.3) / 2.3, ly = (lj) => m + (h - 2 * m) * (1 - (lj + 5.5) / 6.2);
      const c = (phi) => P((lg) => { const R = Math.pow(10, lg); return [lx(lg), ly(Math.log10(Math.pow(R, -2.7) * R * R / ((R + phi) * (R + phi))))]; }, -0.3, 2);
      return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Sketch of proton spectra at three levels of solar activity">${axis}
        ${[[0.2, .4], [0.6, .7], [1.4, 1]].map(([f, o]) => `<path d="${c(f)}" fill="none" stroke="var(--t-modulation)" stroke-width="2" stroke-opacity="${o}"/>`).join("")}
        ${lbl(w - m, h - 2, "rigidity →", "end")}${lbl(m + 6, m + 8, "flux (solar min → max)")}</svg>`;
    }
    if (kind === "variability") {
      const X = (t) => m + (w - 2 * m) * t / 22, ss = (t) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t / 11), lag = 1.2;
      return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Sketch of solar activity and the delayed cosmic-ray flux">${axis}
        <path d="${P((t) => [X(t), h / 2 - 4 - (h / 2 - m - 8) * ss(t)], 0, 22)}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="${P((t) => [X(t), h - m - 4 - (h / 2 - m - 8) * (1 - ss(t - lag))], 0, 22)}" fill="none" stroke="var(--t-variability)" stroke-width="2"/>
        ${lbl(m + 4, m - 3, "sunspots (dashed) · GCR flux, lagged")}${lbl(w - m, h - 2, "time (yr) →", "end")}</svg>`;
    }
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const X = (t) => m + (w - 2 * m) * t / 400; let d = "";
    for (let i = 0; i <= 400; i += 2) {
      const base = h * 0.42 + 18 * Math.sin(i / 64) + (rnd() - 0.5) * 8;
      const sep = [[120, 26], [290, 40]].reduce((a, [c, A]) => a - (i >= c && i < c + 16 ? A * Math.exp(-(i - c) / 5) : 0), 0);
      d += (i ? "L" : "M") + X(i).toFixed(1) + " " + (base + sep).toFixed(1);
    }
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Sketch of a daily proton flux with two SEP events">${axis}
      <path d="${d}" fill="none" stroke="var(--t-ams)" stroke-width="1.6"/>${lbl(X(126), h * 0.2, "SEP")}${lbl(X(296), h * 0.12, "SEP")}${lbl(w - m, h - 2, "days →", "end")}</svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* Hero animation: Parker spiral and incoming cosmic rays               */
  /* ------------------------------------------------------------------ */
  function sky() {
    const cv = $("sky"), ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, parts = [], raf = 0; const t0 = performance.now();
    function size() {
      const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      parts = Array.from({ length: 70 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * Math.max(W, H), v: 0.15 + Math.random() * 0.5, l: 20 + Math.random() * 60 }));
    }
    function draw(now) {
      const cx = W * 0.92, cy = Math.max(120, H * 0.18), rot = (now - t0) / 60000, R = Math.max(W, H);
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6);
      g.addColorStop(0, "rgba(244,167,59,.35)"); g.addColorStop(0.25, "rgba(244,167,59,.08)"); g.addColorStop(1, "rgba(11,16,32,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.lineWidth = 1;
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        for (let s = 0; s <= 1; s += 0.01) { const r = s * R * 1.3, th = k * Math.PI / 4 + rot + r / 260; const x = cx - Math.cos(th) * r, y = cy + Math.sin(th) * r; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = "rgba(151,160,189,.13)"; ctx.stroke();
      }
      parts.forEach((p) => {
        if (!reduce) { p.r -= p.v; if (p.r < 20) p.r = R; }
        const x = cx - Math.cos(p.a) * p.r, y = cy + Math.sin(p.a) * p.r, x2 = cx - Math.cos(p.a) * (p.r + p.l), y2 = cy + Math.sin(p.a) * (p.r + p.l);
        const lg = ctx.createLinearGradient(x, y, x2, y2); lg.addColorStop(0, "rgba(111,182,255,.7)"); lg.addColorStop(1, "rgba(111,182,255,0)");
        ctx.strokeStyle = lg; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.fillStyle = "#ffcf7a"; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill();
    }
    function loop(n) { draw(n); if (!reduce) raf = requestAnimationFrame(loop); }
    size(); loop(performance.now());
    addEventListener("resize", () => { cancelAnimationFrame(raf); size(); loop(performance.now()); });
    document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) loop(performance.now()); });
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                                */
  /* ------------------------------------------------------------------ */
  function load(files) {
    return Promise.all(files.map((f) => fetch(f).then((r) => { if (!r.ok) throw new Error(f); return r.text(); })))
      .then((texts) => texts.flatMap((t) => parseBib(t)));
  }

  // Space out the small label under the name so both lines have the same width.
  function fitLabel() {
    const name = document.querySelector(".brand-name"), label = document.querySelector(".brand-label");
    if (!name || !label || !label.textContent) return;
    label.style.letterSpacing = "0px"; label.style.marginRight = "0px";
    const c = label.textContent.length;
    const track = Math.max(0, (name.getBoundingClientRect().width - label.getBoundingClientRect().width) / Math.max(1, c - 1));
    label.style.letterSpacing = track + "px"; label.style.marginRight = -track + "px";
  }

  // A link like publications.html#variability opens the list filtered to that topic.
  function topicFromHash() {
    const h = location.hash.slice(1);
    if (topicKeys.includes(h)) { state.topic = h; state.kind = "all"; if (h === "ams") state.collab = true; }
  }

  renderChrome();
  fill();
  fitLabel();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLabel);
  sky();
  if ($("tabs")) renderTabs();

  const needPubs = $("tabs") || $("publist") || $("recent"), needTalks = $("talklist");
  Promise.all([needPubs ? load(BIB_FILES.pubs) : [], needTalks ? load(BIB_FILES.talks) : []]).then(([pubs, talks]) => {
    const mine = (e) => (e.keywords || "").split(/[,;]\s*/).map((s) => s.trim()).includes(KEYWORD);
    PUBS = pubs.filter(mine).map(toPub).filter(Boolean).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    TALKS = talks.filter(mine).map(toTalk).filter(Boolean).sort((a, b) => (b.date > a.date ? 1 : -1));
    if ($("tabs")) renderTabs();
    if ($("recent")) renderRecent();
    if ($("publist")) { topicFromHash(); renderPubs(); addEventListener("hashchange", () => { topicFromHash(); renderPubs(); }); }
    if ($("talklist")) renderTalks();
  }).catch((err) => {
    const msg = "Could not load the .bib files. If you opened this page straight from your computer, start a local server instead (see README.md).";
    ["count", "recent"].forEach((id) => { if ($(id)) $(id).textContent = msg; });
    console.error(err);
  });
})();
