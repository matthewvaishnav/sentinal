const fs = require('fs');
const path = require('path');

/**
 * Generates a small, deterministic, CIC-DDoS2019-inspired *mock* dataset.
 *
 * This is intentionally synthetic: it exists so reviewers can run the benchmark
 * workflow offline and get consistent results across machines.
 */

const OUT_PATH = path.join(__dirname, '..', 'data', 'cicddos2019_mock.csv');

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function format(n, digits = 4) {
  return Number(n).toFixed(digits);
}

function makeIp(i) {
  // Keep it simple and stable for demos.
  return `192.168.1.${i}`;
}

function rowFor(rand, ip, label) {
  const isBot = label !== 'Benign';

  // Heuristic distributions:
  // - Bots: lower UA entropy, lower path diversity, higher timing variance, fewer headers, missing Accept-Language.
  // - Benign: higher UA entropy, higher path diversity, more consistent headers, Accept-Language often present.
  const timingCV = clamp01((isBot ? 0.9 : 0.3) + rand() * (isBot ? 0.7 : 0.6)) * 1.6;
  const uaEntropy = clamp01((isBot ? 0.15 : 0.55) + rand() * (isBot ? 0.45 : 0.45));
  const pathDiversity = clamp01((isBot ? 0.1 : 0.4) + rand() * (isBot ? 0.5 : 0.6));
  const headerCount = Math.max(4, Math.round((isBot ? 6 : 10) + rand() * (isBot ? 8 : 10)));
  const hasAcceptLanguage = isBot ? (rand() < 0.15 ? 1 : 0) : (rand() < 0.85 ? 1 : 0);
  const methodVariety = clamp01((isBot ? 0.05 : 0.25) + rand() * (isBot ? 0.45 : 0.75));
  const requestSize = clamp01((isBot ? 0.15 : 0.35) + rand() * (isBot ? 0.85 : 0.65));

  return [
    ip,
    format(timingCV, 4),
    format(uaEntropy, 4),
    format(pathDiversity, 4),
    String(headerCount),
    String(hasAcceptLanguage),
    format(methodVariety, 4),
    format(requestSize, 4),
    label
  ].join(',');
}

function generate({ total = 500, botRatio = 0.35, seed = 1337 } = {}) {
  const rand = mulberry32(seed);
  const header =
    'Source_IP,timingCV,uaEntropy,pathDiversity,headerCount,hasAcceptLanguage,methodVariety,requestSize,Label';

  const botCount = Math.round(total * botRatio);
  const benignCount = total - botCount;

  const lines = [header];

  // Stable ordering: benign first then bot traffic.
  let ipCounter = 1;
  for (let i = 0; i < benignCount; i++) {
    lines.push(rowFor(rand, makeIp(ipCounter++), 'Benign'));
  }
  for (let i = 0; i < botCount; i++) {
    // CIC labels are varied; keep two representative attack strings.
    const attackLabel = rand() < 0.5 ? 'DDoS' : 'DoS';
    lines.push(rowFor(rand, makeIp(ipCounter++), attackLabel));
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8');
  return { outPath: OUT_PATH, total, benignCount, botCount, seed, botRatio };
}

if (require.main === module) {
  const res = generate();
  // eslint-disable-next-line no-console
  console.log(
    `Generated mock dataset: ${res.outPath}\n` +
      `Rows: ${res.total} (benign=${res.benignCount}, bot=${res.botCount}), seed=${res.seed}`
  );
}

module.exports = { generate };

