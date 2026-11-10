<script>
  import { onMount } from 'svelte';
  import { animate } from 'motion';
  import AppIcon from './AppIcon.svelte';

  let { folder, trigger = null, onclose } = $props();

  let closeBtn = $state();
  let inner = $state();
  let overlayEl = $state();

  let reduce = false;
  let closing = false;
  let finished = false;
  let openFrame = 0;
  let closeTimer = 0;
  let animations = [];
  let clones = [];

  function track(animation) {
    animations.push(animation);
    return animation;
  }

  function clearAnimations() {
    for (const animation of animations) {
      try {
        animation.cancel();
      } catch {
        /* ignore */
      }
    }
    animations = [];
    for (const clone of clones) clone.remove();
    clones = [];
  }

  function previewOrigin() {
    const preview = trigger?.querySelector('.folder-preview');
    if (!preview) return null;
    const rect = preview.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function sourceMap() {
    const sources = new Map();
    trigger?.querySelectorAll('.folder-mini [data-app-id]').forEach((el) => {
      const img = el.querySelector('img');
      if (!img) return;
      sources.set(el.dataset.appId, {
        rect: img.getBoundingClientRect(),
        src: img.currentSrc || img.src,
      });
    });
    return sources;
  }

  function targetMap() {
    const targets = new Map();
    overlayEl?.querySelectorAll('.folder-app').forEach((el) => {
      const icon = el.querySelector('.folder-app-icon');
      if (!icon) return;
      targets.set(el.dataset.appId, icon.getBoundingClientRect());
    });
    return targets;
  }

  function revealLabel(label, delay = 0) {
    if (!label) return;
    track(
      animate(
        label,
        { opacity: [0, 1], y: [4, 0] },
        { duration: 0.22, delay, ease: [0.22, 1, 0.36, 1] }
      )
    );
  }

  function prepareOpen() {
    if (!overlayEl) return;
    overlayEl.querySelector('.folder-overlay-head')?.style.setProperty('opacity', '0');
    overlayEl.querySelector('.folder-close')?.style.setProperty('opacity', '0');
    overlayEl.querySelectorAll('.folder-app-icon').forEach((icon) => {
      icon.style.opacity = '0';
    });
    overlayEl.querySelectorAll('.folder-app-name').forEach((label) => {
      label.style.opacity = '0';
    });
  }

  function animateOpen() {
    if (!overlayEl || closing) return;

    const head = overlayEl.querySelector('.folder-overlay-head');
    const close = overlayEl.querySelector('.folder-close');
    const origin = previewOrigin();
    const sources = sourceMap();
    const targets = targetMap();

    if (head) {
      track(
        animate(
          head,
          { opacity: [0, 1], y: [12, 0] },
          { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
        )
      );
    }

    if (close) {
      track(animate(close, { opacity: [0, 1] }, { duration: 0.16, delay: 0.02, ease: 'easeOut' }));
    }

    const tiles = [...overlayEl.querySelectorAll('.folder-app')];

    tiles.forEach((tile, index) => {
      const appId = tile.dataset.appId;
      const source = sources.get(appId);
      const target = targets.get(appId);
      const icon = tile.querySelector('.folder-app-icon');
      const label = tile.querySelector('.folder-app-name');
      const img = icon?.querySelector('img');
      const labelDelay = 0.04 + index * 0.006;

      if (source && target && img) {
        icon.style.opacity = '0';

        const clone = document.createElement('img');
        clone.className = 'folder-fly';
        clone.src = source.src;
        clone.alt = '';
        clone.style.left = source.rect.left + 'px';
        clone.style.top = source.rect.top + 'px';
        clone.style.width = source.rect.width + 'px';
        clone.style.height = source.rect.height + 'px';
        document.body.appendChild(clone);
        clones.push(clone);

        const dx = target.left - source.rect.left;
        const dy = target.top - source.rect.top;
        const scale = target.width / Math.max(1, source.rect.width);

        const animation = track(
          animate(
            clone,
            { x: dx, y: dy, scale },
            { type: 'spring', stiffness: 320, damping: 30, mass: 0.7 }
          )
        );

        animation.then(
          () => {
            icon.style.opacity = '';
            clone.remove();
            const at = clones.indexOf(clone);
            if (at >= 0) clones.splice(at, 1);
          },
          () => {}
        );
        revealLabel(label, labelDelay);
        return;
      }

      if (target && origin) {
        icon.style.opacity = '0';
        const dx = origin.x - (target.left + target.width / 2);
        const dy = origin.y - (target.top + target.height / 2);

        track(
          animate(
            icon,
            { opacity: [0, 1], x: [dx, 0], y: [dy, 0], scale: [0.2, 1] },
            { duration: 0.3, delay: index * 0.006, ease: [0.22, 1, 0.36, 1] }
          )
        );
        revealLabel(label, 0.05 + index * 0.006);
        return;
      }

      if (icon) {
        track(animate(icon, { opacity: [0, 1] }, { duration: 0.18, delay: 0.02, ease: 'easeOut' }));
      }
      revealLabel(label, 0.08);
    });
  }

  function animateClose() {
    if (!overlayEl) {
      finishClose();
      return;
    }

    clearAnimations();

    const origin = previewOrigin();
    const sources = sourceMap();
    const tiles = [...overlayEl.querySelectorAll('.folder-app')];

    tiles.forEach((tile) => {
      const label = tile.querySelector('.folder-app-name');
      if (!label) return;
      track(animate(label, { opacity: 0 }, { duration: 0.1, ease: 'easeOut' }));
    });

    tiles.forEach((tile, index) => {
      const appId = tile.dataset.appId;
      const source = sources.get(appId);
      const icon = tile.querySelector('.folder-app-icon');
      if (!icon) return;

      const img = icon.querySelector('img');
      const target = icon.getBoundingClientRect();

      if (source && img) {
        icon.style.opacity = '0';

        const clone = document.createElement('img');
        clone.className = 'folder-fly';
        clone.src = source.src;
        clone.alt = '';
        clone.style.left = target.left + 'px';
        clone.style.top = target.top + 'px';
        clone.style.width = target.width + 'px';
        clone.style.height = target.height + 'px';
        document.body.appendChild(clone);
        clones.push(clone);

        const dx = source.rect.left - target.left;
        const dy = source.rect.top - target.top;
        const scale = source.rect.width / Math.max(1, target.width);

        const animation = track(
          animate(
            clone,
            { x: dx, y: dy, scale },
            { type: 'spring', stiffness: 320, damping: 30, mass: 0.7 }
          )
        );

        animation.then(
          () => clone.remove(),
          () => {}
        );
        return;
      }

      if (!origin) return;

      const dx = origin.x - (target.left + target.width / 2);
      const dy = origin.y - (target.top + target.height / 2);

      track(
        animate(
          icon,
          { opacity: [1, 0], x: [0, dx], y: [0, dy], scale: [1, 0.2] },
          {
            duration: 0.24,
            delay: (tiles.length - index) * 0.006,
            ease: [0.4, 0, 0.6, 1],
          }
        )
      );
    });

    const innerEl = overlayEl.querySelector('.folder-overlay-inner');
    if (innerEl) {
      track(
        animate(innerEl, { opacity: [1, 0] }, { duration: 0.16, delay: 0.08, ease: 'easeIn' })
      );
    }

    closeTimer = setTimeout(finishClose, 340);
  }

  function finishClose() {
    if (finished) return;
    finished = true;
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = 0;
    }
    clearAnimations();
    onclose();
  }

  function requestClose() {
    if (closing) return;
    closing = true;

    if (reduce) {
      finishClose();
      return;
    }

    animateClose();
  }

  onMount(() => {
    reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.add('folder-overlay-open');
    closeBtn?.focus({ preventScroll: true });

    if (!reduce) {
      prepareOpen();
      openFrame = requestAnimationFrame(animateOpen);
    }

    return () => {
      cancelAnimationFrame(openFrame);
      if (closeTimer) clearTimeout(closeTimer);
      clearAnimations();
      document.body.classList.remove('folder-overlay-open');
    };
  });

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
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
    requestClose();
  }
</script>

<div
  class="folder-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="folderOverlayTitle"
  tabindex="-1"
  bind:this={overlayEl}
  onclick={onOverlayClick}
  onkeydown={onKeydown}
>
  <div class="folder-overlay-inner" bind:this={inner}>
    <button
      class="folder-close"
      type="button"
      aria-label="Tutup folder"
      bind:this={closeBtn}
      onclick={requestClose}
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
