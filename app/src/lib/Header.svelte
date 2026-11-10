<script>
  import { dashboard } from './dashboard.svelte.js';
  import { openSettings } from './settingsStore.svelte.js';
  import SettingsDrawer from './SettingsDrawer.svelte';
  import { t } from './i18n.svelte.js';
  import { toggleTheme } from './theme.js';
  import { showToast } from './toast.svelte.js';

  let { onsearch = () => {} } = $props();

  let menuBtn = $state();

  const base = import.meta.env.BASE_URL;

  function onTheme() {
    const theme = toggleTheme();
    showToast(theme === 'dark' ? t('theme.dark') : t('theme.light'));
  }

  function onSettings() {
    document.getElementById('headerMenu')?.hidePopover?.();
    openSettings(menuBtn);
  }
</script>

<header class="top">
  <div class="top-inner">
    <a class="brand" href={base} aria-label="SSO Lite">
      <span class="brand-logo" aria-hidden="true"></span>
    </a>
    <div class="top-actions">
      {#if dashboard.email}
        <a id="emailLabel" class="email" href="/connect.html" title={t('header.manageAccount')}>
          {dashboard.email}
        </a>
      {/if}
      <button
        id="searchBtn"
        class="icon-btn"
        type="button"
        aria-label={t('header.search')}
        title={t('header.searchTitle')}
        onclick={onsearch}
      >
        <svg><use href="#i-search" /></svg>
      </button>
      <button
        id="menuBtn"
        class="icon-btn"
        type="button"
        aria-label={t('header.menu')}
        popovertarget="headerMenu"
        bind:this={menuBtn}
      >
        <svg><use href="#i-menu" /></svg>
      </button>
      <button
        id="themeBtn"
        class="icon-btn"
        type="button"
        aria-label={t('header.theme')}
        onclick={onTheme}
      >
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
  <button class="menu-item" type="button" aria-haspopup="dialog" onclick={onSettings}>
    <svg><use href="#i-settings" /></svg>
    <span>{t('header.settings')}</span>
  </button>
</div>

<SettingsDrawer />

<style>
  button.menu-item {
    width: 100%;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
</style>
