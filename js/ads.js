/* Adsterra paused on 2026-11-13 after mobile redirects were reported.
 * Keep this URL inert for older cached pages. Re-enable only after review.
 * No remote scripts, iframes, timers or forced-preview bypass.
 */
(function () {
  'use strict';
  function removeAdSlots() {
    document.querySelectorAll('.ad-slot[data-ad]').forEach(function (slot) {
      slot.replaceChildren();
      slot.style.display = 'none';
      slot.setAttribute('data-ad-disabled', '1');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAdSlots, { once: true });
  } else {
    removeAdSlots();
  }
})();
