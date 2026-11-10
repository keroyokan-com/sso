<script>
  import { linksState } from './links.svelte.js';
  import { toggleTheme } from './theme.js';
  import { showToast } from './toast.svelte.js';

  let { onsearch = () => {} } = $props();

  const base = import.meta.env.BASE_URL;

  function onTheme() {
    const theme = toggleTheme();
    showToast(theme === 'dark' ? 'Mode gelap aktif.' : 'Mode terang aktif.');
  }
</script>

<header class="top">
  <div class="top-inner">
    <a class="brand" href={base} aria-label="SSO Lite">
      <span class="brand-logo" aria-hidden="true"></span>
    </a>
    <div class="top-actions">
      {#if linksState.email}
        <a id="emailLabel" class="email" href="/connect.html" title="Kelola akun">{linksState.email}</a>
      {/if}
      <button id="searchBtn" class="icon-btn" type="button" aria-label="Cari layanan" title="Cari" onclick={onsearch}>
        <svg><use href="#i-search" /></svg>
      </button>
      <button id="menuBtn" class="icon-btn" type="button" aria-label="Menu" popovertarget="headerMenu">
        <svg><use href="#i-menu" /></svg>
      </button>
      <button id="themeBtn" class="icon-btn" type="button" aria-label="Ganti tema" onclick={onTheme}>
        <svg class="sun"><use href="#i-sun" /></svg>
        <svg class="moon"><use href="#i-moon" /></svg>
      </button>
    </div>
  </div>
</header>

<div id="headerMenu" class="header-menu" popover>
  <a class="menu-item" href="/faq.html">
    <svg><use href="#i-help" /></svg>
    <span>FAQ</span>
  </a>
  <a class="menu-item" href="/settings.html">
    <svg><use href="#i-settings" /></svg>
    <span>Setelan</span>
  </a>
</div>
