<script>
  import { onMount } from 'svelte';
  import Header from './lib/Header.svelte';
  import Greeting from './lib/Greeting.svelte';
  import SearchBar from './lib/SearchBar.svelte';
  import Footer from './lib/Footer.svelte';
  import Toast from './lib/Toast.svelte';
  import FolderRow from './lib/FolderRow.svelte';
  import FolderDialog from './lib/FolderDialog.svelte';
  import AppSection from './lib/AppSection.svelte';
  import {
    cancelConnect,
    connectDashboard,
    dashboard,
    initDashboard,
    syncStoredLinks,
    toggleFavorite,
  } from './lib/dashboard.svelte.js';
  import { buildFolders } from './lib/dashboard-data.js';
  import { settingsState } from './lib/settingsStore.svelte.js';
  import { searchApps } from './lib/search.mjs';
  import { getLang, t, translateError } from './lib/i18n.svelte.js';
  import { showToast } from './lib/toast.svelte.js';

  let searchBar;
  let sections = $state({
    order: [...settingsState.order],
    hidden: [...settingsState.hidden],
  });
  let activeFolder = $state(null);
  let folderTrigger = $state(null);

  $effect(() => {
    sections = { order: [...settingsState.order], hidden: [...settingsState.hidden] };
  });

  const byTitle = (a, b) =>
    a.title.localeCompare(b.title, getLang() === 'en' ? 'en' : 'id', { sensitivity: 'base' });
  const query = $derived(dashboard.query.trim());
  const campusAll = $derived([...dashboard.apps].sort(byTitle));
  const googleAll = $derived([...dashboard.google]);
  const visibleCampus = $derived(query ? searchApps(dashboard.apps, query) : campusAll);
  const visibleGoogle = $derived(query ? searchApps(dashboard.google, query) : googleAll);
  const favSet = $derived(new Set(dashboard.favs));
  const favoriteApps = $derived(
    [...visibleCampus, ...visibleGoogle].filter((app) => favSet.has(app.id))
  );
  const restCampus = $derived(visibleCampus.filter((app) => !favSet.has(app.id)));
  const restGoogle = $derived(visibleGoogle.filter((app) => !favSet.has(app.id)));
  const folders = $derived(buildFolders(campusAll, googleAll));
  const noResults = $derived(
    Boolean(query) && visibleCampus.length === 0 && visibleGoogle.length === 0
  );
  const hasApps = $derived(dashboard.apps.length + dashboard.google.length > 0);
  const showBanner = $derived(
    dashboard.connecting ||
      (dashboard.ready && dashboard.expired) ||
      (dashboard.ready && dashboard.mode === 'guest') ||
      (dashboard.ready && Boolean(dashboard.error)) ||
      (dashboard.ready && !dashboard.authenticated && hasApps)
  );
  const showFolders = $derived(!query && folders.length > 0);
  const showFavorites = $derived(!query && favoriteApps.length > 0);
  const showCampus = $derived(query ? visibleCampus.length > 0 || noResults : restCampus.length > 0);
  const showGoogle = $derived(query ? visibleGoogle.length > 0 : restGoogle.length > 0);
  const showInfo = $derived(!query && dashboard.info.length > 0);
  const showEmpty = $derived(dashboard.ready && !dashboard.connecting && !hasApps);

  function focusSearch() {
    searchBar?.focus();
  }

  function visibleCards() {
    return [...document.querySelectorAll('#sectionHost a.app')].filter(
      (element) => element.getClientRects().length > 0
    );
  }

  function focusFirstCard() {
    visibleCards()[0]?.focus();
  }

  function openFolder(folder, trigger) {
    folderTrigger = trigger;
    activeFolder = folder;
  }

  function closeFolder() {
    activeFolder = null;
    const trigger = folderTrigger;
    folderTrigger = null;
    if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  function toggleCampus() {
    dashboard.campusOpen = !dashboard.campusOpen;
  }

  function onCardClick(event) {
    if (!dashboard.authenticated && dashboard.mode !== 'guest') {
      event.preventDefault();
      showToast(t('banner.connectFirst'));
      document.querySelector('#bannerHost')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function navigate(current, direction) {
    const from = current.getBoundingClientRect();
    const cx = from.left + from.width / 2;
    const cy = from.top + from.height / 2;

    let best = null;
    let bestScore = Infinity;

    for (const item of visibleCards()) {
      if (item === current) continue;
      const rect = item.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - cx;
      const dy = rect.top + rect.height / 2 - cy;

      const valid =
        direction === 'ArrowRight'
          ? dx > 8
          : direction === 'ArrowLeft'
            ? dx < -8
            : direction === 'ArrowDown'
              ? dy > 8
              : dy < -8;
      if (!valid) continue;

      const horizontal = direction === 'ArrowRight' || direction === 'ArrowLeft';
      const score =
        (horizontal ? Math.abs(dx) : Math.abs(dy)) +
        (horizontal ? Math.abs(dy) : Math.abs(dx)) * 3;
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }

    if (best) {
      best.focus();
      best.scrollIntoView({ block: 'nearest' });
    }
  }

  function onKeydown(event) {
    if (event.key === 'ArrowDown' && document.activeElement?.id === 'search') {
      event.preventDefault();
      focusFirstCard();
      return;
    }

    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a.app');
    if (!link) return;

    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      navigate(link, event.key);
    }
  }

  onMount(() => {
    initDashboard();

    const onStorage = (event) => {
      if (!event.key || event.key === 'sso.links' || event.key === 'sso.link') syncStoredLinks();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<Header onsearch={focusSearch} />

<main class="wrap">
  <Greeting />
  <SearchBar bind:this={searchBar} bind:value={dashboard.query} />

  <div id="bannerHost" class="banner-host" hidden={!showBanner}>
    {#if dashboard.connecting}
      <div class="banner">
        <span class="spinner" aria-hidden="true"></span>
        <span class="grow">
          <strong>{t('banner.connectingTitle')}</strong>
          {t('banner.connectingBody')}
        </span>
        <button class="btn" type="button" onclick={cancelConnect}>{t('banner.cancel')}</button>
      </div>
    {:else if dashboard.expired}
      <div class="banner">
        <span class="dot amber" aria-hidden="true"></span>
        <span class="grow">
          {#if dashboard.mode === 'link'}
            <strong>{t('banner.expiredLinkTitle')}</strong>
            {t('banner.reconnectBody')}
          {:else}
            <strong>{t('banner.expiredSessionTitle')}</strong>
            {t('banner.reconnectBody')}
          {/if}
        </span>
        <button class="btn" type="button" onclick={connectDashboard}>
          {t('banner.connect')}
        </button>
      </div>
    {:else if dashboard.mode === 'guest'}
      <div class="banner">
        <span class="dot" aria-hidden="true"></span>
        <span class="grow">
          <strong>{t('banner.guestTitle')}</strong>
          {t('banner.guestBody')}
        </span>
        <a class="btn" href="/connect.html">{t('banner.linkAccount')}</a>
      </div>
    {:else if dashboard.error}
      <div class="banner">
        <span class="dot red" aria-hidden="true"></span>
        <span class="grow"><strong>{t('banner.loginFailed')}</strong> {translateError(dashboard.error)}</span>
        <button class="btn" type="button" onclick={connectDashboard}>{t('banner.retry')}</button>
      </div>
    {:else if !dashboard.authenticated && hasApps}
      <div class="banner">
        <span class="dot amber" aria-hidden="true"></span>
        <span class="grow">
          <strong>{t('banner.expiredSessionTitle')}</strong>
          {t('banner.reconnectBody')}
        </span>
        <button class="btn" type="button" onclick={connectDashboard}>
          {t('banner.connect')}
        </button>
      </div>
    {/if}
  </div>

  <div
    id="sectionHost"
    class="section-host"
    style:min-height={!dashboard.ready ? '70vh' : null}
  >
    {#if !dashboard.ready}
      <!-- reserve space while the catalog loads to avoid layout shift -->
    {:else if showEmpty}
      <div class="empty">
        <div class="empty-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <h2>{t('empty.title')}</h2>
        <p>{t('empty.body')}</p>
        <a class="btn primary" href="/connect.html">{t('empty.button')}</a>
        <p class="fine">{t('empty.fine')}</p>
      </div>
    {:else}
      {#if showFolders && !sections.hidden.includes('folders')}
        <div
          class="folder-host"
          data-section="folders"
          style:order={sections.order.indexOf('folders')}
        >
          <FolderRow {folders} onopen={openFolder} />
        </div>
      {/if}

      {#if showFavorites && !sections.hidden.includes('favorites')}
        <div
          class="grid-host"
          data-section="favorites"
          style:order={sections.order.indexOf('favorites')}
        >
          <AppSection
            title={t('section.favorites')}
            apps={favoriteApps}
            favorites={dashboard.favs}
            onstar={toggleFavorite}
            onclick={onCardClick}
          />
        </div>
      {/if}

      {#if showCampus && !sections.hidden.includes('campus')}
        <div
          class="grid-host"
          data-section="campus"
          style:order={sections.order.indexOf('campus')}
          aria-live="polite"
        >
          {#if noResults}
            <div class="no-results">
              {t('empty.noResultsPrefix')} <strong>{query}</strong>{t('empty.noResultsSuffix')}
            </div>
          {:else}
            <AppSection
              title={t('section.campus')}
              apps={query ? visibleCampus : restCampus}
              favorites={dashboard.favs}
              accordion={!query}
              expanded={dashboard.campusOpen}
              ontoggle={toggleCampus}
              onstar={toggleFavorite}
              onclick={onCardClick}
              tilesId="campus-tiles"
            />
          {/if}
        </div>
      {/if}

      {#if showGoogle && !sections.hidden.includes('google')}
        <div
          class="grid-host"
          data-section="google"
          style:order={sections.order.indexOf('google')}
        >
          <AppSection
            title={t('section.google')}
            apps={query ? visibleGoogle : restGoogle}
            favorites={dashboard.favs}
            onstar={toggleFavorite}
            onclick={onCardClick}
          />
        </div>
      {/if}

      {#if showInfo && !sections.hidden.includes('info')}
        <div
          class="info-host"
          data-section="info"
          style:order={sections.order.indexOf('info')}
        >
          <section class="section info-section">
            <div class="section-head">
              <h2>{t('section.info')}</h2>
            </div>
            <div class="info-list">
              {#each dashboard.info as item (item.title)}
                <a class="info-item" href={item.url} target="_blank" rel="noopener">
                  <span class="info-title">{item.title}</span>
                  <svg class="info-arrow"><use href="#i-arrow" /></svg>
                </a>
              {/each}
            </div>
          </section>
        </div>
      {/if}
    {/if}
  </div>

  <Footer />
</main>

{#if activeFolder}
  <FolderDialog folder={activeFolder} trigger={folderTrigger} onclose={closeFolder} />
{/if}

<Toast />
