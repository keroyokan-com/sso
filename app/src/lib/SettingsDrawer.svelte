<script>
  import { onMount } from 'svelte';
  import { Drawer } from 'vaul-svelte';
  import { Portal } from 'bits-ui';
  import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
  } from '@dnd-kit-svelte/core';
  import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
  } from '@dnd-kit-svelte/sortable';
  import {
    SECTION_DEFS,
    settingsOpen,
    settingsState,
    closeSettings,
    focusSettingsTrigger,
    persist,
    reset,
    toggleHidden,
  } from './settingsStore.svelte.js';
  import SettingsSortableRow from './SettingsSortableRow.svelte';
  import { getLang, setLang, t } from './i18n.svelte.js';

  let activeId = $state(null);
  let announcement = $state('');
  let isMobile = $state(false);
  let reducedMotion = $state(false);
  let vaulOpen = $state(settingsOpen());

  const rows = $derived(
    settingsState.order
      .map((id) => ({ id, def: SECTION_DEFS.find((entry) => entry.id === id) }))
      .filter((row) => row.def)
  );
  const rowIds = $derived(rows.map((row) => row.id));
  const activeRow = $derived(rows.find((row) => row.id === activeId) || null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const screenReaderInstructions = $derived({
    draggable: t('settings.srInstructions'),
  });

  function sectionName(id) {
    const def = SECTION_DEFS.find((entry) => entry.id === id);
    return def ? t(def.key) : String(id);
  }

  function sectionPosition(id) {
    return rows.findIndex((row) => row.id === id) + 1;
  }

  const announcements = {
    onDragStart({ active }) {
      return t('settings.announceLift', { name: sectionName(active.id) });
    },
    onDragOver({ active, over }) {
      if (!over) return t('settings.announceOutside', { name: sectionName(active.id) });
      return t('settings.announceOver', {
        name: sectionName(active.id),
        position: sectionPosition(over.id),
        total: rows.length,
      });
    },
    onDragEnd({ active, over }) {
      if (!over) return t('settings.announceDropped', { name: sectionName(active.id) });
      return t('settings.announceMoved', {
        name: sectionName(active.id),
        position: sectionPosition(active.id),
        total: rows.length,
      });
    },
    onDragCancel({ active }) {
      return t('settings.announceCancel', { name: sectionName(active.id) });
    },
  };

  onMount(() => {
    const mobileQuery = matchMedia('(max-width: 720px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMobile = () => {
      isMobile = mobileQuery.matches;
    };
    const updateMotion = () => {
      reducedMotion = motionQuery.matches;
    };
    updateMobile();
    updateMotion();
    mobileQuery.addEventListener('change', updateMobile);
    motionQuery.addEventListener('change', updateMotion);
    return () => {
      mobileQuery.removeEventListener('change', updateMobile);
      motionQuery.removeEventListener('change', updateMotion);
    };
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

  function onDragStart(event) {
    activeId = event.active.id;
    announcement = '';
  }

  function onDragEnd(event) {
    const { active, over } = event;
    activeId = null;
    if (!over || active.id === over.id) return;

    const from = settingsState.order.indexOf(active.id);
    const to = settingsState.order.indexOf(over.id);
    if (from === -1 || to === -1) return;

    settingsState.order = arrayMove(settingsState.order, from, to);
    persist();
  }

  function onDragCancel() {
    activeId = null;
  }

  function onEscapeKeydown(event) {
    if (activeId != null) event.preventDefault();
  }

  function onToggle(id) {
    toggleHidden(id);
    const hidden = settingsState.hidden.includes(id);
    announcement = hidden
      ? t('settings.announceHidden', { name: sectionName(id) })
      : t('settings.announceShown', { name: sectionName(id) });
  }

  function onReset() {
    reset();
    announcement = t('settings.announceReset');
  }

  $effect(() => {
    if (!settingsOpen()) activeId = null;
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
      onCloseAutoFocus={onCloseAutoFocus}
      onEscapeKeydown={onEscapeKeydown}
      tabindex="-1"
    >
      <div class="settings-head">
        <div class="settings-heading">
          <Drawer.Title class="settings-title">{t('settings.title')}</Drawer.Title>
        </div>
        <button
          class="icon-btn"
          type="button"
          aria-label={t('settings.close')}
          title={t('settings.closeTitle')}
          onclick={close}
        >
          <svg><use href="#i-x" /></svg>
        </button>
      </div>

      <div class="settings-body">
        <div class="settings-language">
          <div class="settings-language-row">
            <span class="settings-language-label">{t('settings.language')}</span>
            <div class="lang-switch" role="group" aria-label={t('settings.language')}>
              <button
                type="button"
                aria-pressed={getLang() === 'id'}
                aria-label={`ID - ${t('settings.languageId')}`}
                class:active={getLang() === 'id'}
                onclick={() => setLang('id')}
              >
                ID
              </button>
              <button
                type="button"
                aria-pressed={getLang() === 'en'}
                aria-label={`EN - ${t('settings.languageEn')}`}
                class:active={getLang() === 'en'}
                onclick={() => setLang('en')}
              >
                EN
              </button>
            </div>
          </div>
          <p class="settings-hint">{t('settings.languageHint')}</p>
        </div>

        <p class="settings-hint">
          {t('settings.hint')} <kbd>Space</kbd> {t('settings.or')} <kbd>Enter</kbd>
          {t('settings.lift')}, {t('settings.move')}, <kbd>Esc</kbd> {t('settings.cancel')}.
        </p>

        <DndContext
          {sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements, screenReaderInstructions }}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext id="settings-sections" items={rowIds} strategy={verticalListSortingStrategy}>
            <ul class="settings-list" data-vaul-no-drag>
              {#each rows as row (row.id)}
                <SettingsSortableRow
                  {row}
                  name={sectionName(row.id)}
                  sections={rowIds}
                  hidden={settingsState.hidden.includes(row.id)}
                  {reducedMotion}
                  onToggle={onToggle}
                />
              {/each}
            </ul>
          </SortableContext>

          <Portal to="body">
            <DragOverlay
              className="settings-drag-overlay"
              transition={reducedMotion ? 'none' : undefined}
              dropAnimation={reducedMotion ? null : undefined}
            >
              {#if activeRow}
                <div class="drag-ghost" aria-hidden="true">
                  <span class="ghost-handle">
                    <i class="ph ph-dots-six-vertical"></i>
                  </span>
                  <span class="ghost-copy">
                    <span class="ghost-name">{sectionName(activeRow.id)}</span>
                  </span>
                  <span class="ghost-switch" class:on={!settingsState.hidden.includes(activeRow.id)}>
                    <span class="ghost-track"></span>
                  </span>
                </div>
              {/if}
            </DragOverlay>
          </Portal>
        </DndContext>

        <p class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      </div>

      <div class="settings-foot">
        <button class="btn" type="button" onclick={onReset}>{t('settings.reset')}</button>
        <button class="btn primary" type="button" onclick={close}>{t('settings.done')}</button>
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

  .settings-language {
    margin-bottom: 16px;
  }

  .settings-language-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--surface-2);
  }

  .settings-language-label {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .lang-switch {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 9px;
    background: var(--bg);
  }

  .lang-switch button {
    min-width: 40px;
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font: 600 12px/1 var(--font);
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .lang-switch button:hover {
    color: var(--text);
  }

  .lang-switch button.active {
    background: var(--accent);
    color: var(--on-accent);
  }

  .lang-switch button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .settings-language .settings-hint {
    margin: 8px 2px 0;
  }

  .settings-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  :global(.settings-drag-overlay) {
    cursor: grabbing;
    pointer-events: none;
  }

  .drag-ghost {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 100%;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    box-shadow: 0 12px 30px rgb(0 0 0 / 0.16);
    scale: 1.02;
    cursor: grabbing;
    pointer-events: none;
  }

  .ghost-handle {
    flex: none;
    width: 32px;
    height: 40px;
    display: grid;
    place-items: center;
    color: var(--faint);
  }

  .ghost-handle .ph {
    font-size: 18px;
    line-height: 1;
  }

  .ghost-copy {
    flex: 1;
    min-width: 0;
  }

  .ghost-name {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .ghost-switch {
    position: relative;
    flex: none;
    width: 38px;
    height: 22px;
    border-radius: 999px;
    background: var(--line-strong);
  }

  .ghost-switch.on {
    background: var(--accent);
  }

  .ghost-track {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
  }

  .ghost-switch.on .ghost-track {
    background: var(--bg);
    transform: translateX(16px);
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

    :global(.settings-drag-overlay) {
      transition: none !important;
    }

    .drag-ghost {
      scale: none;
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
