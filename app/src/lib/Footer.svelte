<script>
  import { linksState } from './links.svelte.js';
  import { relativeTime } from './time.js';

  const active = $derived(linksState.active);
  const statusText = $derived(active ? 'Link aktif' : 'Sesi belum tersambung');
  const syncText = $derived(
    active
      ? `Link · ${linksState.updatedAt ? relativeTime(linksState.updatedAt) : 'baru saja'}`
      : 'Belum tersinkron'
  );
  const actionLabel = $derived(active ? 'Ganti link' : 'Hubungkan');

  function goConnect() {
    location.href = '/connect.html';
  }
</script>

<footer class="foot">
  <div class="foot-left">
    <span id="footStatus" class="foot-status">
      <span class="dot" class:amber={!active}></span>
      <span id="footStatusText">{statusText}</span>
    </span>
    <span class="sep">·</span>
    <span id="syncText">{syncText}</span>
  </div>
  <button id="refreshBtn" class="ghost-btn" type="button" onclick={goConnect}>
    <svg><use href="#i-refresh" /></svg>
    <span id="refreshLabel">{actionLabel}</span>
  </button>
</footer>
