(function () {
  if (document.getElementById('mintt-widget')) return;

  var BASE_URL = 'https://mintt-database-production.up.railway.app';
  var clientSlug = window.__minttClientSlug || '';

  if (!clientSlug) {
    console.warn('[Mintt] No client slug found — widget will not load.');
    return;
  }

  fetch(BASE_URL + '/widget/config?slug=' + encodeURIComponent(clientSlug))
    .then(function (r) { return r.json(); })
    .then(function (cfg) { buildWidget(cfg); })
    .catch(function (e) { console.error('[Mintt] Failed to load widget config:', e); });

  function darken(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    var r = Math.max(0, (n >> 16) - 30);
    var g = Math.max(0, ((n >> 8) & 0xff) - 30);
    var b = Math.max(0, (n & 0xff) - 30);
    return '#' + [r, g, b].map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  function buildWidget(cfg) {
    var color1 = cfg.primaryColor || '#00c96b';
    var color2 = darken(color1);
    var personaName = cfg.personaName || 'AI Assistant';
    var companyName = cfg.companyName || 'Us';

    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap';
    document.head.appendChild(font);

    var st = document.createElement('style');
    st.textContent = [
      '@keyframes mintt-in{from{opacity:0;transform:translateY(16px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '@keyframes mintt-blink{0%,100%{opacity:1}50%{opacity:0.3}}',
      '@keyframes mintt-ring{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.06)}}',
      '#mintt-fab-wrap{position:fixed;bottom:28px;right:28px;z-index:99999;width:64px;height:64px;}',
      '#mintt-ring1{position:absolute;inset:-8px;border-radius:50%;border:1px solid ' + color1 + '4d;animation:mintt-ring 2s ease-in-out infinite;}',
      '#mintt-ring2{position:absolute;inset:-18px;border-radius:50%;border:1px solid ' + color1 + '26;animation:mintt-ring 2s ease-in-out infinite 0.4s;}',
      '#mintt-fab{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,' + color1 + ',' + color2 + ');border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px ' + color1 + '66,0 2px 8px rgba(0,0,0,0.2);position:relative;z-index:1;transition:transform .2s;}',
      '#mintt-fab:hover{transform:scale(1.08);}',
      '#mintt-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;border-radius:50%;background:#22c55e;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;}',
      '#mintt-badge::after{content:"";width:6px;height:6px;border-radius:50%;background:#fff;animation:mintt-blink 1.5s infinite;}',
      '#mintt-overlay{display:none;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);}',
      '#mintt-overlay.open{display:block;}',
      '#mintt-modal{position:fixed;bottom:108px;right:28px;z-index:99999;width:340px;background:#0f0f0f;border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5),0 0 0 0.5px rgba(255,255,255,0.08);display:none;font-family:"Inter",sans-serif;}',
      '#mintt-modal.open{display:block;animation:mintt-in .25s ease;}',
      '.mintt-header{padding:18px 18px 0;display:flex;align-items:center;justify-content:space-between;}',
      '.mintt-brand{display:flex;align-items:center;gap:11px;}',
      '.mintt-icon{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,' + color1 + ',' + color2 + ');display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.mintt-name{font-size:14px;font-weight:600;color:#fff;letter-spacing:-.01em;}',
      '.mintt-live{font-size:11px;color:#555;margin-top:2px;display:flex;align-items:center;gap:5px;}',
      '.mintt-live-dot{width:5px;height:5px;border-radius:50%;background:#22c55e;animation:mintt-blink 1.5s infinite;}',
      '.mintt-close{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.08);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#555;font-size:14px;transition:all .15s;}',
      '.mintt-close:hover{background:rgba(255,255,255,0.1);color:#fff;}',
      '.mintt-divider{height:0.5px;background:rgba(255,255,255,0.07);margin:14px 18px;}',
      '.mintt-body{padding:0 18px 18px;}',
      '.mintt-intro{font-size:13px;color:#888;line-height:1.6;margin-bottom:16px;}',
      '.mintt-intro strong{color:#ccc;}',
      '.mintt-input-wrap{position:relative;margin-bottom:12px;}',
      '.mintt-input{width:100%;height:48px;border-radius:12px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.12);color:#fff;font-size:15px;font-family:"Inter",sans-serif;padding:0 14px;box-sizing:border-box;outline:none;transition:border .15s;}',
      '.mintt-input:focus{border-color:' + color1 + ';}',
      '.mintt-input::placeholder{color:#444;}',
      '.mintt-btn{width:100%;height:48px;border-radius:12px;background:linear-gradient(135deg,' + color1 + ',' + color2 + ');border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;font-weight:600;color:#fff;font-family:"Inter",sans-serif;box-shadow:0 4px 20px ' + color1 + '4d;transition:all .2s;}',
      '.mintt-btn:hover{transform:translateY(-1px);box-shadow:0 6px 28px ' + color1 + '73;}',
      '.mintt-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}',
      '.mintt-status{text-align:center;font-size:12px;color:#555;margin-top:10px;min-height:18px;}',
      '.mintt-status.success{color:#22c55e;}',
      '.mintt-status.error{color:#ef4444;}',
      '.mintt-note{text-align:center;font-size:10.5px;color:#2a2a2a;margin-top:12px;}',
    ].join('');
    document.head.appendChild(st);

    var chatIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
    var phoneIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/></svg>';

    var wrap = document.createElement('div');
    wrap.id = 'mintt-fab-wrap';
    wrap.innerHTML = '<div id="mintt-ring1"></div><div id="mintt-ring2"></div><button id="mintt-fab">' + chatIcon + '</button><div id="mintt-badge"></div>';
    document.body.appendChild(wrap);

    var overlay = document.createElement('div');
    overlay.id = 'mintt-overlay';
    document.body.appendChild(overlay);

    var modal = document.createElement('div');
    modal.id = 'mintt-modal';
    modal.innerHTML = [
      '<div class="mintt-header">',
        '<div class="mintt-brand">',
          '<div class="mintt-icon">' + chatIcon + '</div>',
          '<div><div class="mintt-name">' + personaName + '</div>',
          '<div class="mintt-live"><span class="mintt-live-dot"></span>Available 24/7</div></div>',
        '</div>',
        '<button class="mintt-close" id="mintt-close">✕</button>',
      '</div>',
      '<div class="mintt-divider"></div>',
      '<div class="mintt-body">',
        '<p class="mintt-intro">Hi! I\'m <strong>' + personaName + '</strong> from <strong>' + companyName + '</strong>. Enter your phone number and I\'ll call you right now.</p>',
        '<input class="mintt-input" id="mintt-phone" type="tel" placeholder="Your phone number" />',
        '<button class="mintt-btn" id="mintt-call-btn">' + phoneIcon + 'Call me now</button>',
        '<div class="mintt-status" id="mintt-status"></div>',
        '<div class="mintt-note">Powered by Mintt</div>',
      '</div>',
    ].join('');
    document.body.appendChild(modal);

    var w = document.createElement('div');
    w.id = 'mintt-widget';
    document.body.appendChild(w);

    function open() { modal.classList.add('open'); overlay.classList.add('open'); }
    function close() { modal.classList.remove('open'); overlay.classList.remove('open'); }

    document.getElementById('mintt-fab').onclick = open;
    document.getElementById('mintt-close').onclick = close;
    overlay.onclick = close;

    document.getElementById('mintt-call-btn').onclick = function () {
      var phone = document.getElementById('mintt-phone').value.trim();
      if (!phone) {
        setStatus('Please enter your phone number.', 'error');
        return;
      }

      var btn = document.getElementById('mintt-call-btn');
      btn.disabled = true;
      btn.innerHTML = phoneIcon + 'Calling you...';
      setStatus('', '');

      fetch(BASE_URL + '/widget/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, clientSlug: clientSlug }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            setStatus('📞 Calling you now! Pick up in a moment.', 'success');
            btn.innerHTML = phoneIcon + 'Call requested!';
          } else {
            setStatus(data.error || 'Something went wrong. Try again.', 'error');
            btn.disabled = false;
            btn.innerHTML = phoneIcon + 'Call me now';
          }
        })
        .catch(function () {
          setStatus('Connection error. Please try again.', 'error');
          btn.disabled = false;
          btn.innerHTML = phoneIcon + 'Call me now';
        });
    };

    function setStatus(msg, type) {
      var el = document.getElementById('mintt-status');
      el.textContent = msg;
      el.className = 'mintt-status' + (type ? ' ' + type : '');
    }
  }
})();