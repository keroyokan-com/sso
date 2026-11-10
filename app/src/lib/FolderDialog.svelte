<script>
  import { onMount } from 'svelte';
  import AppIcon from './AppIcon.svelte';

  let { folder, onclose } = $props();

  let closeBtn = $state();
  let inner = $state();

  onMount(() => {
    document.body.classList.add('folder-overlay-open');
    closeBtn?.focus({ preventScroll: true });

    return () => document.body.classList.remove('folder-overlay-open');
  });

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusables = [closeBtn, ...(inner?.querySelectorAll('a.folder-app') || [])].filter(
      Boolean
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onOverlayClick(event) {
    if (event.target.closest('.folder-overlay-inner')) return;
    onclose();
  }
</script>

<div
  class="folder-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="folderOverlayTitle"
  tabindex="-1"
  onclick={onOverlayClick}
  onkeydown={onKeydown}
>
  <div class="folder-overlay-inner" bind:this={inner}>
    <button
      class="folder-close"
      type="button"
      aria-label="Tutup folder"
      bind:this={closeBtn}
      onclick={onclose}
    >
      <svg><use href="#i-x" /></svg>
    </button>
    <div class="folder-overlay-head">
      <h2 id="folderOverlayTitle">{folder.name}</h2>
      <p class="folder-overlay-count">{folder.apps.length} layanan</p>
    </div>
    <div class="folder-open-grid">
      {#each folder.apps as app (app.id)}
        <a
          class="folder-app"
          href={app.link || app.url || '/go/' + encodeURIComponent(app.id)}
          target="_blank"
          rel="noopener"
          data-app-id={app.id}
        >
          <span class="folder-app-icon">
            <AppIcon
              src={app.icon}
              title={app.title}
              width={56}
              height={56}
              sizes="56px"
              loading="eager"
              letterClass="folder-letter"
            />
          </span>
          <span class="folder-app-name">{app.title}</span>
        </a>
      {/each}
    </div>
  </div>
</div>
