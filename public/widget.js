(function(){
  if(document.getElementById('elp-widget'))return;
  var s=document.createElement('script');
  s.src='https://mintt-database-production.up.railway.app/vapi-widget.js';
  document.head.appendChild(s);
})();