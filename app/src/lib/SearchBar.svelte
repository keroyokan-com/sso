<script>
  let query = $state('');
  let inputEl = $state();

  const hasQuery = $derived(query.length > 0);

  export function focus() {
    inputEl?.focus();
    inputEl?.select();
  }

  function clear() {
    query = '';
    focus();
  }

  function onKeydown(event) {
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);

    const slash =
      event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey;
    const commandK =
      (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';

    if (slash || commandK) {
      event.preventDefault();
      focus();
      return;
    }

    if (event.key === 'Escape' && document.activeElement === inputEl) {
      query = '';
      inputEl.blur();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="search" id="searchWrap">
  <svg class="search-icon"><use href="#i-search" /></svg>
  <input
    id="search"
    bind:this={inputEl}
    bind:value={query}
    type="search"
    placeholder="Cari layanan…"
    autocomplete="off"
    spellcheck="false"
    aria-label="Cari layanan"
  >
  <button
    id="clearBtn"
    class="clear"
    type="button"
    aria-label="Hapus pencarian"
    hidden={!hasQuery}
    onclick={clear}
  >
    <svg><use href="#i-x" /></svg>
  </button>
  <kbd id="searchHint" hidden={hasQuery}>/</kbd>
</div>
