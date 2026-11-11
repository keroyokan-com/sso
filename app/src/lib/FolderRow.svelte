<script>
  import { onMount } from 'svelte';
  import AppIcon from './AppIcon.svelte';
  import { t, tn } from './i18n.svelte.js';

  let { folders, onopen } = $props();

  let rowEl = $state();
  let scrollEl = $state();

  function update() {
    if (!rowEl || !scrollEl) return;
    const scrollable = rowEl.scrollWidth > rowEl.clientWidth + 1;
    scrollEl.classList.toggle('scrollable', scrollable);
    scrollEl.classList.toggle('at-start', rowEl.scrollLeft <= 1);
    scrollEl.classList.toggle(
      'at-end',
      rowEl.scrollLeft + rowEl.clientWidth >= rowEl.scrollWidth - 1
    );
  }

  $effect(() => {
    folders;
    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  });

  onMount(() => {
    let observer = null;
    const onScroll = () => update();
    const onResize = () => update();

    rowEl?.addEventListener('scroll', onScroll, { passive: true });
    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(onResize);
      if (rowEl) observer.observe(rowEl);
    } else {
      window.addEventListener('resize', onResize);
    }

    return () => {
      rowEl?.removeEventListener('scroll', onScroll);
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', onResize);
    };
  });
</script>

<section class="section folder-section">
  <div class="section-head">
    <h2>{t('section.folders')}</h2>
    <span class="count">{tn('folders.count', folders.length, { count: folders.length })}</span>
  </div>
  <div class="folder-scroll" bind:this={scrollEl}>
    <div class="folder-row" bind:this={rowEl}>
      {#each folders as folder (folder.id)}
        {@const largeCount = folder.apps.length >= 7 ? 3 : Math.min(4, folder.apps.length)}
        {@const miniApps =
          folder.apps.length >= 7
            ? folder.apps.slice(3, 7)
            : folder.apps.length >= 5
              ? folder.apps.slice(3)
              : []}
        <button
          class="folder-card"
          type="button"
          data-folder={folder.id}
          aria-haspopup="dialog"
          aria-label={tn('folders.open', folder.apps.length, {
            name: folder.name,
            count: folder.apps.length,
          })}
          onclick={(event) => onopen(folder, event.currentTarget)}
        >
          <div class="folder-preview">
            {#each folder.apps.slice(0, largeCount) as app (app.id)}
              <span class="folder-cell">
                <AppIcon
                  src={app.icon}
                  title={app.title}
                  width={46}
                  height={46}
                  sizes="46px"
                  loading="eager"
                  className="folder-tile"
                  letterClass="folder-letter"
                  priority={true}
                />
              </span>
            {/each}

            {#if miniApps.length}
              <div class="folder-mini">
                {#each Array(4) as _, index (index)}
                  {#if miniApps[index]}
                    <span class="folder-mini-cell" data-app-id={miniApps[index].id}>
                      <AppIcon
                        src={miniApps[index].icon}
                        title={miniApps[index].title}
                        width={21}
                        height={21}
                        sizes="21px"
                        loading="eager"
                        className="folder-mini-tile"
                        letterClass="folder-letter folder-letter-mini"
                      />
                    </span>
                  {:else}
                    <span class="folder-mini-cell folder-mini-empty"></span>
                  {/if}
                {/each}
              </div>
            {:else}
              {#each Array(4 - largeCount) as _, index (index)}
                <span class="folder-cell folder-cell-empty"></span>
              {/each}
            {/if}
          </div>
          <div class="folder-card-label">
            <span class="folder-card-name">{folder.name}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>
</section>
