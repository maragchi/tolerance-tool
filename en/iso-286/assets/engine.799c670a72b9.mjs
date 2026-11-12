// Pure numerical engine. All deviations are in micrometres; sizes are in mm.
// Numerical inputs are separate from standards-cross-reference approval records.
export const HOLE_LETTERS = ['D', 'E', 'F', 'G', 'H', 'JS', 'K', 'M', 'N', 'P', 'R', 'S'];
export const SHAFT_LETTERS = HOLE_LETTERS.map(x => x.toLowerCase());
const clean = n => Object.is(n, -0) ? 0 : n;
export function createCalculator(data) {
  function rangeIndex(size, ranges) {
    return ranges.findIndex(([min, max]) => size > min && size <= max);
  }
  function validateSize(size) {
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 1 || size > 500)
      throw new RangeError('Enter a basic size from 1 to 500 mm.');
    if (Math.abs(size * 1000 - Math.round(size * 1000)) > 1e-7)
      throw new RangeError('Use no more than three decimal places for the basic size.');
  }
  function width(size, grade) {
    return data.it['IT' + grade][rangeIndex(size, data.coarse_ranges)];
  }
  function tolerance(size, code, kind) {
    validateSize(size);
    if (!['hole', 'shaft'].includes(kind)) throw new TypeError('Choose hole or shaft.');
    if (typeof code !== 'string') throw new TypeError('Choose a tolerance class.');
    const match = /^(JS|[DEFGHKMNPRS]|js|[defghkmnprs])(5|6|7|8|9|10|11|12|13)$/.exec(code);
    if (!match || !(kind === 'hole' ? HOLE_LETTERS : SHAFT_LETTERS).includes(match[1]))
      throw new RangeError('Unsupported ' + kind + ' class. Use the available selections.');
    const letter = match[1].toLowerCase(), grade = Number(match[2]);
    if (letter === 'n' && kind === 'hole' && grade > 8 && size <= 1)
      throw new RangeError('N9–N13 are not defined at 1 mm in this implementation.');
    const it = width(size, grade);
    let upper, lower;
    if (letter === 'js') { upper = it / 2; lower = -it / 2; }
    else if (letter === 'h') {
      upper = kind === 'hole' ? it : 0; lower = kind === 'hole' ? 0 : -it;
    } else {
      const base = data.shaft_deviations[letter][rangeIndex(size, data.fine_ranges)];
      if (['d', 'e', 'f', 'g'].includes(letter)) {
        if (kind === 'hole') { lower = -base; upper = lower + it; }
        else { upper = base; lower = upper - it; }
      } else if (kind === 'shaft') {
        lower = letter === 'k' && grade >= 8 ? 0 : base;
        upper = lower + it;
      } else {
        // ISO 286-1:2010, tables 2/3. K/M/N use delta through IT8;
        // P/R/S through IT7. At <=3 mm delta is zero, and K has ES=0.
        const deltaApplies = ['k', 'm', 'n'].includes(letter) ? grade <= 8 : grade <= 7;
        const delta = size > 3 && deltaApplies ? it - width(size, grade - 1) : 0;
        upper = -base + delta;
        if (letter === 'k' && (size <= 3 || grade > 8)) upper = 0;
        if (letter === 'n' && grade > 8) upper = size <= 3 ? -4 : 0;
        // Explicit table 2 exception, not the generic -m + delta value.
        if (letter === 'm' && grade === 6 && size > 250 && size <= 315) upper = -9;
        lower = upper - it;
      }
    }
    upper = clean(upper); lower = clean(lower);
    return {code, kind, grade, upper, lower, width: it,
      min: +(size + lower / 1000).toFixed(6), max: +(size + upper / 1000).toFixed(6)};
  }
  function fit(size, holeCode, shaftCode) {
    const hole = tolerance(size, holeCode, 'hole'), shaft = tolerance(size, shaftCode, 'shaft');
    const minClearance = clean(hole.lower - shaft.upper);
    const maxClearance = clean(hole.upper - shaft.lower);
    const type = minClearance >= 0 ? 'clearance' : maxClearance <= 0 ? 'interference' : 'transition';
    return {size, hole, shaft, minClearance, maxClearance, type};
  }
  return Object.freeze({tolerance, fit});
}
