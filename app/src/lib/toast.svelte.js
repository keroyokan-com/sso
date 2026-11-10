const VISIBLE_MS = 3200;
const FADE_MS = 240;

export const toastState = $state({
  message: '',
  visible: false,
});

let hideTimer = 0;
let clearTimer = 0;

export function showToast(message) {
  if (!message) return;

  clearTimeout(hideTimer);
  clearTimeout(clearTimer);

  const wasVisible = toastState.visible;
  toastState.message = message;
  if (!wasVisible) {
    requestAnimationFrame(() => {
      toastState.visible = true;
    });
  }

  hideTimer = setTimeout(() => {
    toastState.visible = false;
    clearTimer = setTimeout(() => {
      toastState.message = '';
    }, FADE_MS);
  }, VISIBLE_MS);
}
