import "./style.css";

const destinations = {
  parco: {
    name: "渋谷PARCO",
    sub: "公園通りを上るルート",
    minutes: 7,
    distance: "550m",
    color: "#ff6b45",
    steps: [
      ["Hachiko exit", "ハチ公口を背にして、スクランブル交差点へ", "正面の大きな交差点を、TSUTAYA側へ渡ります。", "crossing", "地上"],
      ["Scramble crossing", "交差点を渡ったら、左方向へ", "西武A館を右手に見ながら、井の頭通りへ進みます。", "city", "地上"],
      ["Inokashira street", "MODIの角で右に曲がります", "ここから坂道です。公園通りをまっすぐ上ります。", "turn", "上り坂"],
      ["Koen-dori slope", "坂を上り、左手の建物を確認", "オレンジ色のPARCOロゴが見えたら、左側の入口へ。", "slope", "上り坂"],
      ["Shibuya PARCO", "到着しました", "渋谷PARCO 1階の正面入口です。", "arrival", "1F"]
    ]
  },
  scramble: {
    name: "渋谷スクランブルスクエア",
    sub: "歩道橋を使わないルート",
    minutes: 6,
    distance: "430m",
    color: "#477bff",
    steps: [
      ["Hachiko exit", "ハチ公口を背にして、左へ", "JR線の高架に沿って進みます。", "crossing", "地上"],
      ["Under the tracks", "高架下の横断歩道を渡ります", "宮益坂口方面の表示を目印にしてください。", "city", "地上"],
      ["East passage", "右手の通路へ進みます", "エスカレーターには乗らず、地上の通路を直進します。", "turn", "地上"],
      ["Scramble Square", "入口に到着しました", "渋谷スクランブルスクエアの地上入口です。", "arrival", "1F"]
    ]
  },
  miyashita: {
    name: "MIYASHITA PARK",
    sub: "坂を避けた地上ルート",
    minutes: 8,
    distance: "650m",
    color: "#008f72",
    steps: [
      ["Hachiko exit", "ハチ公口からスクランブル交差点へ", "交差点をTSUTAYA側へ渡ります。", "crossing", "地上"],
      ["Center-gai entrance", "交差点を渡ったら右へ", "線路と並行に、宮益坂方面へ歩きます。", "city", "地上"],
      ["Jingu-dori", "大きな通りを左へ", "明治通りに沿って直進してください。", "turn", "地上"],
      ["Miyashita entrance", "右手の入口から入ります", "緑色の案内板が目印です。", "arrival", "1F"]
    ]
  }
};

const state = {
  destination: "parco",
  step: 0,
  timer: null,
  playing: false,
  location: null,
  scanStream: null
};

const sceneArt = {
  crossing: ["#394d8b", "#f79d65", "SCRAMBLE", "↗"],
  city: ["#255561", "#f6c75b", "CITY WALK", "↑"],
  turn: ["#753d4d", "#ffbc62", "TURN RIGHT", "↱"],
  slope: ["#42583f", "#ffc85c", "SLOPE", "↗"],
  arrival: ["#bd5036", "#ffe0a0", "ARRIVAL", "●"]
};

function sceneSvg(kind, index) {
  const [sky, accent, label, arrow] = sceneArt[kind];
  const buildings = Array.from({ length: 8 }, (_, i) => {
    const x = i * 95 - 20;
    const h = 105 + ((i * 47 + index * 29) % 135);
    return `<rect x="${x}" y="${320 - h}" width="72" height="${h}" rx="3" fill="${i % 2 ? "#26313d" : "#344350"}"/>
      <g fill="#f9d678" opacity=".72">${Array.from({ length: 3 }, (_, w) => `<rect x="${x + 12 + w * 18}" y="${338 - h}" width="7" height="10"/>`).join("")}</g>`;
  }).join("");
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480">
      <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="#edb078"/></linearGradient></defs>
      <rect width="720" height="480" fill="url(#sky)"/>
      <circle cx="595" cy="90" r="38" fill="${accent}" opacity=".85"/>
      ${buildings}
      <path d="M0 480 250 310h210l260 170" fill="#62676d"/>
      <path d="m349 460 10-120 12 120" fill="#fff4cb" opacity=".9"/>
      <path d="m250 480 74-170h72l75 170" fill="#777d80" opacity=".85"/>
      <text x="28" y="58" fill="#fff" font-family="Arial" font-size="24" font-weight="700">${label}</text>
      <circle cx="360" cy="252" r="56" fill="${accent}" opacity=".95"/>
      <text x="360" y="277" text-anchor="middle" fill="#fff" font-size="68" font-family="Arial">${arrow}</text>
    </svg>`)} `;
}

function route() { return destinations[state.destination]; }

function render() {
  const selected = route();
  document.querySelector("#app").innerHTML = `
    <header class="topbar"><a class="brand" href="#"><span class="brand-mark">S</span><span>SHIBUYA <b>PATH</b></span></a><button class="language" aria-label="Language">JP <span>⌄</span></button></header>
    <main><section class="hero"><p class="eyebrow">VISUAL WALKING GUIDE</p><h1>景色を見ながら、<br><em>迷わず</em>歩こう。</h1><p class="hero-copy">坂道も、歩道橋も、複雑な出口も。<br>いま見えている景色から目的地まで案内します。</p></section>
      <section class="route-card card"><div class="card-label"><span class="pulse"></span> STARTING POINT</div><button class="location-row" id="get-location"><span class="location-icon">⌖</span><span><b>${state.location ? "現在地を取得しました" : "現在地を使う"}</b><small>${state.location ? `${state.location.lat.toFixed(4)}, ${state.location.lng.toFixed(4)}` : "GPSで位置情報を取得"}</small></span><span class="chevron">›</span></button><div class="or"><span></span> OR <span></span></div><button class="scan-button" id="open-scan"><span>◎</span> 周囲を見回して現在地を確認</button><div class="divider"></div><label class="card-label" for="destination">DESTINATION</label><div class="select-wrap"><span class="pin">●</span><select id="destination">${Object.entries(destinations).map(([key, item]) => `<option value="${key}" ${key === state.destination ? "selected" : ""}>${item.name}</option>`).join("")}</select></div><button class="start-button" id="start-guide">景色で案内を見る <span>→</span></button></section>
      <section class="mini-route"><div><span>ROUTE PREVIEW</span><b>${selected.name}</b><small>${selected.sub}</small></div><div class="route-stats"><b>${selected.minutes}<small>分</small></b><i></i><b>${selected.distance}</b></div></section>
      <section class="route-map"><svg viewBox="0 0 500 172" aria-label="ルートの概要"><path d="M26 132 C110 135 105 52 192 62 S285 153 361 111 S410 56 474 42" fill="none" stroke="#e2ded4" stroke-width="15" stroke-linecap="round"/><path d="M26 132 C110 135 105 52 192 62 S285 153 361 111 S410 56 474 42" fill="none" stroke="${selected.color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14"/><circle cx="26" cy="132" r="12" fill="#fff" stroke="#222" stroke-width="5"/><circle cx="474" cy="42" r="16" fill="${selected.color}"/><circle cx="474" cy="42" r="6" fill="#fff"/></svg></section>
      <section class="how"><p class="eyebrow">HOW IT WORKS</p><h2>地図ではなく、<br>景色でわかる。</h2><div class="how-grid"><div><b>01</b><span>現在地を<br>確認する</span></div><div><b>02</b><span>行き先を<br>選ぶ</span></div><div><b>03</b><span>景色に沿って<br>歩く</span></div></div></section></main>
    <footer>PROTOTYPE FOR SHIBUYA · MAP IMAGERY READY</footer><div class="modal" id="guide-modal" aria-hidden="true"></div><div class="modal" id="scan-modal" aria-hidden="true"></div><div class="toast" id="toast"></div>`;
  bind();
}

function bind() {
  document.querySelector("#destination").addEventListener("change", (event) => { state.destination = event.target.value; state.step = 0; render(); });
  document.querySelector("#get-location").addEventListener("click", locate);
  document.querySelector("#open-scan").addEventListener("click", openScan);
  document.querySelector("#start-guide").addEventListener("click", () => { state.step = 0; openGuide(); });
}

function locate() {
  if (!navigator.geolocation) return toast("この端末では位置情報を利用できません");
  toast("現在地を確認しています…");
  navigator.geolocation.getCurrentPosition(({ coords }) => { state.location = { lat: coords.latitude, lng: coords.longitude }; render(); toast("現在地を取得しました"); }, () => toast("位置情報を取得できませんでした。端末の設定を確認してください"), { enableHighAccuracy: true, timeout: 8000 });
}

function openGuide() { const modal = document.querySelector("#guide-modal"); modal.setAttribute("aria-hidden", "false"); modal.innerHTML = guideMarkup(); bindGuide(); }
function guideMarkup() { const selected = route(); const [en, title, detail, kind, level] = selected.steps[state.step]; const progress = ((state.step + 1) / selected.steps.length) * 100; return `<div class="guide-sheet"><div class="guide-top"><button class="circle-button" id="close-guide">×</button><div><small>${selected.name.toUpperCase()}</small><b>${state.step + 1} / ${selected.steps.length}</b></div><button class="circle-button" id="toggle-play">${state.playing ? "Ⅱ" : "▶"}</button></div><div class="progress"><i style="width:${progress}%"></i></div><div class="scene"><img src="${sceneSvg(kind, state.step)}" alt="${title}"><span class="scene-label">DEMO VISUAL</span><span class="level">${level}</span></div><div class="instruction"><small>STEP ${String(state.step + 1).padStart(2, "0")} · ${en}</small><h2>${title}</h2><p>${detail}</p></div><div class="guide-controls"><button id="prev-step" ${state.step === 0 ? "disabled" : ""}>←</button><button class="next" id="next-step">${state.step === selected.steps.length - 1 ? "案内を終了" : "次の景色へ"} <span>→</span></button></div></div>`; }
function bindGuide() { document.querySelector("#close-guide").addEventListener("click", closeGuide); document.querySelector("#toggle-play").addEventListener("click", togglePlay); document.querySelector("#prev-step").addEventListener("click", () => moveStep(-1)); document.querySelector("#next-step").addEventListener("click", () => { if (state.step === route().steps.length - 1) closeGuide(); else moveStep(1); }); }
function moveStep(offset) { state.step = Math.max(0, Math.min(route().steps.length - 1, state.step + offset)); openGuide(); }
function togglePlay() { state.playing = !state.playing; clearInterval(state.timer); if (state.playing) state.timer = setInterval(() => { if (state.step === route().steps.length - 1) { state.playing = false; clearInterval(state.timer); openGuide(); } else moveStep(1); }, 3500); openGuide(); }
function closeGuide() { state.playing = false; clearInterval(state.timer); document.querySelector("#guide-modal").setAttribute("aria-hidden", "true"); document.querySelector("#guide-modal").innerHTML = ""; }

async function openScan() { const modal = document.querySelector("#scan-modal"); modal.setAttribute("aria-hidden", "false"); modal.innerHTML = `<div class="scan-sheet"><video id="camera" autoplay playsinline muted></video><div class="scan-overlay"><div class="scan-ring"><i></i></div></div><div class="scan-copy"><small>LOCATION SCAN</small><h2>ゆっくり一周してください</h2><p>周囲の景色から現在地の候補を確認します</p></div><button class="circle-button scan-close" id="close-scan">×</button><button class="scan-start" id="scan-start">スキャンを開始</button></div>`; document.querySelector("#close-scan").addEventListener("click", closeScan); document.querySelector("#scan-start").addEventListener("click", runScan); try { state.scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); document.querySelector("#camera").srcObject = state.scanStream; } catch { document.querySelector("#camera").classList.add("camera-fallback"); toast("カメラを許可すると周囲を映せます"); } }
function runScan() { const button = document.querySelector("#scan-start"); const ring = document.querySelector(".scan-ring i"); button.disabled = true; button.textContent = "景色を確認しています…"; ring.classList.add("scanning"); setTimeout(() => { closeScan(); state.location = { lat: 35.6595, lng: 139.7005 }; render(); toast("現在地候補: 渋谷駅 ハチ公口"); }, 4200); }
function closeScan() { state.scanStream?.getTracks().forEach((track) => track.stop()); state.scanStream = null; const modal = document.querySelector("#scan-modal"); modal?.setAttribute("aria-hidden", "true"); if (modal) modal.innerHTML = ""; }
function toast(message) { const node = document.querySelector("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 3200); }

render();
