<script>
  import { onMount, tick } from 'svelte';
  import { Drawer } from 'vaul-svelte';
  import {
    SECTION_DEFS,
    settingsOpen,
    settingsState,
    closeSettings,
    focusSettingsTrigger,
    persist,
    reset,
    setOrder,
    toggleHidden,
  } from './settingsStore.svelte.js';

  let panelEl = $state(null);
  let listEl = $state(null);
  let drag = $state(null);
  let announcement = $state('');
  let isMobile = $state(false);
  let vaulOpen = $state(settingsOpen());

  const rows = $derived(
    settingsState.order
      .map((id) => ({ id, def: SECTION_DEFS.find((entry) => entry.id === id) }))
      .filter((row) => row.def)
  );

  onMount(() => {
    const query = matchMedia('(max-width: 720px)');
    const update = () => {
      isMobile = query.matches;
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });

  function close() {
    if (settingsOpen()) closeSettings();
  }

  function onOpenChange(open) {
    if (!open) closeSettings();
  }

  $effect(() => {
    const next = settingsOpen();
    if (vaulOpen !== next) vaulOpen = next;
  });

  function onCloseAutoFocus(event) {
    event.preventDefault();
    focusSettingsTrigger();
  }

  function onDragStart(id, event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();

    const handle = event.currentTarget;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    drag = { id, pointerId: event.pointerId };
    announcement = '';
  }

  function moveRelative(id, targetId, after) {
    const order = [...settingsState.order];
    const from = order.indexOf(id);
    if (from === -1) return;

    order.splice(from, 1);
    let index = order.indexOf(targetId);
    if (index === -1) return;
    if (after) index += 1;
    if (index === from) return;

    order.splice(index, 0, id);
    settingsState.order = order;
  }

  function onDragMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-section]');
    if (!hit || !listEl?.contains(hit)) return;

    const targetId = hit.dataset.section;
    if (!targetId || targetId === drag.id) return;

    const rect = hit.getBoundingClientRect();
    moveRelative(drag.id, targetId, event.clientY > rect.top + rect.height / 2);
  }

  function onDragEnd(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    persist();
  }

  function onHandleKeydown(id, event) {
    if (!event.altKey) return;

    const direction = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!direction) return;

    event.preventDefault();

    const handle = event.currentTarget;
    const order = [...settingsState.order];
    const from = order.indexOf(id);
    const to = from + direction;

    if (from === -1 || to < 0 || to >= order.length) {
      announcement = direction < 0 ? 'Sudah di urutan paling atas.' : 'Sudah di urutan paling bawah.';
      return;
    }

    [order[from], order[to]] = [order[to], order[from]];
    setOrder(order);
    tick().then(() => {
      const next = panelEl?.querySelector(`[data-section="${id}"] .drag-handle`);
      (next || handle).focus();
    });

    const def = SECTION_DEFS.find((entry) => entry.id === id);
    announcement = `${def?.name || id} dipindah ke posisi ${to + 1} dari ${order.length}.`;
  }

  function onToggle(id) {
    toggleHidden(id);
    const def = SECTION_DEFS.find((entry) => entry.id === id);
    const hidden = settingsState.hidden.includes(id);
    announcement = `${def?.name || id} ${hidden ? 'disembunyikan' : 'ditampilkan'}.`;
  }

  function onReset() {
    reset();
    announcement = 'Urutan dan tampilan bagian diatur ulang.';
  }

  $effect(() => {
    if (!drag) return;

    const onMove = (event) => onDragMove(event);
    const onEnd = (event) => onDragEnd(event);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  });

  $effect(() => {
    if (!settingsOpen()) drag = null;
  });

  $effect(() => {
    const open = settingsOpen();
    const mobile = isMobile;
    const app = document.getElementById('app');
    const body = document.body;
    if (!app || !body) return;

    if (open && mobile) {
      app.classList.add('drawer-open');
      body.classList.add('drawer-open-bg');
    }

    return () => {
      app.classList.remove('drawer-open');
      body.classList.remove('drawer-open-bg');
    };
  });
</script>

<Drawer.Root
  bind:open={vaulOpen}
  onOpenChange={onOpenChange}
  direction="right"
  autoFocus={true}
  dismissible={true}
  shouldScaleBackground={!isMobile}
>
  <Drawer.Portal>
    <Drawer.Overlay class="settings-overlay" />
    <Drawer.Content
      class="settings-drawer"
      bind:ref={panelEl}
      onCloseAutoFocus={onCloseAutoFocus}
      tabindex="-1"
    >
      <div class="settings-head">
        <div class="settings-heading">
          <Drawer.Title class="settings-title">Setelan</Drawer.Title>
        </div>
        <button class="icon-btn" type="button" aria-label="Tutup setelan" title="Tutup" onclick={close}>
          <svg><use href="#i-x" /></svg>
        </button>
      </div>

      <div class="settings-body">
        <p class="settings-hint">
          Tarik untuk mengurutkan. Keyboard: <kbd>Alt</kbd> + panah.
        </p>

        <ul class="settings-list" bind:this={listEl}>
          {#each rows as row (row.id)}
            <li class="settings-row" class:dragging={drag?.id === row.id} data-section={row.id}>
              <button
                class="drag-handle"
                type="button"
                aria-label="Tarik untuk mengurutkan {row.def.name}"
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                onpointerdown={(event) => onDragStart(row.id, event)}
                onkeydown={(event) => onHandleKeydown(row.id, event)}
              >
                <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                  <path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" />
                </svg>
              </button>

              <span class="settings-copy">
                <span class="settings-name">{row.def.name}</span>
              </span>

              <label class="switch">
                <input
                  type="checkbox"
                  checked={!settingsState.hidden.includes(row.id)}
                  aria-label="Tampilkan {row.def.name}"
                  onchange={() => onToggle(row.id)}
                />
                <span class="switch-track" aria-hidden="true"></span>
              </label>
            </li>
          {/each}
        </ul>

        <p class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      </div>

      <div class="settings-foot">
        <button class="btn" type="button" onclick={onReset}>Atur ulang</button>
        <button class="btn primary" type="button" onclick={close}>Selesai</button>
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>

<style>
  :global(.settings-overlay) {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgb(0 0 0 / 0.38);
  }

  :global(.settings-drawer) {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 101;
    display: flex;
    flex-direction: column;
    width: min(420px, calc(100% - 28px));
    background: var(--bg);
    color: var(--text);
    border-left: 1px solid var(--line);
    box-shadow: -20px 0 60px rgb(0 0 0 / 0.22);
    overscroll-behavior: contain;
    outline: none;
    touch-action: pan-y;
  }

  .settings-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: calc(20px + env(safe-area-inset-top)) 20px 14px;
  }

  .settings-heading {
    min-width: 0;
  }

  .settings-heading :global(.settings-title) {
    margin: 0;
    font-size: 19px;
    font-weight: 650;
    letter-spacing: -0.02em;
  }

  .settings-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 20px 20px;
    touch-action: pan-y;
  }

  .settings-hint {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 12.5px;
    line-height: 1.55;
  }

  .settings-hint kbd {
    padding: 1px 5px;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--surface);
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 600;
  }

  .settings-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .settings-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--surface-2);
    transition: opacity 0.15s ease, background 0.15s ease;
  }

  .settings-row.dragging {
    opacity: 0.65;
    background: var(--surface);
  }

  .drag-handle {
    flex: none;
    width: 32px;
    height: 40px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--faint);
    cursor: grab;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .drag-handle:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .drag-handle svg {
    width: 14px;
    height: 14px;
  }

  .settings-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .settings-name {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .switch {
    position: relative;
    flex: none;
    width: 38px;
    height: 22px;
  }

  .switch input {
    position: absolute;
    inset: 0;
    z-index: 1;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .switch-track {
    position: relative;
    display: block;
    width: 38px;
    height: 22px;
    border-radius: 999px;
    background: var(--line-strong);
    transition: background 0.18s ease;
  }

  .switch-track::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .switch input:checked + .switch-track {
    background: var(--accent);
  }

  .switch input:checked + .switch-track::after {
    background: var(--bg);
    transform: translateX(16px);
  }

  .switch input:focus-visible + .switch-track {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .settings-foot {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 20px calc(16px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--line);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    :global([data-vaul-drawer]),
    :global([data-vaul-overlay]) {
      animation: none !important;
      transition: none !important;
    }
  }

  @media (max-width: 520px) {
    :global(.settings-overlay) {
      background: rgb(0 0 0 / 0.45);
    }

    :global(.settings-drawer) {
      border-left: 0;
    }

    .settings-head,
    .settings-body,
    .settings-foot {
      padding-left: 20px;
      padding-right: 20px;
    }
  }
</style>
