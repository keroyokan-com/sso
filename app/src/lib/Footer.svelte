<script>
  import { onMount } from 'svelte';
  import { dashboard, refreshDashboard } from './dashboard.svelte.js';
  import { t } from './i18n.svelte.js';
  import { relativeTime } from './time.js';

  let now = $state(Date.now());

  onMount(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 30000);
    return () => clearInterval(timer);
  });

  const statusText = $derived.by(() => {
    if (dashboard.connecting) return t('footer.connecting');
    if (!dashboard.ready) return t('footer.loading');
    if (dashboard.expired) return t('footer.expired');
    if (dashboard.mode === 'link') return t('footer.linkActive');
    if (dashboard.mode === 'guest') return t('footer.guest');
    if (dashboard.authenticated) return t('footer.active');
    return t('footer.disconnected');
  });

  const needsAttention = $derived(
    dashboard.connecting ||
      !dashboard.ready ||
      dashboard.expired ||
      (!dashboard.authenticated && dashboard.mode !== 'guest')
  );

  const syncText = $derived.by(() => {
    if (dashboard.expired) return '';
    if (dashboard.mode === 'link' && dashboard.updatedAt) {
      return t('footer.linkTime', { time: relativeTime(dashboard.updatedAt, now) });
    }
    if (dashboard.mode === 'guest') return '';
    if (dashboard.updatedAt) {
      return t('footer.synced', { time: relativeTime(dashboard.updatedAt, now) });
    }
    return t('footer.notSynced');
  });

  const actionLabel = $derived.by(() => {
    if (dashboard.expired) return t('footer.connect');
    if (dashboard.mode === 'link') return t('footer.changeLink');
    if (dashboard.mode === 'guest') return t('footer.connect');
    return t('footer.refresh');
  });
</script>

<footer class="foot">
  <div class="foot-left">
    <span id="footStatus" class="foot-status">
      <span class="dot" class:amber={needsAttention}></span>
      <span id="footStatusText">{statusText}</span>
    </span>
    {#if syncText}
      <span class="sep">·</span>
      <span id="syncText">{syncText}</span>
    {/if}
  </div>
  <button
    id="refreshBtn"
    class="ghost-btn"
    class:spinning={dashboard.refreshing}
    type="button"
    disabled={dashboard.refreshing}
    aria-busy={dashboard.refreshing}
    onclick={refreshDashboard}
  >
    <svg><use href="#i-refresh" /></svg>
    <span id="refreshLabel">{actionLabel}</span>
  </button>
</footer>
