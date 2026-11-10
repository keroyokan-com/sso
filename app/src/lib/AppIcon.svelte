<script>
  const APP_ICON_PATH = /^\/app-icons\/([^/]+)\.png$/;

  let {
    src = '',
    title = '',
    width = 38,
    height = 38,
    sizes = '',
    loading = 'lazy',
    className = '',
    letterClass = 'letter',
    priority = false,
  } = $props();

  let failed = $state(false);

  const sources = $derived.by(() => {
    const match = APP_ICON_PATH.exec(src || '');
    if (!match) return null;
    const name = match[1];
    return {
      avif: `/app-icons/48/${name}.avif 48w, /app-icons/96/${name}.avif 96w`,
      webp: `/app-icons/48/${name}.webp 48w, /app-icons/96/${name}.webp 96w`,
      png: src,
    };
  });

  const letter = $derived((String(title).match(/[a-z0-9]/i) || ['?'])[0].toUpperCase());
</script>

{#if failed || !src}
  <span class={letterClass} aria-hidden="true">{letter}</span>
{:else}
  <picture style="display: contents">
    {#if sources}
      <source type="image/avif" srcset={sources.avif} sizes={sizes || undefined} />
      <source type="image/webp" srcset={sources.webp} sizes={sizes || undefined} />
    {/if}
    <img
      src={sources ? sources.png : src}
      alt=""
      {width}
      {height}
      sizes={sizes || undefined}
      {loading}
      decoding="async"
      class={className || undefined}
      fetchpriority={priority ? 'high' : undefined}
      onerror={() => {
        failed = true;
      }}
    >
  </picture>
{/if}
