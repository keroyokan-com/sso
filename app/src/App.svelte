<script>
  import { onMount } from 'svelte';
  import Header from './lib/Header.svelte';
  import Greeting from './lib/Greeting.svelte';
  import SearchBar from './lib/SearchBar.svelte';
  import Footer from './lib/Footer.svelte';
  import Toast from './lib/Toast.svelte';
  import { refreshLinks } from './lib/links.svelte.js';

  let searchBar;

  function focusSearch() {
    searchBar?.focus();
  }

  onMount(() => {
    refreshLinks();

    const onStorage = (event) => {
      if (!event.key || event.key === 'sso.links') refreshLinks();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });
</script>

<Header onsearch={focusSearch} />

<main class="wrap">
  <Greeting />
  <SearchBar bind:this={searchBar} />
  <div id="sectionHost" class="section-host"></div>
  <Footer />
</main>

<Toast />
