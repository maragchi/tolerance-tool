/* ISO 286 / GB/T 1800 公差计算
 * 数据表与计算函数从 /fit/index.html 原样抽出，供公差配合查询与公差反查共用。
 * 数值不要在这边单独改；改表请与 /fit/ 一并核对。
 */
(function (root) {
  'use strict';

  var SIZE_MIN = 1;
  var SIZE_MAX = 500;

  var IT = {
    IT5:  [4,5,6,8,9,11,13,15,18,20,23,25,27],
    IT6:  [6,8,9,11,13,16,19,22,25,29,32,36,40],
    IT7:  [10,12,15,18,21,25,30,35,40,46,52,57,63],
    IT8:  [14,18,22,27,33,39,46,54,63,72,81,89,97],
    IT9:  [25,30,36,43,52,62,74,87,100,115,130,140,155],
    IT10: [40,48,58,70,84,100,120,140,160,185,210,230,250],
    IT11: [60,75,90,110,130,160,190,220,250,290,320,360,400],
    IT12: [100,120,150,180,210,250,300,350,400,460,520,570,630],
    IT13: [140,180,220,270,330,390,460,540,630,720,810,890,970]
  };

  var COARSE = [
    [0,3],[3,6],[6,10],[10,18],[18,30],[30,50],[50,80],[80,120],[120,180],[180,250],[250,315],[315,400],[400,500]
  ];

  var FINE = [
    [0,3],[3,6],[6,10],[10,14],[14,18],[18,24],[24,30],[30,40],[40,50],
    [50,65],[65,80],[80,100],[100,120],[120,140],[140,160],[160,180],
    [180,200],[200,225],[225,250],[250,280],[280,315],[315,355],[355,400],[400,450],[450,500]
  ];

  var SHAFT_DEV = {
    d: { type:'upper', v:[-20,-30,-40,-50,-50,-65,-65,-80,-80,-100,-100,-120,-120,-145,-145,-145,-170,-170,-170,-190,-190,-210,-210,-230,-230] },
    e: { type:'upper', v:[-14,-20,-25,-32,-32,-40,-40,-50,-50,-60,-60,-72,-72,-85,-85,-85,-100,-100,-100,-110,-110,-125,-125,-135,-135] },
    f: { type:'upper', v:[-6,-10,-13,-16,-16,-20,-20,-25,-25,-30,-30,-36,-36,-43,-43,-43,-50,-50,-50,-56,-56,-62,-62,-68,-68] },
    g: { type:'upper', v:[-2,-4,-5,-6,-6,-7,-7,-9,-9,-10,-10,-12,-12,-14,-14,-14,-15,-15,-15,-17,-17,-18,-18,-20,-20] },
    h: { type:'upper', v:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    k: { type:'lower', v:[0,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,4,4,5,5] },
    m: { type:'lower', v:[2,4,6,7,7,8,8,9,9,11,11,13,13,15,15,15,17,17,17,20,20,21,21,23,23] },
    n: { type:'lower', v:[4,8,10,12,12,15,15,17,17,20,20,23,23,27,27,27,31,31,31,34,34,37,37,40,40] },
    p: { type:'lower', v:[6,12,15,18,18,22,22,26,26,32,32,37,37,43,43,43,50,50,50,56,56,62,62,68,68] },
    r: { type:'lower', v:[10,15,19,23,23,28,28,34,34,41,43,51,54,63,65,68,77,80,84,94,98,108,114,126,132] },
    s: { type:'lower', v:[14,19,23,28,28,35,35,43,43,53,59,71,79,92,100,108,122,130,140,158,170,190,208,232,250] },
    u: { type:'lower', v:[18,23,28,33,33,41,41,48,48,60,66,80,90,106,118,132,155,170,190,218,240,268,296,330,370] }
  };

  /* 下拉与快捷配合列表同样来自 /fit/ 页（常用配合芯片 + 基孔制 H7 推荐表） */
  var HOLE_CODES = ['H7','H8','H9','H11','H12','JS7','JS8','JS9','K7','M7','N7','P7','R7','S7','U7','F8','G7','D10','E9'];
  var SHAFT_CODES = ['h6','h7','h9','h11','h12','js6','js7','js9','g6','g7','f7','f8','e8','e9','d9','d10','k6','m6','n6','p6','r6','s6','u6'];
  var FIT_QUICK = ['H7/g6','H7/h6','H7/k6','H7/n6','H7/p6','H7/s6','H8/f7','H9/d9','H7/js6','H7/u6'];
  var LETTERS = ['d','e','f','g','h','js','k','m','n','p','r','s','u'];

  function findCoarseIndex(dim) {
    for (var i = 0; i < COARSE.length; i++) {
      if (dim > COARSE[i][0] && dim <= COARSE[i][1]) return i;
    }
    return -1;
  }

  function findFineIndex(dim) {
    for (var i = 0; i < FINE.length; i++) {
      if (dim > FINE[i][0] && dim <= FINE[i][1]) return i;
    }
    return -1;
  }

  function getIT(dim, grade) {
    var idx = findCoarseIndex(dim);
    if (idx < 0) return null;
    var key = 'IT' + grade;
    if (!IT[key]) return null;
    return IT[key][idx];
  }

  function getShaftDeviation(dim, letter, grade) {
    var idx = findFineIndex(dim);
    if (idx < 0) return null;
    var d = SHAFT_DEV[letter];
    if (!d) return null;
    // ISO 286: k 在 IT8 及以上时 ei=0
    if (letter === 'k' && grade >= 8) {
      return { type: d.type, value: 0 };
    }
    return { type: d.type, value: d.v[idx] };
  }

  function calcTolerance(dim, code) {
    var match = String(code).trim().match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) return { error: '公差代号格式错误，如 H7、g6' };

    var letter = match[1];
    var grade = parseInt(match[2], 10);
    var isHole = letter === letter.toUpperCase();

    if (grade < 5 || grade > 13) return { error: 'IT等级范围: 5~13' };
    if (dim < SIZE_MIN || dim > SIZE_MAX) return { error: '超出 ISO 286 标准范围（1~500mm（毫米）），请改用标准内尺寸' };

    var normalLetter = letter.toLowerCase();
    var itVal = getIT(dim, grade);

    if (itVal === null) return { error: '找不到该尺寸的IT值' };

    if (normalLetter === 'js') {
      var half = itVal / 2;
      var jsUpper = +half.toFixed(1);
      var jsLower = +(-half).toFixed(1);
      return { upper: jsUpper, lower: jsLower, it: itVal, isHole: isHole, letter: letter, grade: grade };
    }

    if (normalLetter === 'h') {
      if (isHole) {
        return { upper: itVal, lower: 0, it: itVal, isHole: isHole, letter: letter, grade: grade };
      } else {
        return { upper: 0, lower: -itVal, it: itVal, isHole: isHole, letter: letter, grade: grade };
      }
    }

    var dev = getShaftDeviation(dim, normalLetter, grade);
    if (!dev) return { error: '不支持的偏差代号: ' + letter + '（支持: d,e,f,g,h,js,k,m,n,p,r,s,u）' };

    var upper, lower, deltaUnavailable = false;
    if (isHole) {
      if (dev.type === 'upper') {
        lower = -dev.value;
        upper = lower + itVal;
      } else {
        /* ISO 286-1：K~ZC 的孔用 ES = -ei + Δ，Δ = IT_n − IT_(n−1)；
           等级大于 IT8 时 Δ = 0。IT5 需要 IT4 作差，本站只收录 IT5 起，
           所以 IT5 退回 ES = -ei 并在结果里标注，不静默给错数。 */
        var itPrev = grade > 5 ? getIT(dim, grade - 1) : null;
        var delta = (grade > 8 || itPrev === null) ? 0 : itVal - itPrev;
        upper = -dev.value + delta;
        lower = upper - itVal;
        if (itPrev === null && grade <= 8) deltaUnavailable = true;
      }
    } else {
      if (dev.type === 'upper') {
        upper = dev.value;
        lower = dev.value - itVal;
      } else {
        lower = dev.value;
        upper = dev.value + itVal;
      }
    }

    upper = +upper.toFixed(1);
    lower = +lower.toFixed(1);

    return { upper: upper, lower: lower, it: itVal, isHole: isHole, letter: letter, grade: grade, deltaUnavailable: deltaUnavailable };
  }

  function calcFit(dim, holeCode, shaftCode) {
    var hole = calcTolerance(dim, holeCode);
    var shaft = calcTolerance(dim, shaftCode);

    if (hole.error) return { error: '孔公差错误: ' + hole.error };
    if (shaft.error) return { error: '轴公差错误: ' + shaft.error };

    var maxClearance = hole.upper - shaft.lower;
    var minClearance = hole.lower - shaft.upper;

    var fitType, fitTypeCN, fitTypeShort;
    if (minClearance >= 0 && maxClearance >= 0) {
      fitType = 'clearance';
      fitTypeCN = '间隙配合';
      fitTypeShort = '间隙';
    } else if (minClearance <= 0 && maxClearance <= 0) {
      fitType = 'interference';
      fitTypeCN = '过盈配合';
      fitTypeShort = '过盈';
    } else {
      fitType = 'transition';
      fitTypeCN = '过渡配合';
      fitTypeShort = '过渡';
    }

    return { hole: hole, shaft: shaft, maxClearance: maxClearance, minClearance: minClearance, fitType: fitType, fitTypeCN: fitTypeCN, fitTypeShort: fitTypeShort };
  }

  function formatDev(val) {
    if (val === 0) return '0';
    var sign = val > 0 ? '+' : '';
    return sign + (val / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }

  function formatMM(um) {
    return (um / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }

  function formatUm(val) {
    if (val === 0) return '0';
    var sign = val > 0 ? '+' : '';
    var n = +(+val).toFixed(1);
    return sign + String(n);
  }

  function toUm(value, unit) {
    var n = Number(value);
    if (!isFinite(n)) return NaN;
    if (unit === 'mm') return +(n * 1000).toFixed(4);
    return +n;
  }

  function roundUm(v) {
    return Math.round(Number(v) * 10) / 10;
  }

  function sizeRangeError(dim) {
    if (!isFinite(dim)) return '请输入有效的基本尺寸（mm）';
    if (dim < SIZE_MIN || dim > SIZE_MAX) {
      return '基本尺寸 ' + dim + ' mm 超出本站 ISO 286 数据范围（1~500 mm），无法计算。';
    }
    return null;
  }

  function zoneCode(letter, grade, isHole) {
    var base = letter === 'js' ? 'js' : letter;
    if (isHole) base = base.toUpperCase();
    return base + grade;
  }

  function listZones(dim, isHole) {
    var out = [];
    var i, g, code, r;
    for (i = 0; i < LETTERS.length; i++) {
      for (g = 5; g <= 13; g++) {
        code = zoneCode(LETTERS[i], g, isHole);
        r = calcTolerance(dim, code);
        if (!r || r.error) continue;
        if (r.deltaUnavailable) continue;
        out.push({
          code: code,
          upper: r.upper,
          lower: r.lower,
          it: r.it,
          grade: g,
          letter: r.letter
        });
      }
    }
    return out;
  }

  /* 接近程度：先比 max(|ΔES|,|ΔEI|)，再比 |ΔES|+|ΔEI|，再比 IT 等级（细的在前）。单位 μm。 */
  function closeness(dUpper, dLower) {
    var a = Math.abs(dUpper);
    var b = Math.abs(dLower);
    return { chebyshev: Math.max(a, b), manhattan: a + b };
  }

  function findCodesByDeviation(dim, upper, lower, isHole, opts) {
    opts = opts || {};
    var limitClose = opts.limitClose || 8;
    var err = sizeRangeError(dim);
    if (err) return { error: err };
    if (!isFinite(upper) || !isFinite(lower)) {
      return { error: '请输入有效的上偏差和下偏差' };
    }
    upper = roundUm(upper);
    lower = roundUm(lower);
    if (lower > upper) {
      return { error: '下偏差不能大于上偏差' };
    }
    var zones = listZones(dim, !!isHole);
    var i, z, dU, dL, c, row;
    var exact = [];
    var close = [];
    for (i = 0; i < zones.length; i++) {
      z = zones[i];
      dU = roundUm(z.upper - upper);
      dL = roundUm(z.lower - lower);
      c = closeness(dU, dL);
      row = {
        code: z.code,
        upper: z.upper,
        lower: z.lower,
        it: z.it,
        grade: z.grade,
        dUpper: dU,
        dLower: dL,
        chebyshev: c.chebyshev,
        manhattan: c.manhattan,
        exact: dU === 0 && dL === 0
      };
      if (row.exact) exact.push(row);
      else close.push(row);
    }
    function byClose(a, b) {
      if (a.chebyshev !== b.chebyshev) return a.chebyshev - b.chebyshev;
      if (a.manhattan !== b.manhattan) return a.manhattan - b.manhattan;
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
    }
    exact.sort(byClose);
    close.sort(byClose);
    return {
      dim: dim,
      isHole: !!isHole,
      queryUpper: upper,
      queryLower: lower,
      exact: exact,
      closest: exact.length ? [] : close.slice(0, limitClose)
    };
  }

  function preferredIndex(fitCode) {
    var i = FIT_QUICK.indexOf(fitCode);
    return i < 0 ? 1000 : i;
  }

  function findFitsByClearance(dim, reqMin, reqMax, opts) {
    opts = opts || {};
    var initial = opts.initial || 20;
    var err = sizeRangeError(dim);
    if (err) return { error: err };
    if (!isFinite(reqMin) || !isFinite(reqMax)) {
      return { error: '请输入有效的最小间隙和最大间隙（过盈用负值）' };
    }
    reqMin = roundUm(reqMin);
    reqMax = roundUm(reqMax);
    if (reqMin > reqMax) {
      return { error: '最小间隙不能大于最大间隙（过盈更紧的数值更小，应填在「最小间隙」）' };
    }
    var holes = listZones(dim, true);
    var shafts = listZones(dim, false);
    var rows = [];
    var i, j, h, s, fit, code, unused, group, pidx;
    for (i = 0; i < holes.length; i++) {
      h = holes[i];
      for (j = 0; j < shafts.length; j++) {
        s = shafts[j];
        fit = calcFit(dim, h.code, s.code);
        if (!fit || fit.error) continue;
        if (fit.hole.deltaUnavailable || fit.shaft.deltaUnavailable) continue;
        if (fit.minClearance < reqMin || fit.maxClearance > reqMax) continue;
        code = h.code + '/' + s.code;
        pidx = preferredIndex(code);
        group = pidx < 1000 ? 0 : (h.code.charAt(0) === 'H' ? 1 : 2);
        unused = (reqMax - fit.maxClearance) + (fit.minClearance - reqMin);
        rows.push({
          code: code,
          holeCode: h.code,
          shaftCode: s.code,
          holeUpper: fit.hole.upper,
          holeLower: fit.hole.lower,
          shaftUpper: fit.shaft.upper,
          shaftLower: fit.shaft.lower,
          minClearance: +fit.minClearance.toFixed(1),
          maxClearance: +fit.maxClearance.toFixed(1),
          fitType: fit.fitType,
          fitTypeCN: fit.fitTypeCN,
          fitTypeShort: fit.fitTypeShort,
          preferred: pidx < 1000,
          holeBasis: h.code.charAt(0) === 'H',
          group: group,
          preferredIndex: pidx,
          unused: +unused.toFixed(1)
        });
      }
    }
    rows.sort(function (a, b) {
      if (a.group !== b.group) return a.group - b.group;
      if (a.group === 0 && a.preferredIndex !== b.preferredIndex) return a.preferredIndex - b.preferredIndex;
      if (a.unused !== b.unused) return a.unused - b.unused;
      if (a.holeCode !== b.holeCode) return a.holeCode < b.holeCode ? -1 : 1;
      return a.shaftCode < b.shaftCode ? -1 : a.shaftCode > b.shaftCode ? 1 : 0;
    });
    return {
      dim: dim,
      reqMin: reqMin,
      reqMax: reqMax,
      total: rows.length,
      initial: initial,
      matches: rows
    };
  }

  var API = {
    SIZE_MIN: SIZE_MIN,
    SIZE_MAX: SIZE_MAX,
    IT: IT,
    COARSE: COARSE,
    FINE: FINE,
    SHAFT_DEV: SHAFT_DEV,
    HOLE_CODES: HOLE_CODES,
    SHAFT_CODES: SHAFT_CODES,
    FIT_QUICK: FIT_QUICK,
    LETTERS: LETTERS,
    findCoarseIndex: findCoarseIndex,
    findFineIndex: findFineIndex,
    getIT: getIT,
    getShaftDeviation: getShaftDeviation,
    calcTolerance: calcTolerance,
    calcFit: calcFit,
    formatDev: formatDev,
    formatMM: formatMM,
    formatUm: formatUm,
    toUm: toUm,
    roundUm: roundUm,
    sizeRangeError: sizeRangeError,
    listZones: listZones,
    closeness: closeness,
    findCodesByDeviation: findCodesByDeviation,
    findFitsByClearance: findFitsByClearance
  };

  root.ISO286 = API;
  /* 供 /fit/ 页原有全局函数名继续使用 */
  root.IT = IT;
  root.COARSE = COARSE;
  root.FINE = FINE;
  root.SHAFT_DEV = SHAFT_DEV;
  root.HOLE_CODES = HOLE_CODES;
  root.SHAFT_CODES = SHAFT_CODES;
  root.FIT_QUICK = FIT_QUICK;
  root.findCoarseIndex = findCoarseIndex;
  root.findFineIndex = findFineIndex;
  root.getIT = getIT;
  root.getShaftDeviation = getShaftDeviation;
  root.calcTolerance = calcTolerance;
  root.calcFit = calcFit;
  root.formatDev = formatDev;
  root.formatMM = formatMM;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
