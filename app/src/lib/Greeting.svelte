<script>
  import { tick } from 'svelte';
  import { readText, writeText, removeText } from './storage.js';
  import { showToast } from './toast.svelte.js';

  const NAME_KEY = 'sso.name';

  let name = $state(readText(NAME_KEY));
  let editing = $state(false);
  let draft = $state('');
  let inputEl = $state();

  const hasName = $derived(name.trim().length > 0);
  const displayName = $derived(hasName ? name.trim() : 'nama kamu');

  const rawDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  async function openEditor() {
    draft = name;
    editing = true;
    await tick();
    inputEl?.focus();
    inputEl?.select();
  }

  function commit() {
    if (!editing) return;
    editing = false;

    const next = draft.trim().replace(/\s+/g, ' ');
    name = next;
    if (next) writeText(NAME_KEY, next);
    else removeText(NAME_KEY);
    showToast('Nama disimpan.');
  }

  function cancel() {
    if (!editing) return;
    editing = false;
  }

  function onInputKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  }
</script>

<section class="intro">
  <h1 id="greeting">Halo, {#if editing}<input
        id="nameInput"
        class="name-input"
        bind:this={inputEl}
        bind:value={draft}
        placeholder="nama kamu"
        maxlength="40"
        autocomplete="off"
        spellcheck="false"
        aria-label="Nama tampilan"
        onkeydown={onInputKeydown}
        onblur={commit}
      />{:else}<button
        id="nameBtn"
        class="name-btn"
        class:is-empty={!hasName}
        type="button"
        title={hasName ? 'Ubah nama' : 'Atur nama tampilan'}
        aria-label={hasName ? 'Ubah nama tampilan' : 'Atur nama tampilan'}
        onclick={openEditor}
      >{displayName}</button>{/if}.</h1>
  <p class="date">{dateLabel}</p>
</section>
