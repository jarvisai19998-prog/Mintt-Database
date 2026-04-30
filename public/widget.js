(function(){
  if(document.getElementById('elp-widget'))return;
  var s=document.createElement('script');
  s.src='http://localhost:3000/vapi-widget.js';
  document.head.appendChild(s);
})();