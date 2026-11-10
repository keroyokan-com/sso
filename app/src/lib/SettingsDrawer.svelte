<script>
  import { tick } from 'svelte';
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

  let overlayEl = $state();
  let panelEl = $state();
  let listEl = $state();
  let drag = $state(null);
  let announcement = $state('');

  const rows = $derived(
    settingsState.order
      .map((id) => ({ id, def: SECTION_DEFS.find((entry) => entry.id === id) }))
      .filter((row) => row.def)
  );

  function close() {
    if (!settingsOpen()) return;
    closeSettings();
    tick().then(() => requestAnimationFrame(() => focusSettingsTrigger()));
  }

  function focusables() {
    if (!panelEl) return [];
    return [
      ...panelEl.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((el) => el.getClientRects().length > 0);
  }

  function onPanelKeydown(event) {
    if (event.key !== 'Tab') return;

    const items = focusables();
    if (!items.length) {
      event.preventDefault();
      panelEl?.focus();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === panelEl) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
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
    if (!settingsOpen()) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelEl?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });

  $effect(() => {
    if (!settingsOpen()) return;

    const onKeydown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };

    const onPointerDown = (event) => {
      if (event.target === overlayEl) close();
    };

    const onFocusIn = (event) => {
      if (panelEl && !panelEl.contains(event.target)) panelEl.focus();
    };

    window.addEventListener('keydown', onKeydown);
    window.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  });
</script>

{#if settingsOpen()}
  <div class="settings-overlay" bind:this={overlayEl}>
    <div
      class="settings-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settingsTitle"
      aria-describedby="settingsDesc"
      tabindex="-1"
      bind:this={panelEl}
      onkeydown={onPanelKeydown}
    >
      <div class="settings-head">
        <div class="settings-heading">
          <h2 id="settingsTitle">Setelan</h2>
          <p id="settingsDesc">Atur urutan dan tampilan bagian beranda.</p>
        </div>
        <button class="icon-btn" type="button" aria-label="Tutup setelan" title="Tutup" onclick={close}>
          <svg><use href="#i-x" /></svg>
        </button>
      </div>

      <div class="settings-body">
        <p class="settings-hint">
          Tarik gagang untuk mengurutkan. Fokuskan gagang lalu tekan <kbd>Alt</kbd> + panah atas atau bawah.
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
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="6" cy="4" r="1.2" fill="currentColor" />
                  <circle cx="10" cy="4" r="1.2" fill="currentColor" />
                  <circle cx="6" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="10" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="6" cy="12" r="1.2" fill="currentColor" />
                  <circle cx="10" cy="12" r="1.2" fill="currentColor" />
                </svg>
              </button>

              <span class="settings-copy">
                <span class="settings-name">{row.def.name}</span>
                <span class="settings-desc">{row.def.desc}</span>
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
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    background: rgb(0 0 0 / 0.38);
  }

  .settings-drawer {
    display: flex;
    flex-direction: column;
    width: min(420px, calc(100% - 28px));
    height: 100%;
    background: var(--bg);
    color: var(--text);
    border-left: 1px solid var(--line);
    box-shadow: -20px 0 60px rgb(0 0 0 / 0.22);
    overscroll-behavior: contain;
    outline: none;
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

  .settings-heading h2 {
    margin: 0;
    font-size: 19px;
    font-weight: 650;
    letter-spacing: -0.02em;
  }

  .settings-heading p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .settings-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 20px 20px;
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

  .settings-desc {
    font-size: 11.5px;
    color: var(--faint);
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

  @media (max-width: 520px) {
    .settings-overlay {
      background: rgb(0 0 0 / 0.45);
    }

    .settings-drawer {
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
