// ======== STATE ========
let currentStep = 1;
const totalSteps = 6;

const data = {
  projectName: '',
  fundingAgency: '',
  pi: '',
  coPIs: [],           // [{ name }]
  personnel: [],       // [{ role, name }]
  trips: [],           // [{ type, y1..y5 }]
  costs: []            // [{ label, y1..y5 }]
};

// ======== ELEMENTS ========


const milestones = Array.from(document.querySelectorAll('.milestone'));
const progressFill = document.getElementById('progressFill');

const nextBtn    = document.getElementById('nextBtn');
const backBtn    = document.getElementById('backBtn');
const restartBtn = document.getElementById('restartBtn');

const stepEl = n => document.getElementById(`step-${n}`);

// Step 1
const projectName = document.getElementById('projectName');
const fundingAgency = document.getElementById('fundingAgency');

// Step 2
const piName   = document.getElementById('piName');
const addCoPI  = document.getElementById('addCoPI');
const coPIList = document.getElementById('coPIList');

// Step 3
const addPers  = document.getElementById('addPers');
const persList = document.getElementById('persList');

// Step 4
const addTrip  = document.getElementById('addTrip');
const tripList = document.getElementById('tripList');

// Step 5
const addCost  = document.getElementById('addCost');
const costList = document.getElementById('costList');

// Step 6 outputs
const outProj   = document.getElementById('outProj');
const outAgency = document.getElementById('outAgency');
const outPI     = document.getElementById('outPI');
const outCoPIs  = document.getElementById('outCoPIs');
const outPers   = document.getElementById('outPers');
const outTrips  = document.getElementById('outTrips');
const outCosts  = document.getElementById('outCosts');
const excelTable = document.getElementById('excelTable');


// ================== ADDED: Remote Typeahead Helper ==================
const API_BASE = window.API_BASE || "https://grant-grid.onrender.com";; // change if your API runs on another port

function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function attachRemoteTypeahead(inputEl, role) {
  if (!inputEl) return;
  const field = inputEl.closest('.field') || inputEl.parentElement;
  field.classList.add('ta-wrap');
  const list = document.createElement('div');
  list.className = 'ta-list';
  field.appendChild(list);

  async function search(q) {
    const url = new URL(API_BASE + '/api/people');
    url.searchParams.set('role', role);
    if (q) url.searchParams.set('q', q);
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json(); // [{id, name}]
  }

  function render(items) {
    list.innerHTML = items.length
      ? items.map(p => `<div class="ta-item" data-id="${p.id}">${p.name}</div>`).join('')
      : `<div class="ta-item ta-empty">No matches</div>`;
    list.style.display = 'block';
    list.querySelectorAll('.ta-item').forEach(el => {
      if (el.classList.contains('ta-empty')) return;
      el.addEventListener('click', () => {
        inputEl.value = el.textContent;
        inputEl.dataset.personId = el.dataset.id; // keep DB id (non-breaking)
        list.style.display = 'none';
      });
    });
  }

  const doSearch = debounce(async () => {
    const items = await search(inputEl.value.trim());
    render(items);
  }, 180);

  inputEl.addEventListener('input', doSearch);
  inputEl.addEventListener('focus', doSearch);
  document.addEventListener('click', e => {
    if (!field.contains(e.target)) list.style.display = 'none';
  });
}

// Attach to the PI input immediately
attachRemoteTypeahead(piName, 'PI');
// ================== /ADDED ==================



// ======== NAV + UI ========
function goToStep(target, dir){
  if (target < 1 || target > totalSteps) return;

  const out = stepEl(currentStep);
  const inc = stepEl(target);
  inc.classList.add('step-active');

  if (dir === 'next') {
    out.classList.remove('slide-in-left','slide-in-right');
    out.classList.add('slide-out-left');
    inc.classList.remove('slide-out-left','slide-out-right');
    inc.classList.add('slide-in-right');
  } else {
    out.classList.remove('slide-in-left','slide-in-right');
    out.classList.add('slide-out-right');
    inc.classList.remove('slide-out-left','slide-out-right');
    inc.classList.add('slide-in-left');
  }
  const onEnd = ()=>{ out.classList.remove('step-active','slide-out-left','slide-out-right'); out.removeEventListener('animationend', onEnd); };
  out.addEventListener('animationend', onEnd);

  currentStep = target;
  updateProgress();
  updateButtons();

  if (currentStep === 6) buildReview();
}

function updateProgress(){
  const pct = (currentStep - 1) / (totalSteps - 1) * 100;
  progressFill.style.width = `${pct}%`;
  milestones.forEach(m => {
    const s = Number(m.dataset.step);
    if (currentStep >= s) m.classList.add('active'); else m.classList.remove('active');
  });
}
function updateButtons(){
  backBtn.disabled = currentStep === 1;
  nextBtn.textContent = currentStep === totalSteps ? 'Generate Budget Excel' : 'Next';
}

// ======== VALIDATION / CAPTURE ========
function validateStep(){
  switch(currentStep){
    case 1:
      if (!projectName.value.trim() || !fundingAgency.value.trim()){
        alert('Please enter Project title and Funding source.');
        return false;
      }
      data.projectName = projectName.value.trim();
      data.fundingAgency = fundingAgency.value.trim();
      return true;

    case 2:
      if (!piName.value.trim()){
        alert('Please enter the PI name.');
        return false;
      }
      data.pi = piName.value.trim();
      data.coPIs = Array.from(coPIList.querySelectorAll('input')).map(i => ({ name: i.value.trim() })).filter(x => x.name);
      return true;

    case 3:
      data.personnel = [];
      persList.querySelectorAll('.card').forEach(card => {
        const role = card.querySelector('select').value;
        const name = card.querySelector('input').value.trim();
        if (name) data.personnel.push({ role, name });
      });
      return true;

    case 4:
      data.trips = [];
      tripList.querySelectorAll('.card').forEach(card => {
        const type = card.querySelector('select').value;
        const years = Array.from(card.querySelectorAll('input')).map(i => Number(i.value || 0));
        const [y1,y2,y3,y4,y5] = years;
        data.trips.push({ type, y1,y2,y3,y4,y5 });
      });
      return true;

    case 5:
      data.costs = [];
      costList.querySelectorAll('.card').forEach(card => {
        const label = card.querySelector('input[name="label"]').value.trim();
        const nums = Array.from(card.querySelectorAll('input[name="amt"]')).map(i => Number(i.value || 0));
        const [y1,y2,y3,y4,y5] = nums;
        if (label) data.costs.push({ label, y1,y2,y3,y4,y5 });
      });
      return true;

    default:
      return true;
  }
}

// ======== REVIEW + EXPORT ========
function buildReview(){
  outProj.textContent   = data.projectName || '—';
  outAgency.textContent = data.fundingAgency || '—';
  outPI.textContent     = data.pi || '—';

  // Co-PIs
  outCoPIs.innerHTML = '';
  if (data.coPIs.length === 0) {
    outCoPIs.innerHTML = '<div class="row"><span class="k">Co-PIs</span><span class="v">None</span></div>';
  } else {
    data.coPIs.forEach((c,idx)=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="k">Co-PI ${idx+1}</span><span class="v">${escapeHTML(c.name)}</span>`;
      outCoPIs.appendChild(row);
    });
  }

  // Personnel
  outPers.innerHTML = '';
  if (data.personnel.length === 0) {
    outPers.innerHTML = '<div class="row"><span class="k">Personnel</span><span class="v">None</span></div>';
  } else {
    data.personnel.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="k">${escapeHTML(p.role)}</span><span class="v">${escapeHTML(p.name)}</span>`;
      outPers.appendChild(row);
    });
  }

  // Trips
  outTrips.innerHTML = '';
  const tripsTable = document.createElement('div');
  tripsTable.className='summary';
  if (data.trips.length === 0){
    tripsTable.innerHTML = '<div class="row">No trips added</div>';
  } else {
    tripsTable.innerHTML = `
      <div class="head" style="display:grid;grid-template-columns:2fr repeat(5,1fr);gap:10px;">
        <div>Type</div><div>Y1</div><div>Y2</div><div>Y3</div><div>Y4</div><div>Y5</div>
      </div>
      ${data.trips.map(t=>`
        <div class="row" style="display:grid;grid-template-columns:2fr repeat(5,1fr);gap:10px;">
          <div>${escapeHTML(t.type)}</div>
          <div>${fmt(t.y1)}</div><div>${fmt(t.y2)}</div><div>${fmt(t.y3)}</div><div>${fmt(t.y4)}</div><div>${fmt(t.y5)}</div>
        </div>`).join('')}
    `;
  }
  outTrips.appendChild(tripsTable);

  // Costs
  outCosts.innerHTML = '';
  const costsTable = document.createElement('div');
  costsTable.className='summary';
  if (data.costs.length === 0){
    costsTable.innerHTML = '<div class="row">No other costs added</div>';
  } else {
    costsTable.innerHTML = `
      <div class="head" style="display:grid;grid-template-columns:2fr repeat(5,1fr);gap:10px;">
        <div>Item</div><div>Y1</div><div>Y2</div><div>Y3</div><div>Y4</div><div>Y5</div>
      </div>
      ${data.costs.map(c=>`
        <div class="row" style="display:grid;grid-template-columns:2fr repeat(5,1fr);gap:10px;">
          <div>${escapeHTML(c.label)}</div>
          <div>${fmt(c.y1)}</div><div>${fmt(c.y2)}</div><div>${fmt(c.y3)}</div><div>${fmt(c.y4)}</div><div>${fmt(c.y5)}</div>
        </div>`).join('')}
    `;
  }
  outCosts.appendChild(costsTable);

  buildExcelTable();
}

function fmt(n){ return n ? currency(n) : '—'; }
function currency(n){
  try{ return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n); }
  catch{ return `$${Number(n).toLocaleString()}`; }
}
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---- Excel: builds ONLY <tr> rows inside #excelTable to avoid syntax issues
function buildExcelTable(){
  const H  = t => `<th style="border:1px solid #000;padding:6px;background:#eee">${String(t)}</th>`;
  const TD = t => `<td style="border:1px solid #000;padding:6px">${String(t)}</td>`;
  const SEP = `<tr><td style="height:10px" colspan="7"></td></tr>`;

  // numeric section totals
  const sum5 = (a,b)=>({y1:a.y1+b.y1, y2:a.y2+b.y2, y3:a.y3+b.y3, y4:a.y4+b.y4, y5:a.y5+b.y5});
  const z5 = {y1:0,y2:0,y3:0,y4:0,y5:0};

  const tripsTotals = data.trips.reduce((acc,t)=>sum5(acc,{
    y1:+(t.y1||0), y2:+(t.y2||0), y3:+(t.y3||0), y4:+(t.y4||0), y5:+(t.y5||0)
  }), z5);

  const costsTotals = data.costs.reduce((acc,c)=>sum5(acc,{
    y1:+(c.y1||0), y2:+(c.y2||0), y3:+(c.y3||0), y4:+(c.y4||0), y5:+(c.y5||0)
  }), z5);

  const totalByYear = sum5(tripsTotals, costsTotals);
  const grandTotal = totalByYear.y1 + totalByYear.y2 + totalByYear.y3 + totalByYear.y4 + totalByYear.y5;

  let rows = "";

  rows += `<tr><td colspan="7" style="font-weight:bold;font-size:16px">Grant-Grid Budget</td></tr>`;
  rows += `<tr><td colspan="7">Title: ${escapeHTML(data.projectName)} &nbsp;|&nbsp; Funding: ${escapeHTML(data.fundingAgency)}</td></tr>`;
  rows += `<tr><td colspan="7">PI: ${escapeHTML(data.pi)}</td></tr>`;
  rows += SEP;

  // Co-PIs
  rows += `<tr><td colspan="7" style="font-weight:bold;background:#ddd;border:1px solid #000">Co-PIs</td></tr>`;
  if (data.coPIs.length){
    data.coPIs.forEach(c=>{
      rows += `<tr>${TD(escapeHTML(c.name))}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}</tr>`;
  }

  rows += SEP;

  // Other Personnel
  rows += `<tr><td colspan="7" style="font-weight:bold;background:#ddd;border:1px solid #000">Other Personnel</td></tr>`;
  if (data.personnel.length){
    data.personnel.forEach(p=>{
      rows += `<tr>${TD(escapeHTML(p.role))}${TD(escapeHTML(p.name))}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}</tr>`;
  }

  rows += SEP;

  // Travel
  rows += `<tr><td colspan="7" style="font-weight:bold;background:#ddd;border:1px solid #000">Travel</td></tr>`;
  rows += `<tr>${H('Type')}${H('Y1')}${H('Y2')}${H('Y3')}${H('Y4')}${H('Y5')}${H('Total')}</tr>`;
  if (data.trips.length){
    data.trips.forEach(t=>{
      const rowTotal = +(t.y1||0)+(t.y2||0)+(t.y3||0)+(t.y4||0)+(t.y5||0);
      rows += `<tr>${TD(escapeHTML(t.type))}${TD(t.y1||0)}${TD(t.y2||0)}${TD(t.y3||0)}${TD(t.y4||0)}${TD(t.y5||0)}${TD(rowTotal)}</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}</tr>`;
  }
  rows += `<tr style="font-weight:bold;background:#f5f5f5">${TD('Travel Total')}${TD(tripsTotals.y1)}${TD(tripsTotals.y2)}${TD(tripsTotals.y3)}${TD(tripsTotals.y4)}${TD(tripsTotals.y5)}${TD(tripsTotals.y1+tripsTotals.y2+tripsTotals.y3+tripsTotals.y4+tripsTotals.y5)}</tr>`;

  rows += SEP;

  // Other Direct Costs
  rows += `<tr><td colspan="7" style="font-weight:bold;background:#ddd;border:1px solid #000">Other Direct Costs</td></tr>`;
  rows += `<tr>${H('Item')}${H('Y1')}${H('Y2')}${H('Y3')}${H('Y4')}${H('Y5')}${H('Total')}</tr>`;
  if (data.costs.length){
    data.costs.forEach(c=>{
      const rowTotal = +(c.y1||0)+(c.y2||0)+(c.y3||0)+(c.y4||0)+(c.y5||0);
      rows += `<tr>${TD(escapeHTML(c.label))}${TD(c.y1||0)}${TD(c.y2||0)}${TD(c.y3||0)}${TD(c.y4||0)}${TD(c.y5||0)}${TD(rowTotal)}</tr>`;
    });
  } else {
    rows += `<tr>${TD("None")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}${TD("")}</tr>`;
  }
  rows += `<tr style="font-weight:bold;background:#f5f5f5">${TD('Other Costs Total')}${TD(costsTotals.y1)}${TD(costsTotals.y2)}${TD(costsTotals.y3)}${TD(costsTotals.y4)}${TD(costsTotals.y5)}${TD(costsTotals.y1+costsTotals.y2+costsTotals.y3+costsTotals.y4+costsTotals.y5)}</tr>`;

  rows += SEP;

  // Totals by year + grand total
  rows += `<tr style="font-weight:bold;background:#cfe8ff">
    ${TD('TOTAL BY YEAR')}
    ${TD(totalByYear.y1)}${TD(totalByYear.y2)}${TD(totalByYear.y3)}${TD(totalByYear.y4)}${TD(totalByYear.y5)}
    ${TD(grandTotal)}
  </tr>`;

  excelTable.innerHTML = rows;
}

function downloadExcel(){
  // Excel-compatible HTML -> .xls
  const blob = new Blob([`<html><head><meta charset="UTF-8"></head><body>${excelTable.outerHTML}</body></html>`], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grant-grid-budget.xls';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

// ======== DYNAMIC ROWS ========
addCoPI.addEventListener('click', ()=>{
  if (coPIList.children.length >= 5) return alert('Maximum 5 Co-PIs.');
  const card = document.createElement('div');
  card.className='card';
  card.innerHTML = `
    <div class="row-flex">
      <label class="field"><span>Co-PI name</span><input type="text" placeholder="e.g., Dr. Lee"></label>
      <div class="chips"><span class="chip">Co-PI</span><button class="btn btn-ghost remove" type="button">Remove</button></div>
    </div>`;
  card.querySelector('.remove').addEventListener('click', ()=> card.remove());
  coPIList.appendChild(card);

  // ======== ADDED: hook DB typeahead for this new input ========
  const input = card.querySelector('input');
  attachRemoteTypeahead(input, 'CO_PI');
  // =============================================================
});

addPers.addEventListener('click', ()=>{
  if (persList.children.length >= 5) return alert('Maximum 5 personnel.');
  const card = document.createElement('div');
  card.className='card';
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
  card.querySelector('.remove').addEventListener('click', ()=> card.remove());
  persList.appendChild(card);

  // ======== ADDED: hook DB typeahead for this new input ========
  const input = card.querySelector('input[type="text"]');
  attachRemoteTypeahead(input, 'PERSONNEL');
  // =============================================================
});

addTrip.addEventListener('click', ()=>{
  const card = document.createElement('div');
  card.className='card';
  card.innerHTML = `
    <div class="row-flex">
      <label class="field"><span>Type</span>
        <select><option>Domestic</option><option>International</option></select>
      </label>
      <div class="field"><span>Year 1–5 Budgets</span>
        <div class="year-grid">
          <input type="number" placeholder="Y1" min="0" step="100" />
          <input type="number" placeholder="Y2" min="0" step="100" />
          <input type="number" placeholder="Y3" min="0" step="100" />
          <input type="number" placeholder="Y4" min="0" step="100" />
          <input type="number" placeholder="Y5" min="0" step="100" />
        </div>
      </div>
    </div>
    <div class="chips"><button class="btn btn-ghost remove" type="button">Remove</button></div>`;
  card.querySelector('.remove').addEventListener('click', ()=> card.remove());
  tripList.appendChild(card);
});

addCost.addEventListener('click', ()=>{
  if (costList.children.length >= 10) return alert('Maximum 10 cost items.');
  const card = document.createElement('div');
  card.className='card';
  card.innerHTML = `
    <div class="row-flex">
      <label class="field" style="grid-column:1 / -1;"><span>Cost item</span><input name="label" type="text" placeholder="e.g., Software, Materials, Publication fees"></label>
    </div>
    <div class="field"><span>Year 1–5 Amounts</span>
      <div class="year-grid">
        <input name="amt" type="number" placeholder="Y1" min="0" step="100" />
        <input name="amt" type="number" placeholder="Y2" min="0" step="100" />
        <input name="amt" type="number" placeholder="Y3" min="0" step="100" />
        <input name="amt" type="number" placeholder="Y4" min="0" step="100" />
        <input name="amt" type="number" placeholder="Y5" min="0" step="100" />
      </div>
    </div>
    <div class="chips"><button class="btn btn-ghost remove" type="button">Remove</button></div>`;
  card.querySelector('.remove').addEventListener('click', ()=> card.remove());
  costList.appendChild(card);
});

// ======== BUTTONS ========
backBtn.addEventListener('click', ()=> goToStep(currentStep-1,'back'));

nextBtn.addEventListener('click', ()=>{
  if (!validateStep()) return;
  if (currentStep === totalSteps){
    buildReview();
    downloadExcel();
  } else {
    goToStep(currentStep+1,'next');
  }
});

restartBtn.addEventListener('click', ()=>{
  Object.assign(data, { projectName:'', fundingAgency:'', pi:'', coPIs:[], personnel:[], trips:[], costs:[] });
  projectName.value=''; fundingAgency.value='';
  piName.value='';
  coPIList.innerHTML=''; persList.innerHTML=''; tripList.innerHTML=''; costList.innerHTML='';
  goToStep(1,'back');
});

// Init
updateProgress(); updateButtons();
