// ======== STATE ========
let currentStep = 1;
const totalSteps = 7;

// dynamic years (1–5)
const MAX_YEARS = 5;
let numYears = 1;

// current loaded budget id (null = new)
let currentBudgetId = null;

// localStorage key for saved budgets
const BUDGET_STORAGE_KEY = "gg_budgets_v1";

const data = {
  projectName: "",
  fundingAgency: "",
  pi: "",
  coPIs: [], // [{ name }]
  personnel: [], // [{ role, name }]
  fringe: [], // [{ category, y1..y5 }]
  trips: [], // [{ type, y1..y5 }]
  costs: [] // [{ label, y1..y5 }]
};

// ======== ELEMENTS ========

const milestones = Array.from(document.querySelectorAll(".milestone"));
const progressFill = document.getElementById("progressFill");

const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const restartBtn = document.getElementById("restartBtn");

const stepEl = (n) => document.getElementById(`step-${n}`);

// Step 1
const projectName = document.getElementById("projectName");
const fundingAgency = document.getElementById("fundingAgency");

// Saved budgets UI
const savedBlock = document.getElementById("savedBlock");
const savedList = document.getElementById("savedBudgetsList");
const refreshBudgetsBtn = document.getElementById("refreshBudgets");

// Step 2
const piName = document.getElementById("piName");
const addCoPI = document.getElementById("addCoPI");
const coPIList = document.getElementById("coPIList");

// Step 3
const addPers = document.getElementById("addPers");
const persList = document.getElementById("persList");

// Step 4 (Fringe)
const fringeList = document.getElementById("fringeList");
const yearAddBtn = document.getElementById("yearAdd");
const yearRemoveBtn = document.getElementById("yearRemove");
const yearLabelEl = document.getElementById("yearLabel");

// Step 5
const addTrip = document.getElementById("addTrip");
const tripList = document.getElementById("tripList");

// Step 6
const addCost = document.getElementById("addCost");
const costList = document.getElementById("costList");

// Step 7 outputs
const outProj = document.getElementById("outProj");
const outAgency = document.getElementById("outAgency");
const outPI = document.getElementById("outPI");
const outCoPIs = document.getElementById("outCoPIs");
const outPers = document.getElementById("outPers");
const outFringe = document.getElementById("outFringe");
const outTrips = document.getElementById("outTrips");
const outCosts = document.getElementById("outCosts");
const excelTable = document.getElementById("excelTable");

const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const saveBudgetMsg = document.getElementById("saveBudgetMsg");

// user + logout UI
const userEmailLabel = document.getElementById("userEmailLabel");
const logoutBtn = document.getElementById("logoutBtn");

// ================== Remote Typeahead Helper ==================
const API_BASE = window.API_BASE || "https://grant-grid.onrender.com"; // change if your API runs on another port

function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function attachRemoteTypeahead(inputEl, role) {
  if (!inputEl) return;
  const field = inputEl.closest(".field") || inputEl.parentElement;
  field.classList.add("ta-wrap");
  const list = document.createElement("div");
  list.className = "ta-list";
  field.appendChild(list);

  async function search(q) {
    const url = new URL(API_BASE + "/api/people");
    url.searchParams.set("role", role);
    if (q) url.searchParams.set("q", q);
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json(); // [{id, name}]
  }

  function render(items) {
    list.innerHTML = items.length
      ? items
          .map(
            (p) => `<div class="ta-item" data-id="${p.id}">${p.name}</div>`
          )
          .join("")
      : `<div class="ta-item ta-empty">No matches</div>`;
    list.style.display = "block";
    list.querySelectorAll(".ta-item").forEach((el) => {
      if (el.classList.contains("ta-empty")) return;
      el.addEventListener("click", () => {
        inputEl.value = el.textContent;
        inputEl.dataset.personId = el.dataset.id;
        list.style.display = "none";
      });
    });
  }

  const doSearch = debounce(async () => {
    const items = await search(inputEl.value.trim());
    render(items);
  }, 180);

  inputEl.addEventListener("input", doSearch);
  inputEl.addEventListener("focus", doSearch);
  document.addEventListener("click", (e) => {
    if (!field.contains(e.target)) list.style.display = "none";
  });
}

// Attach to the PI input immediately
attachRemoteTypeahead(piName, "PI");
// ================== /Remote Typeahead ==================

// ======== YEAR HELPERS ========
function updateYearLabel() {
  if (!yearLabelEl) return;
  yearLabelEl.textContent =
    numYears === 1 ? "1 Year" : `${numYears} Years`;
}

function ensureYearInputsForFringe() {
  if (!fringeList) return;
  fringeList
    .querySelectorAll(".fringe-row .year-grid")
    .forEach((grid) => {
      const current = grid.querySelectorAll("input").length;
      if (current < numYears) {
        const lastVal =
          current > 0
            ? grid.querySelectorAll("input")[current - 1].value
            : "";
        for (let i = current + 1; i <= numYears; i++) {
          const input = document.createElement("input");
          input.type = "number";
          input.step = "0.1";
          input.min = "0";
          input.placeholder = `Y${i}`;
          input.value = lastVal;
          grid.appendChild(input);
        }
      } else if (current > numYears) {
        for (let i = current; i > numYears; i--) {
          grid.removeChild(grid.lastElementChild);
        }
      }
    });
}

function ensureYearInputsForTrips() {
  tripList
    .querySelectorAll(".card .year-grid")
    .forEach((grid) => {
      const current = grid.querySelectorAll("input").length;
      if (current < numYears) {
        for (let i = current + 1; i <= numYears; i++) {
          const input = document.createElement("input");
          input.type = "number";
          input.step = "100";
          input.min = "0";
          input.placeholder = `Y${i}`;
          grid.appendChild(input);
        }
      } else if (current > numYears) {
        for (let i = current; i > numYears; i--) {
          grid.removeChild(grid.lastElementChild);
        }
      }
    });
}

function ensureYearInputsForCosts() {
  costList
    .querySelectorAll(".card .year-grid")
    .forEach((grid) => {
      const current = grid.querySelectorAll("input[name='amt']").length;
      if (current < numYears) {
        for (let i = current + 1; i <= numYears; i++) {
          const input = document.createElement("input");
          input.type = "number";
          input.name = "amt";
          input.step = "100";
          input.min = "0";
          input.placeholder = `Y${i}`;
          grid.appendChild(input);
        }
      } else if (current > numYears) {
        for (let i = current; i > numYears; i--) {
          grid.removeChild(grid.lastElementChild);
        }
      }
    });
}

function syncAllYearInputs() {
  ensureYearInputsForFringe();
  ensureYearInputsForTrips();
  ensureYearInputsForCosts();
  updateYearLabel();
}

// ======== FRINGE INIT (creates the 4 default rows) ========
function initFringeRows() {
  if (!fringeList) return;

  const categories = [
    { category: "Faculty", defaultRate: 31.0 },
    { category: "UI professional staff & Post Docs", defaultRate: 41.3 },
    { category: "GRAs/UGRads", defaultRate: 2.5 },
    { category: "Temp Help", defaultRate: 8.3 }
  ];

  fringeList.innerHTML = "";

  categories.forEach((cat) => {
    const card = document.createElement("div");
    card.className = "card fringe-row";
    card.dataset.category = cat.category;

    const inputs = [];
    for (let i = 1; i <= numYears; i++) {
      inputs.push(
        `<input type="number" step="0.1" min="0" placeholder="Y${i}" value="${cat.defaultRate}">`
      );
    }

    card.innerHTML = `
      <div class="row-flex fringe-row-inner">
        <div class="field" style="flex:1;">
          <span>Category</span>
          <div>${cat.category}</div>
        </div>
        <div class="field" style="flex:2;">
          <span>Fringe Rate % (Years 1–${numYears})</span>
          <div class="year-grid">
            ${inputs.join("")}
          </div>
        </div>
      </div>
    `;
    fringeList.appendChild(card);
  });
}

// ======== NAV + UI ========
function goToStep(target, dir) {
  if (target < 1 || target > totalSteps) return;

  const out = stepEl(currentStep);
  const inc = stepEl(target);
  inc.classList.add("step-active");

  if (dir === "next") {
    out.classList.remove("slide-in-left", "slide-in-right");
    out.classList.add("slide-out-left");
    inc.classList.remove("slide-out-left", "slide-out-right");
    inc.classList.add("slide-in-right");
  } else {
    out.classList.remove("slide-in-left", "slide-in-right");
    out.classList.add("slide-out-right");
    inc.classList.remove("slide-out-left", "slide-out-right");
    inc.classList.add("slide-in-left");
  }
  const onEnd = () => {
    out.classList.remove(
      "step-active",
      "slide-out-left",
      "slide-out-right"
    );
    out.removeEventListener("animationend", onEnd);
  };
  out.addEventListener("animationend", onEnd);

  currentStep = target;
  updateProgress();
  updateButtons();

  if (currentStep === 7) buildReview();
}

function updateProgress() {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;
  progressFill.style.width = `${pct}%`;
  milestones.forEach((m) => {
    const s = Number(m.dataset.step);
    if (currentStep >= s) m.classList.add("active");
    else m.classList.remove("active");
  });
}
function updateButtons() {
  backBtn.disabled = currentStep === 1;
  nextBtn.textContent =
    currentStep === totalSteps ? "Generate Budget Excel" : "Next";
}

// ======== VALIDATION / CAPTURE ========
function validateStep() {
  switch (currentStep) {
    case 1:
      if (!projectName.value.trim() || !fundingAgency.value.trim()) {
        alert("Please enter Project title and Funding source.");
        return false;
      }
      data.projectName = projectName.value.trim();
      data.fundingAgency = fundingAgency.value.trim();
      return true;

    case 2:
      if (!piName.value.trim()) {
        alert("Please enter the PI name.");
        return false;
      }
      data.pi = piName.value.trim();
      data.coPIs = Array.from(coPIList.querySelectorAll("input"))
        .map((i) => ({ name: i.value.trim() }))
        .filter((x) => x.name);
      return true;

    case 3:
      data.personnel = [];
      persList.querySelectorAll(".card").forEach((card) => {
        const role = card.querySelector("select").value;
        const name = card.querySelector("input").value.trim();
        if (name) data.personnel.push({ role, name });
      });
      return true;

    case 4: // Fringe
      data.fringe = [];
      fringeList.querySelectorAll(".fringe-row").forEach((card) => {
        const category = card.dataset.category;
        const nums = Array.from(card.querySelectorAll("input")).map(
          (i) => Number(i.value || 0)
        );
        const [y1, y2, y3, y4, y5] = nums;
        data.fringe.push({
          category,
          y1: y1 || 0,
          y2: y2 || 0,
          y3: y3 || 0,
          y4: y4 || 0,
          y5: y5 || 0
        });
      });
      return true;

    case 5:
      data.trips = [];
      tripList.querySelectorAll(".card").forEach((card) => {
        const type = card.querySelector("select").value;
        const years = Array.from(card.querySelectorAll("input")).map(
          (i) => Number(i.value || 0)
        );
        const [y1, y2, y3, y4, y5] = years;
        data.trips.push({
          type,
          y1: y1 || 0,
          y2: y2 || 0,
          y3: y3 || 0,
          y4: y4 || 0,
          y5: y5 || 0
        });
      });
      return true;

    case 6:
      data.costs = [];
      costList.querySelectorAll(".card").forEach((card) => {
        const label = card
          .querySelector('input[name="label"]')
          .value.trim();
        const nums = Array.from(
          card.querySelectorAll('input[name="amt"]')
        ).map((i) => Number(i.value || 0));
        const [y1, y2, y3, y4, y5] = nums;
        if (label)
          data.costs.push({
            label,
            y1: y1 || 0,
            y2: y2 || 0,
            y3: y3 || 0,
            y4: y4 || 0,
            y5: y5 || 0
          });
      });
      return true;

    default:
      return true;
  }
}

// ======== REVIEW + EXPORT ========
function buildReview() {
  outProj.textContent = data.projectName || "—";
  outAgency.textContent = data.fundingAgency || "—";
  outPI.textContent = data.pi || "—";

  // Co-PIs
  outCoPIs.innerHTML = "";
  if (data.coPIs.length === 0) {
    outCoPIs.innerHTML =
      '<div class="row"><span class="k">Co-PIs</span><span class="v">None</span></div>';
  } else {
    data.coPIs.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span class="k">Co-PI ${
        idx + 1
      }</span><span class="v">${escapeHTML(c.name)}</span>`;
      outCoPIs.appendChild(row);
    });
  }

  // Personnel
  outPers.innerHTML = "";
  if (data.personnel.length === 0) {
    outPers.innerHTML =
      '<div class="row"><span class="k">Personnel</span><span class="v">None</span></div>';
  } else {
    data.personnel.forEach((p) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span class="k">${escapeHTML(
        p.role
      )}</span><span class="v">${escapeHTML(p.name)}</span>`;
      outPers.appendChild(row);
    });
  }

  // Fringe
  outFringe.innerHTML = "";
  const fringeTable = document.createElement("div");
  fringeTable.className = "summary tableish";

  if (!data.fringe || data.fringe.length === 0) {
    fringeTable.innerHTML =
      '<div class="row">No fringe rates defined</div>';
  } else {
    let headCols = "<div>Category</div>";
    for (let i = 1; i <= numYears; i++) {
      headCols += `<div>Y${i} %</div>`;
    }

    let bodyRows = data.fringe
      .map((f) => {
        const vals = [f.y1, f.y2, f.y3, f.y4, f.y5];
        let rowCols = `<div>${escapeHTML(f.category)}</div>`;
        for (let i = 0; i < numYears; i++) {
          rowCols += `<div>${vals[i] || 0}</div>`;
        }
        return `<div class="row" style="display:grid;grid-template-columns:2fr repeat(${numYears},1fr);gap:10px;">${rowCols}</div>`;
      })
      .join("");

    fringeTable.innerHTML = `
      <div class="head" style="display:grid;grid-template-columns:2fr repeat(${numYears},1fr);gap:10px;">
        ${headCols}
      </div>
      ${bodyRows}
    `;
  }
  outFringe.appendChild(fringeTable);

  // Trips
  outTrips.innerHTML = "";
  const tripsTable = document.createElement("div");
  tripsTable.className = "summary";

  if (data.trips.length === 0) {
    tripsTable.innerHTML = '<div class="row">No trips added</div>';
  } else {
    let headCols = "<div>Type</div>";
    for (let i = 1; i <= numYears; i++) {
      headCols += `<div>Y${i}</div>`;
    }
    let bodyRows = data.trips
      .map((t) => {
        const vals = [t.y1, t.y2, t.y3, t.y4, t.y5];
        let rowCols = `<div>${escapeHTML(t.type)}</div>`;
        for (let i = 0; i < numYears; i++) {
          rowCols += `<div>${fmt(vals[i])}</div>`;
        }
        return `<div class="row" style="display:grid;grid-template-columns:2fr repeat(${numYears},1fr);gap:10px;">${rowCols}</div>`;
      })
      .join("");

    tripsTable.innerHTML = `
      <div class="head" style="display:grid;grid-template-columns:2fr repeat(${numYears},1fr);gap:10px;">
        ${headCols}
      </div>
      ${bodyRows}
    `;
  }
  outTrips.appendChild(tripsTable);

  // Costs
  outCosts.innerHTML = "";
  const costsTable = document.createElement("div");
  costsTable.className = "summary";
  if (data.costs.length === 0) {
    costsTable.innerHTML =
      '<div class="row">No other costs added</div>';
  } else {
    let headCols = "<div>Item</div>";
    for (let i = 1; i <= numYears; i++) {
      headCols += `<div>Y${i}</div>`;
    }
    let bodyRows = data.costs
      .map((c) => {
        const vals = [c.y1, c.y2, c.y3, c.y4, c.y5];
        let rowCols = `<div>${escapeHTML(c.label)}</div>`;
        for (let i = 0; i < numYears; i++) {
          rowCols += `<div>${fmt(vals[i])}</div>`;
        }
        return `<div class="row" style="display:grid;grid-template-columns:2fr repeat(${numYears},1fr);gap:10px;">${rowCols}</div>`;
      })
      .join("");

    costsTable.innerHTML = `
      <div class="head" style="display:grid;grid-template-columns:2fr repeat(${numYears},1fr);gap:10px;">
        ${headCols}
      </div>
      ${bodyRows}
    `;
  }
  outCosts.appendChild(costsTable);

  buildExcelTable();
}

function fmt(n) {
  return n ? currency(n) : "—";
}
function currency(n) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `$${Number(n).toLocaleString()}`;
  }
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

// ---- Excel: builds ONLY <tr> rows inside #excelTable
function buildExcelTable() {
  const H = (t) =>
    `<th style="border:1px solid #000;padding:6px;background:#eee">${String(
      t
    )}</th>`;
  const TD = (t) =>
    `<td style="border:1px solid #000;padding:6px">${String(t)}</td>`;
  const SEP = `<tr><td style="height:10px" colspan="${
    numYears + 2
  }"></td></tr>`;

  const sum5 = (a, b) => ({
    y1: a.y1 + b.y1,
    y2: a.y2 + b.y2,
    y3: a.y3 + b.y3,
    y4: a.y4 + b.y4,
    y5: a.y5 + b.y5
  });
  const z5 = { y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 };

  const tripsTotals = data.trips.reduce(
    (acc, t) =>
      sum5(acc, {
        y1: +(t.y1 || 0),
        y2: +(t.y2 || 0),
        y3: +(t.y3 || 0),
        y4: +(t.y4 || 0),
        y5: +(t.y5 || 0)
      }),
    z5
  );

  const costsTotals = data.costs.reduce(
    (acc, c) =>
      sum5(acc, {
        y1: +(c.y1 || 0),
        y2: +(c.y2 || 0),
        y3: +(c.y3 || 0),
        y4: +(c.y4 || 0),
        y5: +(c.y5 || 0)
      }),
    z5
  );

  const totalByYear = sum5(tripsTotals, costsTotals);
  const grandTotal =
    totalByYear.y1 +
    totalByYear.y2 +
    totalByYear.y3 +
    totalByYear.y4 +
    totalByYear.y5;

  const yearLabels = ["Y1", "Y2", "Y3", "Y4", "Y5"].slice(0, numYears);

  let rows = "";

  rows += `<tr><td colspan="${
    numYears + 2
  }" style="font-weight:bold;font-size:16px">Grant-Grid Budget</td></tr>`;
  rows += `<tr><td colspan="${
    numYears + 2
  }">Title: ${escapeHTML(
    data.projectName
  )} &nbsp;|&nbsp; Funding: ${escapeHTML(
    data.fundingAgency
  )}</td></tr>`;
  rows += `<tr><td colspan="${
    numYears + 2
  }">PI: ${escapeHTML(data.pi)}</td></tr>`;
  rows += SEP;

  // Co-PIs
  rows += `<tr><td colspan="${
    numYears + 2
  }" style="font-weight:bold;background:#ddd;border:1px solid #000">Co-PIs</td></tr>`;
  if (data.coPIs.length) {
    data.coPIs.forEach((c) => {
      rows += `<tr>${TD(escapeHTML(c.name))}`;
      for (let i = 0; i < numYears + 1; i++) rows += TD("");
      rows += `</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}`;
    for (let i = 0; i < numYears + 1; i++) rows += TD("");
    rows += `</tr>`;
  }

  rows += SEP;

  // Other Personnel
  rows += `<tr><td colspan="${
    numYears + 2
  }" style="font-weight:bold;background:#ddd;border:1px solid #000">Other Personnel</td></tr>`;
  if (data.personnel.length) {
    data.personnel.forEach((p) => {
      rows += `<tr>${TD(escapeHTML(p.role))}${TD(
        escapeHTML(p.name)
      )}`;
      for (let i = 0; i < numYears; i++) rows += TD("");
      rows += `</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}`;
    for (let i = 0; i < numYears + 1; i++) rows += TD("");
    rows += `</tr>`;
  }

  rows += SEP;

  // Fringe Rates (%)
  rows += `<tr><td colspan="${
    numYears + 2
  }" style="font-weight:bold;background:#ddd;border:1px solid #000">Fringe Rates (%)</td></tr>`;
  rows += `<tr>${H("Category")}${yearLabels
    .map((y) => H(`${y} %`))
    .join("")}${H("")}</tr>`;
  if (data.fringe && data.fringe.length) {
    data.fringe.forEach((f) => {
      const vals = [f.y1, f.y2, f.y3, f.y4, f.y5];
      rows += `<tr>${TD(escapeHTML(f.category))}`;
      for (let i = 0; i < numYears; i++) rows += TD(vals[i] || 0);
      rows += TD("") + `</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}`;
    for (let i = 0; i < numYears + 1; i++) rows += TD("");
    rows += `</tr>`;
  }

  rows += SEP;

  // Travel
  rows += `<tr><td colspan="${
    numYears + 2
  }" style="font-weight:bold;background:#ddd;border:1px solid #000">Travel</td></tr>`;
  rows += `<tr>${H("Type")}${yearLabels
    .map((y) => H(y))
    .join("")}${H("Total")}</tr>`;
  if (data.trips.length) {
    data.trips.forEach((t) => {
      const vals = [t.y1, t.y2, t.y3, t.y4, t.y5];
      let row = `${TD(escapeHTML(t.type))}`;
      let total = 0;
      for (let i = 0; i < numYears; i++) {
        const v = vals[i] || 0;
        total += v;
        row += TD(v);
      }
      row += TD(total);
      rows += `<tr>${row}</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}`;
    for (let i = 0; i < numYears + 1; i++) rows += TD("");
    rows += `</tr>`;
  }
  rows += `<tr style="font-weight:bold;background:#f5f5f5">${TD(
    "Travel Total"
  )}${TD(tripsTotals.y1)}${TD(tripsTotals.y2)}${TD(
    tripsTotals.y3
  )}${TD(tripsTotals.y4)}${TD(tripsTotals.y5)}${TD(
    tripsTotals.y1 +
      tripsTotals.y2 +
      tripsTotals.y3 +
      tripsTotals.y4 +
      tripsTotals.y5
  )}</tr>`;

  rows += SEP;

  // Other Direct Costs
  rows += `<tr><td colspan="${
    numYears + 2
  }" style="font-weight:bold;background:#ddd;border:1px solid #000">Other Direct Costs</td></tr>`;
  rows += `<tr>${H("Item")}${yearLabels
    .map((y) => H(y))
    .join("")}${H("Total")}</tr>`;
  if (data.costs.length) {
    data.costs.forEach((c) => {
      const vals = [c.y1, c.y2, c.y3, c.y4, c.y5];
      let row = `${TD(escapeHTML(c.label))}`;
      let total = 0;
      for (let i = 0; i < numYears; i++) {
        const v = vals[i] || 0;
        total += v;
        row += TD(v);
      }
      row += TD(total);
      rows += `<tr>${row}</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}`;
    for (let i = 0; i < numYears + 1; i++) rows += TD("");
    rows += `</tr>`;
  }
  rows += `<tr style="font-weight:bold;background:#f5f5f5">${TD(
    "Other Costs Total"
  )}${TD(costsTotals.y1)}${TD(costsTotals.y2)}${TD(
    costsTotals.y3
  )}${TD(costsTotals.y4)}${TD(costsTotals.y5)}${TD(
    costsTotals.y1 +
      costsTotals.y2 +
      costsTotals.y3 +
      costsTotals.y4 +
      costsTotals.y5
  )}</tr>`;

  rows += SEP;

  // Totals by year + grand total
  rows += `<tr style="font-weight:bold;background:#cfe8ff">
    ${TD("TOTAL BY YEAR")}
    ${TD(totalByYear.y1)}${TD(totalByYear.y2)}${TD(
    totalByYear.y3
  )}${TD(totalByYear.y4)}${TD(totalByYear.y5)}
    ${TD(grandTotal)}
  </tr>`;

  excelTable.innerHTML = rows;
}

function downloadExcel() {
  const blob = new Blob(
    [
      `<html><head><meta charset="UTF-8"></head><body>${excelTable.outerHTML}</body></html>`
    ],
    { type: "application/vnd.ms-excel" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "grant-grid-budget.xls";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

// ======== DYNAMIC ROWS ========
addCoPI.addEventListener("click", () => {
  if (coPIList.children.length >= 5)
    return alert("Maximum 5 Co-PIs.");
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="row-flex">
      <label class="field"><span>Co-PI name</span><input type="text" placeholder="e.g., Dr. Lee"></label>
      <div class="chips"><span class="chip">Co-PI</span><button class="btn btn-ghost remove" type="button">Remove</button></div>
    </div>`;
  card
    .querySelector(".remove")
    .addEventListener("click", () => card.remove());
  coPIList.appendChild(card);

  const input = card.querySelector("input");
  attachRemoteTypeahead(input, "CO_PI");
});

addPers.addEventListener("click", () => {
  if (persList.children.length >= 5)
    return alert("Maximum 5 personnel.");
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="row-flex">
      <label class="field"><span>Position</span>
        <select>
          <option>UI Professional Staff</option>
          <option>Post Doc</option>
          <option>GRA / UGrad</option>
          <option>Temp Help</option>
          <option>Other</option>
        </select>
      </label>
      <label class="field"><span>Name</span><input type="text" placeholder="e.g., Sam Carter"></label>
    </div>
    <div class="chips"><button class="btn btn-ghost remove" type="button">Remove</button></div>`;
  card
    .querySelector(".remove")
    .addEventListener("click", () => card.remove());
  persList.appendChild(card);

  const input = card.querySelector('input[type="text"]');
  attachRemoteTypeahead(input, "PERSONNEL");
});

addTrip.addEventListener("click", () => {
  const card = document.createElement("div");
  card.className = "card";

  let yearInputs = "";
  for (let i = 1; i <= numYears; i++) {
    yearInputs += `<input type="number" placeholder="Y${i}" min="0" step="100" />`;
  }

  card.innerHTML = `
    <div class="row-flex">
      <label class="field"><span>Type</span>
        <select><option>Domestic</option><option>International</option></select>
      </label>
      <div class="field"><span>Year Budgets</span>
        <div class="year-grid">
          ${yearInputs}
        </div>
      </div>
    </div>
    <div class="chips"><button class="btn btn-ghost remove" type="button">Remove</button></div>`;
  card
    .querySelector(".remove")
    .addEventListener("click", () => card.remove());
  tripList.appendChild(card);
});

addCost.addEventListener("click", () => {
  if (costList.children.length >= 10)
    return alert("Maximum 10 cost items.");
  const card = document.createElement("div");
  card.className = "card";

  let yearInputs = "";
  for (let i = 1; i <= numYears; i++) {
    yearInputs += `<input name="amt" type="number" placeholder="Y${i}" min="0" step="100" />`;
  }

  card.innerHTML = `
    <div class="row-flex">
      <label class="field" style="grid-column:1 / -1;"><span>Cost item</span><input name="label" type="text" placeholder="e.g., Software, Materials, Publication fees"></label>
    </div>
    <div class="field"><span>Year Amounts</span>
      <div class="year-grid">
        ${yearInputs}
      </div>
    </div>
    <div class="chips"><button class="btn btn-ghost remove" type="button">Remove</button></div>`;
  card
    .querySelector(".remove")
    .addEventListener("click", () => card.remove());
  costList.appendChild(card);
});

// ======== BUTTONS ========
backBtn.addEventListener("click", () =>
  goToStep(currentStep - 1, "back")
);

nextBtn.addEventListener("click", () => {
  if (!validateStep()) return;
  if (currentStep === totalSteps) {
    buildReview();
    downloadExcel();
  } else {
    goToStep(currentStep + 1, "next");
  }
});

// clear wizard but keep logged-in user + saved budgets
function clearWizard() {
  currentBudgetId = null;
  Object.assign(data, {
    projectName: "",
    fundingAgency: "",
    pi: "",
    coPIs: [],
    personnel: [],
    fringe: [],
    trips: [],
    costs: []
  });
  numYears = 1;
  projectName.value = "";
  fundingAgency.value = "";
  piName.value = "";
  coPIList.innerHTML = "";
  persList.innerHTML = "";
  tripList.innerHTML = "";
  costList.innerHTML = "";
  if (fringeList) initFringeRows();
  syncAllYearInputs();
  goToStep(1, "back");
}

restartBtn.addEventListener("click", clearWizard);

// ======== YEAR CONTROL BUTTONS ========
if (yearAddBtn) {
  yearAddBtn.addEventListener("click", () => {
    if (numYears >= MAX_YEARS)
      return alert("Maximum of 5 years.");
    numYears += 1;
    syncAllYearInputs();
  });
}
if (yearRemoveBtn) {
  yearRemoveBtn.addEventListener("click", () => {
    if (numYears <= 1) return alert("At least 1 year is required.");
    numYears -= 1;
    syncAllYearInputs();
  });
}

// ======== AUTH HEADER ========
function getCurrentUserEmail() {
  return localStorage.getItem("gg_email") || "";
}

function initAuthUI() {
  const email = getCurrentUserEmail();
  if (!email) {
    // not logged in, go back to login page
    window.location.href = "login.html";
    return;
  }
  if (userEmailLabel) {
    userEmailLabel.textContent = email;
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("gg_email");
    localStorage.removeItem("gg_token");
    window.location.href = "login.html";
  });
}

// ======== SAVED BUDGETS ========
function loadAllBudgets() {
  try {
    return JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAllBudgets(list) {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(list));
}

function yearsLabel(n) {
  n = n || 1;
  return n === 1 ? "1 year" : `${n} years`;
}

function refreshSavedBudgetsUI() {
  if (!savedBlock || !savedList) return;
  const email = getCurrentUserEmail();
  if (!email) {
    savedBlock.style.display = "none";
    return;
  }
  savedBlock.style.display = "block";

  const all = loadAllBudgets().filter((b) => b.owner === email);
  if (!all.length) {
    savedList.innerHTML =
      '<p class="hint">No saved budgets yet. Save one from the Review step.</p>';
    return;
  }

  savedList.innerHTML = "";
  all
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .forEach((b) => {
      const div = document.createElement("div");
      div.className = "saved-row";
      const when = b.updatedAt || b.createdAt;
      const dateStr = when
        ? new Date(when).toLocaleString()
        : "";
      div.innerHTML = `
        <div class="saved-main">
          <div class="saved-title">${escapeHTML(b.name || "Untitled")}</div>
          <div class="saved-meta">${escapeHTML(
            b.agency || ""
          )} · ${yearsLabel(b.numYears)}</div>
          <div class="saved-date">${dateStr}</div>
        </div>
        <div class="saved-actions">
          <button class="btn btn-ghost btn-xs" data-id="${
            b.id
          }" data-act="load">Load</button>
          <button class="btn btn-ghost btn-xs" data-id="${
            b.id
          }" data-act="download">Download</button>
          <button class="btn btn-ghost btn-xs" data-id="${
            b.id
          }" data-act="delete">Delete</button>
        </div>
      `;
      savedList.appendChild(div);
    });
}

if (savedList) {
  savedList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const all = loadAllBudgets();
    const budget = all.find((b) => b.id === id);
    if (!budget) return;

    if (act === "delete") {
      if (!confirm("Delete this saved budget?")) return;
      const remaining = all.filter((b) => b.id !== id);
      saveAllBudgets(remaining);
      refreshSavedBudgetsUI();
    } else if (act === "load") {
      loadBudgetIntoWizard(budget);
    } else if (act === "download") {
      loadBudgetIntoWizard(budget);
      buildReview();
      downloadExcel();
    }
  });
}

if (refreshBudgetsBtn) {
  refreshBudgetsBtn.addEventListener("click", refreshSavedBudgetsUI);
}

// load a saved budget into the wizard for editing
function loadBudgetIntoWizard(budget) {
  if (!budget || !budget.data) return;
  const d = budget.data;
  currentBudgetId = budget.id || null;

  // clear UI but keep saved budgets
  projectName.value = "";
  fundingAgency.value = "";
  piName.value = "";
  coPIList.innerHTML = "";
  persList.innerHTML = "";
  tripList.innerHTML = "";
  costList.innerHTML = "";

  numYears = d.numYears || 1;
  if (fringeList) initFringeRows();
  syncAllYearInputs();

  projectName.value = d.projectName || "";
  fundingAgency.value = d.fundingAgency || "";
  piName.value = d.pi || "";

  // co-PIs
  (d.coPIs || []).forEach((c) => {
    addCoPI.click();
    const card = coPIList.lastElementChild;
    if (card) {
      card.querySelector("input").value = c.name || "";
    }
  });

  // personnel
  (d.personnel || []).forEach((p) => {
    addPers.click();
    const card = persList.lastElementChild;
    if (card) {
      card.querySelector("select").value = p.role || "UI Professional Staff";
      card.querySelector("input").value = p.name || "";
    }
  });

  // fringe
  (d.fringe || []).forEach((f) => {
    const card = fringeList.querySelector(
      `.fringe-row[data-category="${f.category}"]`
    );
    if (!card) return;
    const inputs = card.querySelectorAll("input");
    const vals = [f.y1, f.y2, f.y3, f.y4, f.y5];
    for (let i = 0; i < Math.min(numYears, inputs.length); i++) {
      inputs[i].value = vals[i] || 0;
    }
  });

  // trips
  (d.trips || []).forEach((t) => {
    addTrip.click();
    const card = tripList.lastElementChild;
    if (!card) return;
    card.querySelector("select").value = t.type || "Domestic";
    const inputs = card.querySelectorAll("input");
    const vals = [t.y1, t.y2, t.y3, t.y4, t.y5];
    for (let i = 0; i < Math.min(numYears, inputs.length); i++) {
      inputs[i].value = vals[i] || 0;
    }
  });

  // costs
  (d.costs || []).forEach((c) => {
    addCost.click();
    const card = costList.lastElementChild;
    if (!card) return;
    card.querySelector('input[name="label"]').value = c.label || "";
    const inputs = card.querySelectorAll('input[name="amt"]');
    const vals = [c.y1, c.y2, c.y3, c.y4, c.y5];
    for (let i = 0; i < Math.min(numYears, inputs.length); i++) {
      inputs[i].value = vals[i] || 0;
    }
  });

  goToStep(1, "back");
}

// save button in Review step
if (saveBudgetBtn) {
  saveBudgetBtn.addEventListener("click", () => {
    const email = getCurrentUserEmail();
    if (!email) {
      alert("Please sign in again.");
      return;
    }
    if (!data.projectName) {
      alert("Please enter a project title before saving.");
      return;
    }

    const all = loadAllBudgets();
    const now = Date.now();

    const payload = {
      projectName: data.projectName,
      fundingAgency: data.fundingAgency,
      pi: data.pi,
      coPIs: data.coPIs,
      personnel: data.personnel,
      fringe: data.fringe,
      trips: data.trips,
      costs: data.costs,
      numYears
    };

    if (currentBudgetId) {
      const idx = all.findIndex(
        (b) => b.id === currentBudgetId && b.owner === email
      );
      if (idx >= 0) {
        all[idx] = {
          ...all[idx],
          name: payload.projectName,
          agency: payload.fundingAgency,
          numYears,
          data: payload,
          updatedAt: now
        };
      } else {
        currentBudgetId = null;
      }
    }

    if (!currentBudgetId) {
      const id = "b" + now;
      currentBudgetId = id;
      all.push({
        id,
        owner: email,
        name: payload.projectName,
        agency: payload.fundingAgency,
        numYears,
        data: payload,
        createdAt: now,
        updatedAt: now
      });
    }

    saveAllBudgets(all);
    if (saveBudgetMsg) {
      saveBudgetMsg.textContent = "Budget saved.";
      setTimeout(() => {
        saveBudgetMsg.textContent = "";
      }, 2000);
    }
    refreshSavedBudgetsUI();
  });
}

// ======== INIT ========
initFringeRows();
syncAllYearInputs();
updateProgress();
updateButtons();
initAuthUI();
refreshSavedBudgetsUI();
