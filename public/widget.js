(function () {
  if (document.getElementById('mintt-widget')) return;

  // Read the client slug from the script tag's data-client attribute
  // e.g. <script src="...widget.js" data-client="unitech"></script>
  var scripts = document.getElementsByTagName('script');
  var thisScript = scripts[scripts.length - 1];
  var clientSlug = thisScript.getAttribute('data-client') || '';

  if (!clientSlug) {
    console.warn('[Mintt] No data-client attribute found on widget script tag.');
  }

  // Store globally so vapi-widget.js can read it
  window.__minttClientSlug = clientSlug;

  // Load the main widget
  var s = document.createElement('script');
  s.id = 'mintt-widget';
s.src = 'https://mintt-database-production.up.railway.app/vapi-widget.js';
  document.head.appendChild(s);
})();