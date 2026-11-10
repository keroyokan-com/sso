const DASH = 'https://sso.unesa.ac.id/dashboard';

export const GOOGLE_APPS = [
  { id: 'mail.google.com', host: 'mail.google.com', title: 'Gmail', icon: '/icon/dashboard/mail.png' },
  { id: 'drive.google.com', host: 'drive.google.com', title: 'Drive', icon: '/icon/dashboard/gdrive.png' },
  { id: 'meet.google.com', host: 'meet.google.com', title: 'Meet', icon: '/icon/dashboard/gmeet.png' },
  { id: 'classroom.google.com', host: 'classroom.google.com', title: 'Classroom', icon: '/icon/dashboard/gclass.png' },
];

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

export function decodeEntities(input) {
  return String(input)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'");
}

export function stripTags(input) {
  return decodeEntities(String(input).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function iconPath(src) {
  if (!src) return null;
  try {
    const url = new URL(src, 'https://sso.unesa.ac.id');
    if (url.hostname !== 'sso.unesa.ac.id') return null;
    const match = url.pathname.match(/^\/img\/icon-app\/(.+)$/);
    if (!match) return null;
    const rel = match[1];
    if (!/^[a-z0-9/_.-]+\.(png|svg|webp|ico)$/i.test(rel)) return null;
    return '/icon/' + rel;
  } catch {
    return null;
  }
}

export function parseDashboard(html) {
  const email = (String(html).match(/[\w.+-]+@(?:mhs\.)?unesa\.ac\.id/) || [])[0] || null;

  let name = null;
  let nim = null;
  const divRe = /<div[^>]*class="[^"]*fw-bolder[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = divRe.exec(html))) {
    const text = stripTags(match[1]);
    const nm = text.match(/^(\d{10,})\s+(.+)$/);
    if (nm) {
      nim = nm[1];
      name = nm[2].trim();
      break;
    }
  }

  const apps = [];
  const seen = new Set();
  const rowRe = /<tr\b[\s\S]*?<\/tr>/gi;
  while ((match = rowRe.exec(html))) {
    const row = match[0];
    const href = (row.match(/<a\b[^>]*\bhref="([^"]+)"/i) || [])[1];
    if (!href) continue;

    let url;
    try {
      url = new URL(href, 'https://sso.unesa.ac.id');
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;

    const host = url.hostname;
    if (!/(^|\.)unesa\.ac\.id$/.test(host) && !/(^|\.)unesa\.me$/.test(host)) continue;
    if (seen.has(host)) continue;

    const titles = [];
    const titleRe = /<span[^>]*class="[^"]*\bmenu-title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    let tm;
    while ((tm = titleRe.exec(row))) {
      const title = stripTags(tm[1]);
      if (title) titles.push(title);
    }
    if (!titles.length) continue;

    seen.add(host);
    const title = titles[0];
    const desc = titles[1] && titles[1] !== title ? titles[1] : '';
    const img = (row.match(/<img\b[^>]*\bsrc="([^"]+)"/i) || [])[1] || '';

    apps.push({
      id: host,
      title,
      desc,
      host,
      url: url.href,
      icon: iconPath(img),
    });
  }

  const google = GOOGLE_APPS.map((app) => {
    const re = new RegExp('href="(https://' + app.host.replace(/\./g, '\\.') + '[^"]*)"', 'i');
    const found = html.match(re);
    return { ...app, url: found ? decodeEntities(found[1]) : `https://${app.host}/` };
  });

  const info = [];
  const seenInfo = new Set();
  const parts = String(html).split(/<div class="carousel-item/i).slice(1);
  for (const part of parts) {
    const segment = part.split(/<button class="carousel-control/i)[0];
    const h3 = segment.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = h3 ? stripTags(h3[1]) : '';
    if (!title || seenInfo.has(title)) continue;

    const src = (segment.match(/<(?:img|iframe)\b[^>]*\bsrc="([^"]+)"/i) || [])[1];
    if (!src) continue;

    let url;
    try {
      url = new URL(src, 'https://sso.unesa.ac.id');
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;

    seenInfo.add(title);
    info.push({ title, url: url.href });
  }

  return { email, name, nim, apps, google, info };
}

export async function fetchDashboard(cookie) {
  const res = await fetch(DASH, {
    headers: {
      cookie,
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'id-ID,id;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });

  const finalUrl = res.url || '';
  const html = await res.text();
  const unauthorized =
    res.status === 401 ||
    res.status === 403 ||
    /\/login(\?|$)/.test(finalUrl) ||
    /accounts\.google\.com/.test(finalUrl) ||
    !/Selamat datang/i.test(html);

  return {
    unauthorized: Boolean(unauthorized),
    status: res.status,
    finalUrl,
    html,
    setCookies: readSetCookies(res.headers),
  };
}

export function readSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    try {
      return headers.getSetCookie();
    } catch {
      /* fall through */
    }
  }
  const raw = headers.get('set-cookie');
  return raw ? [raw] : [];
}

export function mergeSessionCookie(cookieHeader, setCookies) {
  let next = cookieHeader;
  for (const raw of setCookies || []) {
    const first = raw.split(';')[0];
    const eq = first.indexOf('=');
    if (eq < 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1);
    if (name !== 'laravel_session') continue;
    if (/max-age=0\b/i.test(raw)) continue;
    const parts = next
      .split(/;\s*/)
      .filter((part) => part && !part.startsWith('laravel_session='));
    parts.push(`laravel_session=${value}`);
    next = parts.join('; ');
  }
  return next;
}
