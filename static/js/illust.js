const SHEET_URLS = {
  sectionHeader:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?output=csv",

  introProfile:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?gid=1011552943&single=true&output=csv",

  introSlots:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?gid=0&single=true&output=csv",

  collab:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?gid=1403368188&single=true&output=csv",

  notice:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?gid=333776545&single=true&output=csv",

  usage:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?gid=1623420157&single=true&output=csv",
};

/* =========================
   csv
========================= */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map(v => String(v || "").trim());

  return rows
    .slice(1)
    .filter(cols => cols.some(v => String(v || "").trim() !== ""))
    .map(cols => {
      const obj = {};
      headers.forEach((key, idx) => {
        obj[key] = String(cols[idx] ?? "").trim();
      });
      return obj;
    });
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCSV(text);
}

/* =========================
   image utils
========================= */
function convertGoogleDriveUrl(url = "") {
  const value = String(url).trim();
  if (!value) return "";

  if (value.includes("lh3.googleusercontent.com/d/")) {
    return value;
  }

  const fileMatch = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch?.[1]) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  }

  const openMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch?.[1]) {
    return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  }

  return value;
}

function normalizeImageUrl(url = "") {
  const value = String(url).trim();
  if (!value) return "";
  if (value.includes("drive.google.com")) {
    return convertGoogleDriveUrl(value);
  }
  return value;
}

/* =========================
   section header
========================= */
function createSectionHeader({ title, desc }) {
  const wrap = document.createElement("div");
  wrap.className = "sec-head";
  wrap.innerHTML = `
    <div class="sec-head__inner">
      <div class="sec-head__badge">
        <span class="ui-dot is-pink"></span>
        <span>SECTION</span>
      </div>
      <h2 class="sec-head__title">${title || ""}</h2>
      ${desc ? `<p class="sec-head__desc">${desc}</p>` : ""}
    </div>
  `;
  return wrap;
}

async function renderSectionHeaders() {
  const rows = await fetchCSV(SHEET_URLS.sectionHeader);
  const sectionMap = new Map(
    rows.map(row => [String(row.section_id || "").trim(), row])
  );

  document.querySelectorAll(".sec[id]").forEach(section => {
    const data = sectionMap.get(section.id.trim());
    if (!data || !data.title) return;
    section.prepend(
      createSectionHeader({
        title: data.title,
        desc: data.desc
      })
    );
  });
}

/* =========================
   intro
========================= */
function getSlotMeta(status = "") {
  const map = {
    closed: {
      label: "찬 슬롯",
      symbol: "●",
      className: "is-closed"
    },
    open: {
      label: "빈 슬롯",
      symbol: "○",
      className: "is-open"
    },
    appoint: {
      label: "예약 슬롯",
      symbol: "◎",
      className: "is-appoint"
    }
  };

  return map[String(status).trim().toLowerCase()] || null;
}

function createIntroProfileCard(profile = {}) {
  const name = profile.name || "";
  const text = profile.text || "";
  const imageUrl = normalizeImageUrl(profile.image_url || "");

  const el = document.createElement("article");
  el.className = "intro-card intro-card--profile ui-window";

  el.innerHTML = `
    <div class="ui-window__body">
      <div class="intro-profile intro-profile--compact">
        <div class="intro-profile__media">
          ${
            imageUrl
              ? `<img src="${imageUrl}" alt="${name} 소개 이미지" loading="lazy">`
              : `<div class="intro-profile__placeholder"></div>`
          }
        </div>

        <div class="intro-profile__body">
          <p class="intro-profile__eyebrow">CREATOR</p>
          <h3 class="intro-profile__name">${name}</h3>
          ${text ? `<p class="intro-profile__text">${text}</p>` : ""}
          
          <div class="intro-profile__actions">
            <a href="#form" class="ui-btn is-pink intro-profile__btn">문의하기</a>
            <a href="#sample" class="ui-btn is-mint intro-profile__btn">작업물 보기</a>
          </div>
        </div>
      </div>
    </div>
  `;

  return el;
}

function createIntroSlotsCard(slotRows = []) {
  const el = document.createElement("article");
  el.className = "intro-card intro-card--slots ui-window";

  const slotItemsHtml = slotRows
    .map(row => {
      const month = row.month || "";
      const slotEntries = Object.entries(row)
        .filter(([key, value]) => key !== "month" && String(value).trim() !== "")
        .map(([key, value]) => {
          const normalized = String(value).trim().toLowerCase();
          if (normalized === "none") return null;

          const meta = getSlotMeta(normalized);
          if (!meta) return null;

          return `
            <li class="slot-chip ${meta.className}">
              <span class="slot-chip__state">${meta.symbol}</span>
              <span class="slot-chip__label">${meta.label}</span>
            </li>
          `;
        })
        .filter(Boolean)
        .join("");

      if (!slotEntries) return "";

        return `
        <div class="slot-month slot-month--compact">
            <div class="slot-month__row">
            <div class="slot-month__label">${month}월</div>
            <ul class="slot-month__list">
                ${slotEntries}
            </ul>
            </div>
        </div>
        `;
    })
    .filter(Boolean)
    .join("");

  el.innerHTML = `
    <div class="ui-window__body">
      <div class="intro-slots intro-slots--compact">
        <div class="intro-slots__head">
          <h3 class="intro-slots__title">작업 슬롯</h3>
          <p class="intro-slots__desc">
            상황에 따라 슬롯이 차 있어도 받습니다!
          </p>
        </div>

        <div class="slot-months slot-months--compact">
          ${slotItemsHtml}
        </div>
      </div>
    </div>
  `;

  return el;
}

async function renderIntroSection() {
  const introSection = document.getElementById("intro");
  if (!introSection) return;

  const profileRows = await fetchCSV(SHEET_URLS.introProfile);

  const profile = profileRows[0];
  if (!profile) return;

  const body = document.createElement("div");
  body.className = "intro-layout";

  if (profile) {
    body.appendChild(createIntroProfileCard(profile));
  }

  introSection.appendChild(body);
}

/* =========================
   collab
========================= */
function createCollabCard(item = {}) {
  const name = item.name || "";
  const desc = item.desc || "";
  const badge = item.badge || "";
  const link = item.link || "#";
  const thumb = normalizeImageUrl(item.thumb || "");
  const hasThumb = !!thumb;

  const el = document.createElement("a");
  el.className = "collab-card";
  el.href = link;
  el.target = "_blank";
  el.rel = "noopener noreferrer";

  el.innerHTML = `
    <div class="collab-card__inner ui-card">
      <div class="collab-card__top">
        <div class="collab-card__thumb ${hasThumb ? "" : "is-empty"}">
          ${
            hasThumb
              ? `<img src="${thumb}" alt="${name} 썸네일" loading="lazy">`
              : `<div class="collab-card__placeholder"><span>${name ? name.charAt(0) : "★"}</span></div>`
          }
        </div>

        <div class="collab-card__meta">
          ${badge ? `<span class="collab-card__badge">${badge}</span>` : ""}
          <h3 class="collab-card__name">${name}</h3>
        </div>
      </div>

      ${desc ? `<p class="collab-card__desc">${desc}</p>` : ""}
    </div>
  `;

  return el;
}

function createCollabAccordion(items = [], title = "협업 작가", desc = "") {
  const wrap = document.createElement("div");
  wrap.className = "ui-accordion collab-accordion is-open";

  wrap.innerHTML = `
    <div class="collab-accordion__shell">
      <button
        type="button"
        class="ui-accordion__trigger collab-accordion__trigger"
        aria-expanded="true"
        aria-controls="collab-accordion-panel"
      >
        <div class="collab-accordion__window">
          <div class="collab-accordion__bar">
            <div class="collab-accordion__dots">
              <span class="ui-dot is-pink"></span>
              <span class="ui-dot is-butter"></span>
              <span class="ui-dot is-mint"></span>
            </div>
            <span class="collab-accordion__chevron" aria-hidden="true"></span>
          </div>

          <div class="collab-accordion__hero">
            <span class="collab-accordion__kicker">COLLAB</span>
            <h2 class="collab-accordion__title">${title}</h2>
            ${desc ? `<p class="collab-accordion__desc">${desc}</p>` : ""}
          </div>
        </div>
      </button>

      <div class="ui-accordion__panel collab-accordion__panel" id="collab-accordion-panel">
        <div class="ui-accordion__inner collab-accordion__content">
          <div class="collab-grid"></div>
        </div>
      </div>
    </div>
  `;

  const grid = wrap.querySelector(".collab-grid");
  items.forEach(item => {
    grid.appendChild(createCollabCard(item));
  });

  return wrap;
}

function bindAccordion(root) {
  if (!root) return;

  const trigger = root.querySelector(".ui-accordion__trigger");
  const panel = root.querySelector(".ui-accordion__panel");

  if (!trigger || !panel) return;

  const setOpen = () => {
    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");

    panel.style.height = `${panel.scrollHeight}px`;

    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      if (root.classList.contains("is-open")) {
        panel.style.height = "auto";
      }
      panel.removeEventListener("transitionend", onEnd);
    };

    panel.addEventListener("transitionend", onEnd);
  };

  const setClose = () => {
    panel.style.height = `${panel.scrollHeight}px`;

    requestAnimationFrame(() => {
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      panel.style.height = "0px";
    });
  };

  trigger.addEventListener("click", () => {
    const isOpen = root.classList.contains("is-open");
    if (isOpen) setClose();
    else setOpen();
  });

  if (root.classList.contains("is-open")) {
    panel.style.height = "auto";
  } else {
    panel.style.height = "0px";
  }
}

async function renderCollabSection() {
  const section = document.getElementById("collab");
  if (!section) return;

  const rows = await fetchCSV(SHEET_URLS.collab);

  const filtered = rows
    .filter(row => String(row.group || "").trim().toLowerCase() === "illust")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  if (!filtered.length) return;

  const title =
    section.querySelector(".sec-head__title")?.textContent?.trim() || "협업 작가";
  const desc =
    section.querySelector(".sec-head__desc")?.textContent?.trim() || "";

  const oldHead = section.querySelector(".sec-head");
  if (oldHead) oldHead.remove();

  const accordion = createCollabAccordion(filtered, title, desc);
  section.appendChild(accordion);
  bindAccordion(accordion);
}

/* =========================
   notice
========================= */
function formatNoticeOrder(value) {
  const num = Number(value || 0);
  return String(num).padStart(2, "0");
}

function createNoticeBoard(items = [], title = "공지사항", desc = "") {
  const wrap = document.createElement("div");
  wrap.className = "notice-board";

  const listHtml = items
    .map(item => {
      const order = formatNoticeOrder(item.order);
      const text = item.desc || "";

      return `
        <li class="notice-board__item">
          <span class="notice-board__num">${order}</span>
          <p class="notice-board__text">${text}</p>
        </li>
      `;
    })
    .join("");

  wrap.innerHTML = `
    <div class="notice-board__inner">
      <div class="notice-board__head">
        <span class="notice-board__badge">${title}</span>
        ${
          desc
            ? `<p class="notice-board__headDesc">${desc}</p>`
            : ""
        }
      </div>

      <ul class="notice-board__list">
        ${listHtml}
      </ul>
    </div>
  `;

  return wrap;
}

async function renderNoticeSection() {
  const section = document.getElementById("notice");
  if (!section) return;

  const rows = await fetchCSV(SHEET_URLS.notice);

  const filtered = rows
    .filter(row => String(row.group || "").trim().toLowerCase() === "illust")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  if (!filtered.length) return;

  const title =
    section.querySelector(".sec-head__title")?.textContent?.trim() || "공지사항";
  const desc =
    section.querySelector(".sec-head__desc")?.textContent?.trim() || "";

  const oldHead = section.querySelector(".sec-head");
  if (oldHead) oldHead.remove();

  section.appendChild(createNoticeBoard(filtered, title, desc));
}

/* =========================
   usage
========================= */
function createUsageMark(value = "") {
  const normalized = String(value).trim().toUpperCase();

  if (normalized === "O") {
    return `<span class="usage-mark is-ok" aria-label="가능">O</span>`;
  }

  if (normalized === "X") {
    return `<span class="usage-mark is-no" aria-label="불가능">X</span>`;
  }

  return `<span class="usage-mark is-empty" aria-hidden="true">-</span>`;
}

function createUsageTable(rows = [], title = "사용 범위", desc = "") {
  if (!rows.length) return null;

  const headers = Object.keys(rows[0]);
  const firstHeader = headers[0];
  const columnHeaders = headers.slice(1);

  const section = document.createElement("div");
  section.className = "usage-table";

  const headHtml = `
    <div class="usage-table__head">
      <div class="usage-table__corner"></div>
      ${columnHeaders
        .map(col => `<div class="usage-table__th">${col}</div>`)
        .join("")}
    </div>
  `;

  const bodyHtml = rows
    .map((row, index) => {
      const typeValue = row[firstHeader] || "";
      const typeClass = index === 0 ? "is-pink" : "is-purple";

      const cellsHtml = columnHeaders
        .map(col => {
          return `
            <div class="usage-table__td">
              ${createUsageMark(row[col])}
            </div>
          `;
        })
        .join("");

      return `
        <div class="usage-table__row">
          <div class="usage-table__type ${typeClass}">${typeValue}</div>
          ${cellsHtml}
        </div>
      `;
    })
    .join("");

  section.innerHTML = `
    <div class="usage-wrap">
      <div class="sec-head">
        <div class="sec-head__inner">
          <div class="sec-head__badge">
            <span class="ui-dot is-pink"></span>
            <span>GUIDE</span>
          </div>
          <h2 class="sec-head__title">${title}</h2>
          ${desc ? `<p class="sec-head__desc">${desc}</p>` : ""}
        </div>
      </div>
        <div class="ui-window__body">
          ${headHtml}
          <div class="usage-table__body">
            ${bodyHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  return section;
}

async function renderUsageSection() {
  const section = document.getElementById("usage");
  if (!section) return;

  const rows = await fetchCSV(SHEET_URLS.usage);
  if (!rows.length) return;

  const usageTable = createUsageTable(
    rows,
    "사용 범위",
    "작업물 사용 가능 범위를 확인해주세요."
  );

  if (!usageTable) return;

  section.appendChild(usageTable);
}

/* =========================
   portfolio
========================= */
const PORTFOLIO_GALLERY_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?gid=1722034320&single=true&output=csv";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createPortfolioShotCard(item = {}, extraClass = "", imagePosition = "center center") {
  const imageUrl = normalizeImageUrl(item.image_url || "");
  const name = item.name || "";
  const desc = item.desc || "";

  return `
    <figure class="pf-shot ${extraClass}">
      <a
        class="pf-shot__link"
        href="${imageUrl || "#"}"
        ${imageUrl ? 'target="_blank" rel="noopener noreferrer"' : ""}
      >
        <div class="pf-shot__media">
          ${
            imageUrl
              ? `<img
                  src="${imageUrl}"
                  alt="${escapeHtml(name || item.category || "포트폴리오 이미지")}"
                  loading="lazy"
                  style="object-position:${imagePosition};"
                >`
              : `<div class="pf-shot__placeholder">이미지 준비중</div>`
          }
        </div>
      </a>

      ${
        name || desc
          ? `
            <figcaption class="pf-shot__caption">
              ${name ? `<strong class="pf-shot__name">${escapeHtml(name)}</strong>` : ""}
              ${desc ? `<p class="pf-shot__desc">${escapeHtml(desc)}</p>` : ""}
            </figcaption>
          `
          : ""
      }
    </figure>
  `;
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function createPortfolioLoopSection({ title, items = [], columns = 1, sectionClass = "" }) {
  if (!items.length) return "";

  const pages = chunkArray(items, columns);

  const normalizedPages =
    pages.length > 1 ? pages : [pages[0], pages[0], pages[0]];

  const loopPages = [
    normalizedPages[normalizedPages.length - 1],
    ...normalizedPages,
    normalizedPages[0]
  ];

  return `
    <section class="pf-block ${sectionClass}">
      <div class="pf-block__head">
        <h3 class="pf-block__title">${escapeHtml(title)}</h3>
      </div>

      <div class="pf-slider" data-columns="${columns}">
        <button type="button" class="pf-slider__nav is-prev" aria-label="${escapeHtml(title)} 이전">
          <span></span>
        </button>

        <div class="pf-slider__viewport">
          <div class="pf-slider__track">
            ${loopPages
              .map((pageItems, pageIndex) => {
                const cardsHtml = pageItems
                  .map((item, itemIndex) => {
                    let imagePosition = "center center";
                    let extraClass = "";

                    if (title === "눈알") {
                      const alignIndex = pageIndex * columns + itemIndex;
                      imagePosition = alignIndex % 2 === 0 ? "left center" : "right center";
                      extraClass = imagePosition.includes("left")
                        ? "is-eye-left"
                        : "is-eye-right";
                    }

                    return createPortfolioShotCard(item, extraClass, imagePosition);
                  })
                  .join("");

                return `
                  <div class="pf-slide" data-index="${pageIndex}">
                    <div class="pf-grid pf-grid--${columns}">
                      ${cardsHtml}
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <button type="button" class="pf-slider__nav is-next" aria-label="${escapeHtml(title)} 다음">
          <span></span>
        </button>
      </div>
    </section>
  `;
}

function initPortfolioLoopSliders(root = document) {
  const sliders = root.querySelectorAll(".pf-slider");

  sliders.forEach(slider => {
    const viewport = slider.querySelector(".pf-slider__viewport");
    const track = slider.querySelector(".pf-slider__track");
    const slides = [...slider.querySelectorAll(".pf-slide")];
    const prevBtn = slider.querySelector(".pf-slider__nav.is-prev");
    const nextBtn = slider.querySelector(".pf-slider__nav.is-next");

    if (!viewport || !track || !slides.length || !prevBtn || !nextBtn) return;

    let current = 1;
    let isAnimating = false;

    function update(animate = true) {
      const activeSlide = slides[current];
      if (!activeSlide) return;

      const viewportWidth = viewport.clientWidth;
      const slideWidth = activeSlide.offsetWidth;
      const slideLeft = activeSlide.offsetLeft;
      const targetX = slideLeft - ((viewportWidth - slideWidth) / 2);

      track.style.transition = animate
        ? "transform .65s cubic-bezier(.22,1,.36,1)"
        : "none";

      track.style.transform = `translate3d(-${targetX}px, 0, 0)`;
    }

    function goNext() {
      if (isAnimating) return;
      isAnimating = true;
      current += 1;
      update(true);
    }

    function goPrev() {
      if (isAnimating) return;
      isAnimating = true;
      current -= 1;
      update(true);
    }

    prevBtn.addEventListener("click", goPrev);
    nextBtn.addEventListener("click", goNext);

    track.addEventListener("transitionend", e => {
      if (e.propertyName !== "transform") return;

      if (current === slides.length - 1) {
        current = 1;
        update(false);
      } else if (current === 0) {
        current = slides.length - 2;
        update(false);
      }

      isAnimating = false;
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => update(false), 100);
    });

    update(false);
  });
}

async function renderPortfolioSection() {
  const section = document.getElementById("sample");
  if (!section) return;

  const rows = await fetchCSV(PORTFOLIO_GALLERY_URL);
  if (!rows.length) return;

  const illustItems = rows
    .filter(row => String(row.group || "").trim().toLowerCase() === "illust")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  if (!illustItems.length) return;

  const verticalItems = illustItems.filter(
    row =>
      String(row.category || "").trim() === "일러스트" &&
      String(row.sub || "").trim() === "세로"
  );

  const horizontalItems = illustItems.filter(
    row =>
      String(row.category || "").trim() === "일러스트" &&
      String(row.sub || "").trim() === "가로"
  );

  section.innerHTML = `
    <div class="pf-wrap">
      <div class="sec-head">
        <div class="sec-head__inner">
          <div class="sec-head__badge">
            <span class="ui-dot is-pink"></span>
            <span>SECTION</span>
          </div>
          <h2 class="sec-head__title">포트폴리오</h2>
          <p class="sec-head__desc">이미지를 클릭하면 새 창에서 크게 볼 수 있어요.</p>
        </div>
      </div>

      <div class="pf-stack">
        ${createPortfolioLoopSection({
          title: "세로 일러스트",
          items: verticalItems,
          columns: 2,
          sectionClass: "is-illust-vertical"
        })}

        ${createPortfolioLoopSection({
          title: "가로 일러스트",
          items: horizontalItems,
          columns: 1,
          sectionClass: "is-illust-horizontal"
        })}
      </div>
    </div>
  `;

  initPortfolioLoopSliders(section);
}

/* =========================
   showcase
========================= */
const SHOWCASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDYdEQ_sxNX4u2b_n1kHDayISAVa2KumYZ-MqmkxPJncDyJBuf07UuKxxxO3Gi0_PWv2Fkc88wxGcK/pub?gid=1478820711&single=true&output=csv";

function getYoutubeVideoId(url = "") {
  const value = String(url).trim();
  if (!value) return "";

  const shortMatch = value.match(/youtu\.be\/([^?&#/]+)/);
  if (shortMatch?.[1]) return shortMatch[1];

  const watchMatch = value.match(/[?&]v=([^?&#/]+)/);
  if (watchMatch?.[1]) return watchMatch[1];

  const embedMatch = value.match(/embed\/([^?&#/]+)/);
  if (embedMatch?.[1]) return embedMatch[1];

  return "";
}

function getYoutubeThumbnailUrl(url = "") {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return "";
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

function getYoutubeThumbnailFallbacks(url = "") {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return [];

  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  ];
}

function bindShowcaseImageFallback(root = document) {
  const images = root.querySelectorAll(".showcase-slide__media img[data-fallbacks]");

  images.forEach(img => {
    img.addEventListener("error", () => {
      try {
        const fallbacks = JSON.parse(img.dataset.fallbacks || "[]");
        const nextIndex = Number(img.dataset.fallbackIndex || "0") + 1;

        if (nextIndex >= fallbacks.length) return;

        img.dataset.fallbackIndex = String(nextIndex);
        img.src = fallbacks[nextIndex];
      } catch (error) {
        console.warn("[showcase] thumbnail fallback failed:", error);
      }
    });
  });
}

async function renderShowcaseSection() {
  const section = document.getElementById("showcase");
  if (!section) return;

  const track = section.querySelector("#showcaseTrack");
  const pagination = section.querySelector("#showcasePagination");
  const prevBtn = section.querySelector(".showcase-nav.prev");
  const nextBtn = section.querySelector(".showcase-nav.next");

  if (!track || !pagination || !prevBtn || !nextBtn) return;

  const rows = await fetchCSV(SHOWCASE_URL);
  const items = rows
    .filter(row => String(row.youtube_url || "").trim() !== "")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  if (!items.length) return;

  const loopItems = [items[items.length - 1], ...items, items[0]];

  track.innerHTML = loopItems.map((item, index) => {
    const name = escapeHtml(item.name || "");
    const desc = escapeHtml(item.desc || "").replace(/\n/g, "<br>");
    const youtubeUrl = String(item.youtube_url || "").trim();
    const thumb = getYoutubeThumbnailUrl(youtubeUrl);
    const fallbacks = getYoutubeThumbnailFallbacks(youtubeUrl);

    return `
      <article class="showcase-slide" data-index="${index}">
        <a class="showcase-slide__link" href="${youtubeUrl}" target="_blank" rel="noopener noreferrer">
          <div class="showcase-slide__media">
            ${
              thumb
                ? `
                  <img
                    src="${thumb}"
                    alt="${name || "쇼케이스 영상"} 썸네일"
                    loading="lazy"
                    data-fallbacks='${JSON.stringify(fallbacks)}'
                    data-fallback-index="0"
                  >
                `
                : `<div class="showcase-slide__placeholder">영상 썸네일 준비중</div>`
            }
            <span class="showcase-slide__play" aria-hidden="true"></span>
          </div>
        </a>

        <div class="showcase-slide__caption">
          ${name ? `<strong class="showcase-slide__name">${name}</strong>` : ""}
          ${desc ? `<p class="showcase-slide__desc">${desc}</p>` : ""}
        </div>
      </article>
    `;
  }).join("");

  pagination.innerHTML = items
    .map((_, i) => `<span data-dot="${i}"></span>`)
    .join("");

  bindShowcaseImageFallback(section);

  const slides = [...track.querySelectorAll(".showcase-slide")];
  const dots = [...pagination.querySelectorAll("span")];

  let current = 1;
  let isAnimating = false;

  function getStep() {
    const first = slides[0];
    if (!first) return 0;

    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.gap || "0");
    return first.getBoundingClientRect().width + gap;
  }

function update(animate = true) {
  const viewport = section.querySelector(".showcase-viewport");
  const activeSlide = slides[current];

  if (!viewport || !activeSlide) return;

  const viewportWidth = viewport.clientWidth;
  const slideWidth = activeSlide.offsetWidth;
  const slideLeft = activeSlide.offsetLeft;
  const targetX = slideLeft - ((viewportWidth - slideWidth) / 2);

  track.style.transition = animate
    ? "transform .68s cubic-bezier(.22,1,.36,1)"
    : "none";

  track.style.transform = `translate3d(-${targetX}px, 0, 0)`;

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === current);
  });

  const logicalIndex = (current - 1 + items.length) % items.length;
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === logicalIndex);
  });
}

  function goNext() {
    if (isAnimating) return;
    isAnimating = true;
    current += 1;
    update(true);
  }

  function goPrev() {
    if (isAnimating) return;
    isAnimating = true;
    current -= 1;
    update(true);
  }

  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      if (isAnimating) return;
      current = index + 1;
      update(true);
    });
  });

  track.addEventListener("transitionend", (e) => {
    if (e.propertyName !== "transform") return;

    if (current === slides.length - 1) {
      current = 1;
      update(false);
    } else if (current === 0) {
      current = items.length;
      update(false);
    }

    isAnimating = false;
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => update(false), 100);
  });

  update(false);
}


function setupContactForm() {
  const form = document.getElementById("contactForm");
  const copyBtn = document.getElementById("copyFormBtn");
  const resetBtn = document.getElementById("resetFormBtn");

  if (!form || !copyBtn || !resetBtn) return;

  const getCheckedValue = (name) => {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
  };

  const buildFormText = () => {
    const nickname = form.nickname?.value?.trim() || "";
    const receiveDate = form.receiveDate?.value?.trim() || "";
    const privateProcess = getCheckedValue("privateProcess") || "NO";
    const privatePortfolio = getCheckedValue("privatePortfolio") || "NO";
    const applyType = getCheckedValue("applyType") || "";
    const extraNotes = form.extraNotes?.value?.trim() || "";
    const characterInfo = form.characterInfo?.value?.trim() || "";

    return [
      "문의 양식",
      "",
      `닉네임 : ${nickname}`,
      `수령 희망 날짜 : ${receiveDate}`,
      `작업과정 비공개 : ${privateProcess}`,
      `포트폴리오 비공개 : ${privatePortfolio}`,
      `신청 타입 : ${applyType}`,
      "",
      "[추가사항]",
      extraNotes || "(없음)",
      "",
      "[신청 캐릭터]",
      characterInfo || "(없음)"
    ].join("\n");
  };

  copyBtn.addEventListener("click", async () => {
    const text = buildFormText();

    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "복사 완료!";
      setTimeout(() => {
        copyBtn.textContent = "양식 복사";
      }, 1600);
    } catch (error) {
      console.error("[form copy] failed:", error);
      alert("복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();

    const defaultProcess = form.querySelector('input[name="privateProcess"][value="NO"]');
    const defaultPortfolio = form.querySelector('input[name="privatePortfolio"][value="NO"]');

    if (defaultProcess) defaultProcess.checked = true;
    if (defaultPortfolio) defaultPortfolio.checked = true;
  });
}

/* =========================
   init
========================= */
async function init() {
  try {
    await renderSectionHeaders();
    await renderIntroSection();
    await renderCollabSection();
    await renderNoticeSection();
    await renderUsageSection();
    await renderPortfolioSection();
    await renderShowcaseSection();
    setupContactForm();
  } catch (error) {
    console.error("[app init] failed:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);