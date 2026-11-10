<script>
  const base = import.meta.env.BASE_URL;

  let query = $state('');
  let theme = $state(
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
      ? 'dark'
      : 'light'
  );
  let searchEl;

  let hasQuery = $derived(query.trim().length > 0);

  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  $effect(() => {
    document.documentElement.dataset.theme = theme;
  });

  function focusSearch() {
    searchEl?.focus();
    searchEl?.select();
  }

  function clearSearch() {
    query = '';
    focusSearch();
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('sso.theme', theme);
    } catch (e) {}
  }

  function onKeydown(event) {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    focusSearch();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header class="top">
  <div class="top-inner">
    <a class="brand" href={base} aria-label="SSO Lite">
      <span class="brand-logo" aria-hidden="true"></span>
    </a>
    <div class="top-actions">
      <button class="icon-btn" type="button" aria-label="Cari layanan" title="Cari" onclick={focusSearch}>
        <svg><use href="#i-search" /></svg>
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label="Menu"
        popovertarget="headerMenu"
      >
        <svg><use href="#i-menu" /></svg>
      </button>
      <button class="icon-btn" type="button" aria-label="Ganti tema" onclick={toggleTheme}>
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

<main class="wrap">
  <section class="intro">
    <h1 id="greeting">Halo.</h1>
    <p class="date">{dateLabel}</p>
  </section>

  <div class="search" id="searchWrap">
    <svg class="search-icon"><use href="#i-search" /></svg>
    <input
      id="search"
      bind:this={searchEl}
      bind:value={query}
      type="search"
      placeholder="Cari layanan…"
      autocomplete="off"
      spellcheck="false"
      aria-label="Cari layanan"
    >
    <button
      class="clear"
      type="button"
      aria-label="Hapus pencarian"
      hidden={!hasQuery}
      onclick={clearSearch}
    >
      <svg><use href="#i-x" /></svg>
    </button>
    <kbd id="searchHint">/</kbd>
  </div>

  <div id="sectionHost" class="section-host"></div>

  <footer class="foot">
    <div class="foot-left">
      <span class="foot-status">
        <span class="dot"></span>
        <span>Scaffold SPA</span>
      </span>
      <span class="sep">·</span>
      <span>Belum tersinkron</span>
    </div>
  </footer>
</main>
