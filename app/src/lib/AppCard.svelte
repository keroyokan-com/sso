<script>
  import AppIcon from './AppIcon.svelte';
  import { t } from './i18n.svelte.js';

  let { app, favorite = false, ontoggle = () => {}, onclick = () => {} } = $props();

  const href = $derived(app.link || app.url || '/go/' + encodeURIComponent(app.id));
  const ariaLabel = $derived(
    t('card.aria', {
      title: app.title,
      desc: app.desc ? ` - ${app.desc}` : '',
    })
  );

  function onStar(event) {
    event.preventDefault();
    event.stopPropagation();
    ontoggle(app);
  }
</script>

<div class="tile">
  <a class="app" {href} target="_blank" rel="noopener" data-id={app.id} aria-label={ariaLabel} {onclick}>
    <span class="app-icon">
      <AppIcon
        src={app.icon}
        title={app.title}
        width={38}
        height={38}
        sizes="38px"
        loading="lazy"
        letterClass="letter"
      />
    </span>
    <span class="app-meta">
      <span class="app-title">{app.title}</span>
      {#if app.desc}
        <span class="app-desc">{app.desc}</span>
      {/if}
    </span>
  </a>
  <button
    class="star"
    type="button"
    data-id={app.id}
    data-title={app.title}
    aria-pressed={favorite}
    aria-label={favorite
      ? t('card.removeFavorite', { title: app.title })
      : t('card.addFavorite', { title: app.title })}
    onclick={onStar}
  >
    <svg><use href="#i-star" /></svg>
  </button>
</div>
