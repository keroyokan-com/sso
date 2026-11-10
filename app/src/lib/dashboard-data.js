export const FOLDER_DEFS = [
  {
    id: 'kuliah',
    name: 'Kuliah & kelulusan',
    color: '#2563eb',
    hosts: [
      'sindig.unesa.ac.id',
      'edunesamall.unesa.ac.id',
      'pusbatep.unesa.ac.id',
      'melisa.unesa.ac.id',
      'neoyudisium.unesa.ac.id',
      'siani.unesa.ac.id',
      'bebaslab.unesa.ac.id',
    ],
  },
  {
    id: 'kegiatan',
    name: 'Kegiatan & karier',
    color: '#7452e8',
    hosts: [
      'sipena2.unesa.ac.id',
      'simpelmawa.unesa.ac.id',
      'simpkm.unesa.ac.id',
      'simpmw.unesa.ac.id',
      'pkkmb.unesa.ac.id',
      'pemira.unesa.ac.id',
      'lsp.unesa.ac.id',
      'tracerstudy.unesa.ac.id',
    ],
  },
  {
    id: 'riset',
    name: 'Riset & pustaka',
    color: '#0f8a79',
    hosts: [
      'simlppm.unesa.ac.id',
      'journal.unesa.ac.id',
      'iopac.unesa.ac.id',
      'digilib.unesa.ac.id',
      'apps-lib.unesa.ac.id',
      'vmsul.unesa.ac.id',
      'jdih.unesa.ac.id',
      'sijuna.unesa.ac.id',
      'siolos.unesa.ac.id',
    ],
  },
  {
    id: 'layanan',
    name: 'Layanan kampus',
    color: '#a86a12',
    hosts: [
      'ukt.unesa.ac.id',
      'e-layanan.unesa.ac.id',
      'umc.unesa.ac.id',
      'konseling.unesa.ac.id',
      'siyapa.unesa.ac.id',
      'internetaccess.unesa.ac.id',
      'unesa.me',
      'dashboard.unesa.ac.id',
      'e-audit.unesa.ac.id',
      'simarko.unesa.ac.id',
      'simpromas.unesa.ac.id',
    ],
  },
  {
    id: 'google',
    name: 'Google',
    color: '#3a404a',
    google: true,
  },
];

export function buildServiceLink(app, stored) {
  if (app.url) return app.url;
  const token = stored?.newest?.token;
  if (token && app.origin && app.prefix) {
    return `${app.origin}${app.prefix}${stored.email}/${token}`;
  }
  if (app.origin) return app.origin + '/';
  return null;
}

export function appsFromCatalog(catalog, stored = null) {
  return (catalog?.apps || []).map((app) => ({
    ...app,
    link: stored
      ? buildServiceLink(app, stored)
      : app.url || (app.origin ? app.origin + '/' : null),
  }));
}

export function googleFromCatalog(catalog) {
  return (catalog?.google || []).map((app) => ({
    ...app,
    link: app.url || null,
  }));
}

export function buildFolders(apps, google) {
  const byHost = new Map(apps.map((app) => [app.host, app]));
  const assigned = new Set();

  const folders = FOLDER_DEFS.map((def) => {
    const folderApps = def.google
      ? google.slice()
      : def.hosts.map((host) => byHost.get(host)).filter(Boolean);
    folderApps.forEach((app) => assigned.add(app.id));
    return { ...def, apps: folderApps };
  });

  const rest = apps.filter((app) => !assigned.has(app.id));
  if (rest.length) {
    const layanan = folders.find((folder) => folder.id === 'layanan');
    if (layanan) layanan.apps.push(...rest);
  }

  return folders.filter((folder) => folder.apps.length);
}
