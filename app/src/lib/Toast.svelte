<script>
  import { toastState } from './toast.svelte.js';
</script>

{#if toastState.message}
  <div id="toast" class="toast" class:is-on={toastState.visible} role="status" aria-live="polite">
    {toastState.message}
  </div>
{/if}
