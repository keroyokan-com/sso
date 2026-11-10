<script>
  import { useSortable } from '@dnd-kit-svelte/sortable';

  let { row, sections, hidden, reducedMotion, onToggle } = $props();

  const sortable = useSortable({
    id: () => row.id,
    data: () => ({
      current: {
        sortable: {
          containerId: 'settings-sections',
          index: sections.indexOf(row.id),
        },
      },
    }),
    transition: () => (reducedMotion ? null : { duration: 200, easing: 'ease' }),
  });

  const translate = $derived.by(() => {
    const transform = sortable.transform.current;
    if (!transform) return null;
    const { x = 0, y = 0, scaleX = 1, scaleY = 1 } = transform;
    return `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
  });

  function bindRow(node) {
    sortable.setNodeRef(node);
    return {
      destroy() {
        sortable.setNodeRef(null);
      },
    };
  }

  function bindGrip(node) {
    sortable.setActivatorNodeRef(node);
    return {
      destroy() {
        sortable.setActivatorNodeRef(null);
      },
    };
  }
</script>

<li
  class="settings-row"
  class:is-placeholder={sortable.isDragging.current}
  style:transform={translate}
  style:transition={sortable.transition.current}
  use:bindRow
>
  <span class="settings-content" class:is-hidden={sortable.isDragging.current}>
    <button
      class="drag-handle"
      type="button"
      aria-label="Tarik untuk mengurutkan {row.def.name}"
      use:bindGrip
      {...sortable.attributes.current}
      {...(sortable.listeners.current ?? {})}
    >
      <i class="ph ph-dots-six-vertical" aria-hidden="true"></i>
    </button>

    <span class="settings-copy">
      <span class="settings-name">{row.def.name}</span>
    </span>

    <label class="switch">
      <input
        type="checkbox"
        checked={!hidden}
        aria-label="Tampilkan {row.def.name}"
        onchange={() => onToggle(row.id)}
      />
      <span class="switch-track" aria-hidden="true"></span>
    </label>
  </span>

  {#if sortable.isDragging.current}
    <span class="placeholder-label">Pindah: {row.def.name}</span>
  {/if}
</li>

<style>
  .settings-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--surface-2);
    transition: background 0.15s ease;
  }

  .settings-row.is-placeholder {
    background: transparent;
  }

  .settings-row.is-placeholder::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 1.5px dashed var(--accent);
    border-radius: 12px;
    pointer-events: none;
  }

  .settings-content {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-width: 0;
  }

  .settings-content.is-hidden {
    opacity: 0;
    pointer-events: none;
  }

  .placeholder-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--accent);
    pointer-events: none;
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

  .drag-handle .ph {
    font-size: 18px;
    line-height: 1;
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

  @media (prefers-reduced-motion: reduce) {
    .settings-row,
    .switch-track,
    .switch-track::after {
      transition: none;
    }
  }
</style>
