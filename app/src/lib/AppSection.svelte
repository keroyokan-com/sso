<script>
  import AppCard from './AppCard.svelte';

  let {
    title,
    apps,
    favorites = [],
    accordion = false,
    expanded = false,
    ontoggle = () => {},
    onstar = () => {},
    onclick = () => {},
    tilesId = '',
  } = $props();

  const favSet = $derived(new Set(favorites));
  const shown = $derived(accordion && !expanded ? apps.slice(0, 4) : apps);
</script>

<section class="section">
  <div class="section-head">
    <h2>{title}</h2>
    {#if accordion}
      <div class="section-actions">
        <button
          class="section-toggle campus-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls="campus-tiles"
          onclick={ontoggle}
        >
          {expanded ? 'Tampilkan lebih sedikit' : `Lihat semua ${apps.length} layanan`}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    {:else}
      <span class="count">{apps.length}</span>
    {/if}
  </div>
  <div class="tiles" id={tilesId || undefined}>
    {#each shown as app (app.id)}
      <AppCard
        {app}
        favorite={favSet.has(app.id)}
        ontoggle={onstar}
        {onclick}
      />
    {/each}
  </div>
</section>
