// Public Miami Central directory only. Never fetches private rosters or financial records.
const ORIGIN = 'https://miamicentral.miamioh.edu';
function text(html) {
  return String(html || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(+n, 0x10ffff)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function parseDirectory(html) {
  const groups = [], seen = new Set();
  for (const match of html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const id = match[1].match(/club_id=(\d+)/)?.[1];
    if (!id || seen.has(id)) continue;
    const name = text(match[1]); if (!name) continue;
    const after = html.slice(match.index + match[0].length);
    const next = after.search(/<h2\b/i), section = next < 0 ? after : after.slice(0, next);
    const mission = section.match(new RegExp('<p\\b[^>]*id=["\\\']club_' + id + '["\\\'][^>]*>([\\s\\S]*?)<\\/p>', 'i'))?.[1];
    const tier = section.match(/Red Brick Rewards(?: Fall| Spring)?\s*(?:\d{4})?\s*Tier\s*([1-4])/i)?.[1];
    groups.push({ id, name, mission: text(mission).replace(/^Mission\s*/, ''), tier: tier ? +tier : null, url: `${ORIGIN}/student_community?club_id=${id}` }); seen.add(id);
  }
  return groups;
}
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use a read-only request.' });
  const query = String(req.query?.q || 'Banking').trim().slice(0, 100);
  if (query.length < 2) return res.status(400).json({ error: 'Enter at least two letters.' });
  const url = `${ORIGIN}/club_signup?view=all&search=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'error' });
    if (!response.ok) throw Error('Directory unavailable');
    const html = await response.text();
    if (html.length > 2500000 || /<input[^>]+type=["']password/i.test(html)) throw Error('Public directory unavailable');
    const groups = parseDirectory(html);
    if (!groups.length && !/No (?:groups|results)|0 groups|no matching/i.test(text(html))) {
      return res.status(502).json({ error: 'The public directory could not be read. Open Miami Central directly.', sourceUrl: url });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ groups, sourceUrl: url, checkedAt: new Date().toISOString(), scope: 'Public organization profiles only. No financial or eligibility verification.' });
  } catch {
    return res.status(502).json({ error: 'Miami Central is unavailable. Your workspace has not changed.', sourceUrl: url });
  }
};
module.exports.parseDirectory = parseDirectory;
