import { readText, writeText } from './storage.js';

export const LANG_KEY = 'sso.lang';
export const LANGS = ['id', 'en'];

const messages = {
  id: {
    'meta.description': 'Launcher ringan untuk layanan UNESA.',
    'header.manageAccount': 'Kelola akun',
    'header.search': 'Cari layanan',
    'header.searchTitle': 'Cari',
    'header.menu': 'Menu',
    'header.theme': 'Ganti tema',
    'header.settings': 'Setelan',
    'theme.dark': 'Mode gelap aktif.',
    'theme.light': 'Mode terang aktif.',
    'greeting.hello': 'Halo',
    'greeting.fallbackName': 'nama kamu',
    'greeting.nameAria': 'Nama tampilan',
    'greeting.changeName': 'Ubah nama',
    'greeting.changeNameAria': 'Ubah nama tampilan: {name}',
    'greeting.setName': 'Atur nama tampilan',
    'greeting.setNameAria': 'Atur nama tampilan: {name}',
    'greeting.nameSaved': 'Nama disimpan.',
    'footer.connecting': 'Menghubungkan\u2026',
    'footer.loading': 'Memuat\u2026',
    'footer.expired': 'Sesi habis',
    'footer.linkActive': 'Link aktif',
    'footer.guest': 'Mode tamu',
    'footer.active': 'Sesi aktif',
    'footer.disconnected': 'Sesi belum tersambung',
    'footer.synced': 'Tersinkron {time}',
    'footer.notSynced': 'Belum tersinkron',
    'footer.linkTime': 'Link \u00b7 {time}',
    'footer.connect': 'Sambungkan',
    'footer.changeLink': 'Ganti link',
    'footer.refresh': 'Refresh',
    'time.justNow': 'baru saja',
    'time.minutes.one': '{count} mnt lalu',
    'time.minutes.other': '{count} mnt lalu',
    'time.hours.one': '{count} jam lalu',
    'time.hours.other': '{count} jam lalu',
    'time.days.one': '{count} hari lalu',
    'time.days.other': '{count} hari lalu',
    'search.placeholder': 'Cari layanan.',
    'search.label': 'Cari layanan',
    'search.clear': 'Hapus pencarian',
    'card.aria': '{title}{desc} - buka di tab baru',
    'card.removeFavorite': 'Hapus {title} dari favorit',
    'card.addFavorite': 'Favoritkan {title}',
    'section.folders': 'Kategori',
    'section.favorites': 'Favorit',
    'section.campus': 'Layanan kampus',
    'section.google': 'Google',
    'section.info': 'Info UNESA',
    'section.showLess': 'Tampilkan lebih sedikit',
    'section.showAll.one': 'Lihat semua {count} layanan',
    'section.showAll.other': 'Lihat semua {count} layanan',
    'folder.kuliah': 'Kuliah & kelulusan',
    'folder.kegiatan': 'Kegiatan & karier',
    'folder.riset': 'Riset & pustaka',
    'folder.layanan': 'Layanan kampus',
    'folder.google': 'Google',
    'folders.count.one': '{count} folder',
    'folders.count.other': '{count} folder',
    'folders.open.one': 'Buka folder {name}, {count} layanan',
    'folders.open.other': 'Buka folder {name}, {count} layanan',
    'folder.close': 'Tutup folder',
    'folder.services.one': '{count} layanan',
    'folder.services.other': '{count} layanan',
    'banner.connectingTitle': 'Menunggu login di jendela Chrome.',
    'banner.connectingBody': 'Selesaikan login Google, halaman ini lanjut sendiri.',
    'banner.cancel': 'Batal',
    'banner.expiredLinkTitle': 'Link kedaluwarsa.',
    'banner.expiredSessionTitle': 'Sesi habis.',
    'banner.reconnectBody': 'Sambungkan ulang untuk membuka layanan.',
    'banner.connect': 'Sambungkan',
    'banner.guestTitle': 'Mode tamu.',
    'banner.guestBody': 'Tautkan akun untuk membuka layanan dengan sekali klik.',
    'banner.linkAccount': 'Hubungkan',
    'banner.loginFailed': 'Login gagal.',
    'banner.retry': 'Coba lagi',
    'banner.connectFirst': 'Sambungkan akun dulu.',
    'empty.title': 'Hubungkan akun UNESA',
    'empty.body': 'Login sekali lewat Google. Setelah itu sesi dijaga otomatis di latar belakang.',
    'empty.button': 'Hubungkan akun',
    'empty.fine': 'Butuh cookie dari sesi UNESA-mu. Panduan lengkap ada di halaman berikutnya.',
    'empty.noResultsPrefix': 'Tidak ada layanan yang cocok dengan',
    'empty.noResultsSuffix': '.',
    'settings.title': 'Setelan',
    'settings.close': 'Tutup setelan',
    'settings.closeTitle': 'Tutup',
    'settings.hint': 'Tarik pegangan untuk mengurutkan. Keyboard:',
    'settings.or': 'atau',
    'settings.lift': 'angkat',
    'settings.move': 'panah pindah',
    'settings.cancel': 'batal',
    'settings.reset': 'Atur ulang',
    'settings.done': 'Selesai',
    'settings.language': 'Bahasa',
    'settings.languageHint': 'Pilih bahasa antarmuka.',
    'settings.languageId': 'Indonesia',
    'settings.languageEn': 'English',
    'settings.dragAria': 'Tarik untuk mengurutkan {name}',
    'settings.toggleAria': 'Tampilkan {name}',
    'settings.moveLabel': 'Pindah: {name}',
    'settings.srInstructions':
      'Untuk mengangkat, tekan Space atau Enter. Gunakan panah untuk memindah, Space untuk lepas, Esc untuk batal.',
    'settings.announceLift':
      '{name} diangkat. Gunakan panah untuk memindah, Space untuk lepas, Esc untuk batal.',
    'settings.announceOutside': '{name} di luar daftar.',
    'settings.announceOver': '{name} berada di posisi {position} dari {total}.',
    'settings.announceDropped': '{name} dilepas.',
    'settings.announceMoved': '{name} dipindah ke posisi {position} dari {total}.',
    'settings.announceCancel': 'Pemindahan {name} dibatalkan.',
    'settings.announceHidden': '{name} disembunyikan.',
    'settings.announceShown': '{name} ditampilkan.',
    'settings.announceReset': 'Urutan dan tampilan bagian diatur ulang.',
    'toast.sessionExpired': 'Sesi habis \u2014 sambungkan ulang dulu.',
    'toast.loginTimeout': 'Waktu login habis. Coba lagi.',
    'toast.connected': 'Terhubung. Sesi aktif.',
    'toast.catalogFailed': 'Gagal memuat katalog layanan.',
    'toast.catalogUnavailable': 'Katalog layanan tidak tersedia.',
    'toast.localUnreachable': 'Tidak bisa menghubungi server lokal.',
    'toast.waitingLogin': 'Menunggu login di jendela Chrome.',
    'toast.loginCanceled': 'Login dibatalkan.',
    'toast.servicesUpdated': 'Layanan diperbarui.',
    'toast.sessionNeedsReconnect': 'Sesi perlu disambungkan ulang.',
    'toast.refreshFailed': 'Gagal memperbarui layanan.',
    'toast.favoriteAdded': '{title} ditambahkan ke favorit.',
    'toast.favoriteRemoved': '{title} dihapus dari favorit.',
    'server.invalidBody': 'Body tidak valid.',
    'server.cookieEmpty': 'Cookie kosong.',
    'server.cookieSession': 'Cookie harus berisi laravel_session.',
    'server.readDashboard': 'Gagal membaca dashboard. Coba lagi.',
    'server.notConnected': 'Belum terhubung.',
    'server.cookieInvalidExpired': 'Cookie tidak valid atau sesi sudah habis.',
    'server.cookieInvalid': 'Cookie tidak valid.',
    'server.loginFailed': 'Login gagal',
    'server.error': 'Server error',
  },
  en: {
    'meta.description': 'A small launcher for UNESA services.',
    'header.manageAccount': 'Manage account',
    'header.search': 'Search services',
    'header.searchTitle': 'Search',
    'header.menu': 'Menu',
    'header.theme': 'Change theme',
    'header.settings': 'Settings',
    'theme.dark': 'Dark mode on.',
    'theme.light': 'Light mode on.',
    'greeting.hello': 'Hello',
    'greeting.fallbackName': 'your name',
    'greeting.nameAria': 'Display name',
    'greeting.changeName': 'Change name',
    'greeting.changeNameAria': 'Change display name: {name}',
    'greeting.setName': 'Set display name',
    'greeting.setNameAria': 'Set display name: {name}',
    'greeting.nameSaved': 'Name saved.',
    'footer.connecting': 'Connecting\u2026',
    'footer.loading': 'Loading\u2026',
    'footer.expired': 'Session expired',
    'footer.linkActive': 'Link active',
    'footer.guest': 'Guest mode',
    'footer.active': 'Session active',
    'footer.disconnected': 'Session not connected',
    'footer.synced': 'Synced {time}',
    'footer.notSynced': 'Not synced yet',
    'footer.linkTime': 'Link \u00b7 {time}',
    'footer.connect': 'Connect',
    'footer.changeLink': 'Change link',
    'footer.refresh': 'Refresh',
    'time.justNow': 'just now',
    'time.minutes.one': '{count} min ago',
    'time.minutes.other': '{count} min ago',
    'time.hours.one': '{count} hr ago',
    'time.hours.other': '{count} hr ago',
    'time.days.one': '{count} day ago',
    'time.days.other': '{count} days ago',
    'search.placeholder': 'Search services.',
    'search.label': 'Search services',
    'search.clear': 'Clear search',
    'card.aria': '{title}{desc} - opens in a new tab',
    'card.removeFavorite': 'Remove {title} from favorites',
    'card.addFavorite': 'Add {title} to favorites',
    'section.folders': 'Categories',
    'section.favorites': 'Favorites',
    'section.campus': 'Campus services',
    'section.google': 'Google',
    'section.info': 'UNESA info',
    'section.showLess': 'Show less',
    'section.showAll.one': 'Show all {count} service',
    'section.showAll.other': 'Show all {count} services',
    'folder.kuliah': 'Study & graduation',
    'folder.kegiatan': 'Activities & career',
    'folder.riset': 'Research & library',
    'folder.layanan': 'Campus services',
    'folder.google': 'Google',
    'folders.count.one': '{count} folder',
    'folders.count.other': '{count} folders',
    'folders.open.one': 'Open folder {name}, {count} service',
    'folders.open.other': 'Open folder {name}, {count} services',
    'folder.close': 'Close folder',
    'folder.services.one': '{count} service',
    'folder.services.other': '{count} services',
    'banner.connectingTitle': 'Waiting for login in the Chrome window.',
    'banner.connectingBody': 'Finish the Google login; this page continues on its own.',
    'banner.cancel': 'Cancel',
    'banner.expiredLinkTitle': 'Link expired.',
    'banner.expiredSessionTitle': 'Session expired.',
    'banner.reconnectBody': 'Connect again to open services.',
    'banner.connect': 'Connect',
    'banner.guestTitle': 'Guest mode.',
    'banner.guestBody': 'Link an account to open services in one click.',
    'banner.linkAccount': 'Connect',
    'banner.loginFailed': 'Login failed.',
    'banner.retry': 'Try again',
    'banner.connectFirst': 'Connect an account first.',
    'empty.title': 'Connect your UNESA account',
    'empty.body': 'Log in once with Google. After that the session is kept alive in the background.',
    'empty.button': 'Connect account',
    'empty.fine': 'Needs a cookie from your UNESA session. Full guide on the next page.',
    'empty.noResultsPrefix': 'No services match',
    'empty.noResultsSuffix': '.',
    'settings.title': 'Settings',
    'settings.close': 'Close settings',
    'settings.closeTitle': 'Close',
    'settings.hint': 'Drag the handle to reorder. Keyboard:',
    'settings.or': 'or',
    'settings.lift': 'to lift',
    'settings.move': 'arrows to move',
    'settings.cancel': 'to cancel',
    'settings.reset': 'Reset',
    'settings.done': 'Done',
    'settings.language': 'Language',
    'settings.languageHint': 'Choose the interface language.',
    'settings.languageId': 'Indonesia',
    'settings.languageEn': 'English',
    'settings.dragAria': 'Drag to reorder {name}',
    'settings.toggleAria': 'Show {name}',
    'settings.moveLabel': 'Move: {name}',
    'settings.srInstructions':
      'To lift, press Space or Enter. Use the arrows to move, Space to drop, Esc to cancel.',
    'settings.announceLift':
      '{name} lifted. Use the arrows to move, Space to drop, Esc to cancel.',
    'settings.announceOutside': '{name} is outside the list.',
    'settings.announceOver': '{name} is at position {position} of {total}.',
    'settings.announceDropped': '{name} dropped.',
    'settings.announceMoved': '{name} moved to position {position} of {total}.',
    'settings.announceCancel': 'Moving {name} canceled.',
    'settings.announceHidden': '{name} hidden.',
    'settings.announceShown': '{name} shown.',
    'settings.announceReset': 'Section order and visibility reset.',
    'toast.sessionExpired': 'Session ended \u2014 connect again first.',
    'toast.loginTimeout': 'Login timed out. Try again.',
    'toast.connected': 'Connected. Session active.',
    'toast.catalogFailed': 'Failed to load the service catalog.',
    'toast.catalogUnavailable': 'Service catalog unavailable.',
    'toast.localUnreachable': 'Cannot reach the local server.',
    'toast.waitingLogin': 'Waiting for login in the Chrome window.',
    'toast.loginCanceled': 'Login canceled.',
    'toast.servicesUpdated': 'Services updated.',
    'toast.sessionNeedsReconnect': 'Session needs to be connected again.',
    'toast.refreshFailed': 'Failed to update services.',
    'toast.favoriteAdded': '{title} added to favorites.',
    'toast.favoriteRemoved': '{title} removed from favorites.',
    'server.invalidBody': 'Invalid request body.',
    'server.cookieEmpty': 'Cookie is empty.',
    'server.cookieSession': 'Cookie must contain laravel_session.',
    'server.readDashboard': 'Failed to read the dashboard. Try again.',
    'server.notConnected': 'Not connected yet.',
    'server.cookieInvalidExpired': 'Cookie is invalid or the session has ended.',
    'server.cookieInvalid': 'Cookie is invalid.',
    'server.loginFailed': 'Login failed',
    'server.error': 'Server error',
  },
};

export const i18nState = $state({ lang: 'id' });

function normalizeLang(value) {
  return value === 'en' ? 'en' : 'id';
}

export function getLang() {
  return i18nState.lang;
}

export function applyLang(value, { persist = false } = {}) {
  const lang = normalizeLang(value);
  i18nState.lang = lang;

  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', messages[lang]['meta.description']);
  }

  if (persist) writeText(LANG_KEY, lang);
  return lang;
}

export function setLang(value) {
  return applyLang(value, { persist: true });
}

export function t(key, vars) {
  const lang = i18nState.lang;
  const dictionary = messages[lang] || messages.id;
  let text = dictionary[key] ?? messages.id[key] ?? key;

  if (vars && typeof vars === 'object') {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      vars[name] === undefined ? match : String(vars[name])
    );
  }

  return text;
}

export function tn(key, count, vars = {}) {
  const suffix = Number(count) === 1 ? 'one' : 'other';
  return t(`${key}.${suffix}`, { ...vars, count });
}

const SERVER_ERROR_KEYS = {
  'Body tidak valid.': 'server.invalidBody',
  'Cookie kosong.': 'server.cookieEmpty',
  'Cookie harus berisi laravel_session.': 'server.cookieSession',
  'Gagal membaca dashboard. Coba lagi.': 'server.readDashboard',
  'Belum terhubung.': 'server.notConnected',
  'Cookie tidak valid atau sesi sudah habis.': 'server.cookieInvalidExpired',
  'Cookie tidak valid.': 'server.cookieInvalid',
  'Login gagal': 'server.loginFailed',
  'Server error': 'server.error',
};

export function translateError(message) {
  if (!message) return '';
  const key = SERVER_ERROR_KEYS[String(message).trim()];
  return key ? t(key) : String(message);
}

export function initLang() {
  applyLang(readText(LANG_KEY));

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === LANG_KEY) applyLang(event.newValue);
    });
  }
}

initLang();
