import {createCalculator, HOLE_LETTERS, SHAFT_LETTERS} from './engine.799c670a72b9.mjs';
const $ = id => document.getElementById(id);
const size = $('size'), hole = $('hole'), shaft = $('shaft');
const grades = [5,6,7,8,9,10,11,12,13];
for (const [select,letters] of [[hole,HOLE_LETTERS],[shaft,SHAFT_LETTERS]]) {
  for (const letter of letters) {
    const group = document.createElement('optgroup'); group.label = letter + ' zone';
    for (const grade of grades) {const option = document.createElement('option'); option.value = option.textContent = letter + grade; group.append(option);}
    select.append(group);
  }
}
hole.value = 'H7'; shaft.value = 'g6';
let calculator, current, unit = 'mm', copyToken = 0;
const sign = n => n > 0 ? '+' : n < 0 ? '−' : '';
const decimal = n => String(Number(Math.abs(n).toFixed(3)));
const deviation = n => sign(n) + (unit === 'mm' ? (Math.abs(n) / 1000).toFixed(4).replace(/0$/,'') : decimal(n));
const value = n => unit === 'mm' ? n.toFixed(4).replace(/0$/,'') : decimal(n * 1000);
const magnitude = n => unit === 'mm' ? (n / 1000).toFixed(4).replace(/0$/,'') : decimal(n);
const labelUnit = () => unit === 'mm' ? 'mm' : 'µm';
const zoneValue = n => sign(n) + decimal(n);
function drawDiagram(result) {
  const min = Math.min(result.hole.lower,result.shaft.lower,0), max = Math.max(result.hole.upper,result.shaft.upper,0);
  const raw = (max - min) / 4;
  const factor = 10 ** Math.floor(Math.log10(raw));
  const step = [1,2,5,10].find(n => n * factor >= raw) * factor;
  const lo = Math.floor(min / step) * step - step * .55, hi = Math.ceil(max / step) * step + step * .55;
  const y = n => 43 + (hi - n) / (hi - lo) * 155;
  let grid = '';
  for (let n=Math.ceil(lo/step)*step;n<=hi;n+=step) {
    const zero = Math.abs(n) < 1e-8;
    grid += `<line x1="66" x2="602" y1="${y(n)}" y2="${y(n)}" stroke="${zero?'#7c8b71':'#edf0e7'}" ${zero?'stroke-dasharray="5 4"':''}/><text x="49" y="${y(n)+3}" text-anchor="end" fill="#89947f" font-size="10">${zoneValue(n)}</text>`;
  }
  let zones = '';
  for (const [feature,x,color,fill] of [[result.hole,180,'#3979ae','#dceaf5'],[result.shaft,410,'#b47733','#f5e6d4']]) {
    const top = y(feature.upper), bottom = y(feature.lower), middle=(top+bottom)/2;
    const upperLabel=Math.min(top-6,middle-8), lowerLabel=Math.max(bottom+13,middle+16);
    zones += `<text x="${x+39}" y="25" text-anchor="middle" fill="${color}" font-size="13" font-weight="600">${feature.code}</text><rect x="${x}" y="${top}" width="78" height="${bottom-top}" fill="${fill}" stroke="${color}" stroke-width="1.5"/><line x1="${x+83}" x2="${x+94}" y1="${top}" y2="${top}" stroke="${color}"/><line x1="${x+83}" x2="${x+94}" y1="${bottom}" y2="${bottom}" stroke="${color}"/><text x="${x+100}" y="${upperLabel}" fill="${color}" font-size="11">${zoneValue(feature.upper)}</text><text x="${x+100}" y="${lowerLabel}" fill="${color}" font-size="11">${zoneValue(feature.lower)}</text>`;
  }
  $('diagram').innerHTML = `<svg viewBox="0 0 640 239" role="img" aria-labelledby="chart-title chart-desc" xmlns="http://www.w3.org/2000/svg"><title id="chart-title">${result.hole.code} hole and ${result.shaft.code} shaft tolerance zones</title><desc id="chart-desc">Deviations in micrometres. Hole ${result.hole.lower} to ${result.hole.upper}. Shaft ${result.shaft.lower} to ${result.shaft.upper}. The dashed horizontal line is the basic size.</desc><g font-family="ui-monospace, Consolas, monospace">${grid}${zones}<text x="66" y="229" fill="#89947f" font-size="9">BASIC SIZE ⌀${result.size} mm · ZERO DEVIATION AT DASHED LINE</text></g></svg>`;
}
function render() {
  if (!current) return;
  const r = current;
  $('fit-title').textContent = `${r.size} ${r.hole.code}/${r.shaft.code}`;
  $('fit-type').textContent = `${r.type[0].toUpperCase()+r.type.slice(1)} fit`;
  $('fit-summary').className = 'fit-summary ' + r.type;
  $('fit-description').textContent = {clearance:'The hole is always at least as large as the shaft.',transition:'Clearance or interference can occur.',interference:'The shaft is always at least as large as the hole.'}[r.type];
  let low=r.minClearance, high=r.maxClearance;
  if (r.type === 'interference') {low=-r.maxClearance; high=-r.minClearance;}
  $('range-label').textContent = r.type === 'transition' ? 'SIGNED CLEARANCE RANGE' : r.type.toUpperCase() + ' RANGE';
  $('range-value').textContent = r.type === 'transition' ? `${deviation(low)} to ${deviation(high)} ${labelUnit()}` : `${magnitude(low)}–${magnitude(high)} ${labelUnit()}`;
  $('limits').innerHTML = [r.hole,r.shaft].map(f=>`<tr><td><i class="dot ${f.kind}-dot"></i>${f.code}</td><td>${deviation(f.lower)}</td><td>${deviation(f.upper)}</td><td>${value(f.min)}</td><td>${value(f.max)}</td></tr>`).join('');
  $('table-unit').textContent = `All values in ${labelUnit()}`;
  $('result-footnote').textContent = `Tolerance width: hole ${magnitude(r.hole.width)} ${labelUnit()} · shaft ${magnitude(r.shaft.width)} ${labelUnit()}. Limits are based on the selected basic size.`;
  for (const b of document.querySelectorAll('[data-unit]')) b.setAttribute('aria-pressed',String(b.dataset.unit===unit));
  for (const b of document.querySelectorAll('[data-hole]')) b.setAttribute('aria-pressed',String(b.dataset.hole===hole.value && b.dataset.shaft===shaft.value));
  drawDiagram(r);
}
function invalidate(message) {
  current = null; copyToken++;
  $('copy').disabled = true; $('result-body').hidden = true;
  $('fit-title').textContent = 'Check your inputs'; $('error').textContent = message;
  $('copy-status').textContent = ''; $('loading').hidden=true;
}
function calculate({updateUrl=true}={}) {
  if (!calculator) return;
  try {
    if (!size.value.trim()) throw new RangeError('Enter a basic size from 1 to 500 mm.');
    current = calculator.fit(Number(size.value),hole.value,shaft.value);
    size.removeAttribute('aria-invalid'); $('error').textContent = '';
    $('copy-status').textContent = ''; $('copy').disabled=false; $('result-body').hidden=false;
    $('loading').hidden = true;
    copyToken++;
    render();
    if (updateUrl) {
      const url=new URL(location.href); url.search='';
      url.searchParams.set('size',current.size);url.searchParams.set('hole',hole.value);url.searchParams.set('shaft',shaft.value);
      history.replaceState(null,'',url);
    }
  } catch (error) {invalidate(error.message); size.setAttribute('aria-invalid','true');}
}
$('fit-form').addEventListener('submit',e=>{e.preventDefault();calculate();});
size.addEventListener('input',()=>calculate());
for (const select of [hole,shaft]) select.addEventListener('change',()=>calculate());
for (const b of document.querySelectorAll('[data-hole]')) b.addEventListener('click',()=>{hole.value=b.dataset.hole;shaft.value=b.dataset.shaft;calculate();});
for (const b of document.querySelectorAll('[data-unit]')) b.addEventListener('click',()=>{unit=b.dataset.unit;render();});
$('copy').addEventListener('click',async()=>{
  if (!current) return;
  const r=current, token=copyToken;
  const text=[`ISO 286 metric fit: ${r.size} ${r.hole.code}/${r.shaft.code}`,`${r.type} fit`,...['hole','shaft'].map(key=>{const f=r[key];return `${key} ${f.code}: ${f.min.toFixed(4)} to ${f.max.toFixed(4)} mm; deviations ${zoneValue(f.lower)} to ${zoneValue(f.upper)} µm`;}),`Signed clearance: ${zoneValue(r.minClearance)} to ${zoneValue(r.maxClearance)} µm`,'Calculation references: ISO 286-1:2010 / ISO 286-2:2010'].join('\n');
  try {await navigator.clipboard.writeText(text);if(token===copyToken)$('copy-status').textContent='Result copied.';}
  catch {if(token===copyToken)$('copy-status').textContent='Copy is unavailable in this browser. You can select the values in the table.';}
});
try {
  const response=await fetch(new URL('./iso286.08d4546346d6.json', import.meta.url));
  if (!response.ok) throw new Error('The calculator data could not be loaded. Reload this page.');
  calculator=createCalculator(await response.json());
  $('calculate').disabled=false;
  const params=new URL(location.href).searchParams;
  if (['size','hole','shaft'].some(key=>params.has(key))) {
    for(const key of ['size','hole','shaft']) if(params.getAll(key).length!==1) throw new Error('This query link is incomplete or contains duplicate parameters. Choose a size and both classes.');
    const n=params.get('size');
    if (!/^\d+(?:\.\d{1,3})?$/.test(n)) throw new Error('This query link has an invalid basic size. Enter a size from 1 to 500 mm.');
    // Validate before assigning to selects; do not silently substitute defaults.
    calculator.fit(Number(n),params.get('hole'),params.get('shaft'));
    size.value=n;hole.value=params.get('hole');shaft.value=params.get('shaft');
  }
  calculate({updateUrl:false});
} catch(error) {invalidate(error.message || 'The calculator could not start. Reload this page.');}
finally {$('results').setAttribute('aria-busy','false');}
