<script>
  import { onMount } from 'svelte';
  import { dashboard, refreshDashboard } from './dashboard.svelte.js';
  import { relativeTime } from './time.js';

  let now = $state(Date.now());

  onMount(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 30000);
    return () => clearInterval(timer);
  });

  const statusText = $derived.by(() => {
    if (dashboard.connecting) return 'Menghubungkan…';
    if (!dashboard.ready) return 'Memuat…';
    if (dashboard.mode === 'link') return 'Link aktif';
    if (dashboard.mode === 'guest') return 'Mode tamu';
    if (dashboard.authenticated) return 'Sesi aktif';
    return 'Sesi belum tersambung';
  });

  const needsAttention = $derived(
    dashboard.connecting ||
      !dashboard.ready ||
      (!dashboard.authenticated && dashboard.mode !== 'guest')
  );

  const syncText = $derived.by(() => {
    if (dashboard.mode === 'link' && dashboard.updatedAt) {
      return `Link · ${relativeTime(dashboard.updatedAt, now)}`;
    }
    if (dashboard.mode === 'guest') return 'Katalog lokal';
    if (dashboard.updatedAt) return `Tersinkron ${relativeTime(dashboard.updatedAt, now)}`;
    return 'Belum tersinkron';
  });

  const actionLabel = $derived(
    dashboard.mode === 'link'
      ? 'Ganti link'
      : dashboard.mode === 'guest'
        ? 'Hubungkan'
        : 'Refresh'
  );
</script>

<footer class="foot">
  <div class="foot-left">
    <span id="footStatus" class="foot-status">
      <span class="dot" class:amber={needsAttention}></span>
      <span id="footStatusText">{statusText}</span>
    </span>
    <span class="sep">·</span>
    <span id="syncText">{syncText}</span>
  </div>
  <button id="refreshBtn" class="ghost-btn" type="button" onclick={refreshDashboard}>
    <svg><use href="#i-refresh" /></svg>
    <span id="refreshLabel">{actionLabel}</span>
  </button>
</footer>
