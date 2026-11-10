<script>
  import { tick } from 'svelte';
  import { getLang, t } from './i18n.svelte.js';
  import { readText, writeText, removeText } from './storage.js';
  import { showToast } from './toast.svelte.js';

  const NAME_KEY = 'sso.name';

  let name = $state(readText(NAME_KEY));
  let editing = $state(false);
  let draft = $state('');
  let inputEl = $state();

  const hasName = $derived(name.trim().length > 0);
  const displayName = $derived(hasName ? name.trim() : t('greeting.fallbackName'));

  const dateLabel = $derived.by(() => {
    const locale = getLang() === 'en' ? 'en-GB' : 'id-ID';
    const rawDate = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    return rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  });

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
    showToast(t('greeting.nameSaved'));
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
  <h1 id="greeting">{t('greeting.hello')}, {#if editing}<input
        id="nameInput"
        class="name-input"
        bind:this={inputEl}
        bind:value={draft}
        placeholder={t('greeting.fallbackName')}
        maxlength="40"
        autocomplete="off"
        spellcheck="false"
        aria-label={t('greeting.nameAria')}
        onkeydown={onInputKeydown}
        onblur={commit}
      />{:else}<button
        id="nameBtn"
        class="name-btn"
        class:is-empty={!hasName}
        type="button"
        title={hasName ? t('greeting.changeName') : t('greeting.setName')}
        aria-label={hasName ? t('greeting.changeNameAria') : t('greeting.setName')}
        onclick={openEditor}
      >{displayName}</button>{/if}.</h1>
  <p class="date">{dateLabel}</p>
</section>
