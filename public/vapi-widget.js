(function () {
  if (document.getElementById('elp-widget')) return;

  var BASE_URL = 'https://mintt-database-production.up.railway.app';
  var clientSlug = window.__minttClientSlug || '';

  if (!clientSlug) {
    console.warn('[Mintt] No client slug found — widget will not load.');
    return;
  }

  // Fetch client config first, then build the widget
  fetch(BASE_URL + '/widget/config?slug=' + encodeURIComponent(clientSlug))
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg.vapiPublicKey || !cfg.vapiAssistantId) {
        console.warn('[Mintt] Voice agent not configured for this client.');
        return;
      }
      buildWidget(cfg);
    })
    .catch(function (e) {
      console.error('[Mintt] Failed to load widget config:', e);
    });

  function darken(hex) {
    // Makes a slightly darker shade for gradient second stop
    var n = parseInt(hex.replace('#', ''), 16);
    var r = Math.max(0, (n >> 16) - 30);
    var g = Math.max(0, ((n >> 8) & 0xff) - 30);
    var b = Math.max(0, (n & 0xff) - 30);
    return '#' + [r, g, b].map(function (x) {
      return x.toString(16).padStart(2, '0');
    }).join('');
  }

  function buildWidget(cfg) {
    var color1 = cfg.primaryColor;
    var color2 = darken(cfg.primaryColor);
    var personaName = cfg.personaName;
    var companyName = cfg.companyName;
    var endCallMessage = cfg.endCallMessage;

    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap';
    document.head.appendChild(font);

    var st = document.createElement('style');
    st.textContent = [
      '@keyframes elp-ring{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.06)}}',
      '@keyframes elp-blink{0%,100%{opacity:1}50%{opacity:0.3}}',
      '@keyframes elp-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}',
      '@keyframes elp-in{from{opacity:0;transform:translateY(16px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '#elp-fab-wrap{position:fixed;bottom:28px;right:28px;z-index:99999;width:64px;height:64px;}',
      '#elp-ring1{position:absolute;inset:-8px;border-radius:50%;border:1px solid ' + color1 + '4d;animation:elp-ring 2s ease-in-out infinite;}',
      '#elp-ring2{position:absolute;inset:-18px;border-radius:50%;border:1px solid ' + color1 + '26;animation:elp-ring 2s ease-in-out infinite 0.4s;}',
      '#elp-fab{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,' + color1 + ',' + color2 + ');border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px ' + color1 + '66,0 2px 8px rgba(0,0,0,0.2);position:relative;z-index:1;transition:transform .2s;}',
      '#elp-fab:hover{transform:scale(1.08);}',
      '#elp-fab.active{background:linear-gradient(135deg,#dc2626,#b91c1c);}',
      '#elp-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;border-radius:50%;background:#22c55e;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;}',
      '#elp-badge::after{content:"";width:6px;height:6px;border-radius:50%;background:#fff;animation:elp-blink 1.5s infinite;}',
      '#elp-overlay{display:none;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);}',
      '#elp-overlay.open{display:block;}',
      '#elp-modal{position:fixed;bottom:108px;right:28px;z-index:99999;width:340px;background:#0f0f0f;border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5),0 0 0 0.5px rgba(255,255,255,0.08);display:none;font-family:"Inter",sans-serif;}',
      '#elp-modal.open{display:block;animation:elp-in .25s ease;}',
      '.elp-header{padding:18px 18px 0;display:flex;align-items:center;justify-content:space-between;}',
      '.elp-brand{display:flex;align-items:center;gap:11px;}',
      '.elp-icon{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,' + color1 + ',' + color2 + ');display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px ' + color1 + '59;}',
      '.elp-name{font-size:14px;font-weight:600;color:#fff;letter-spacing:-.01em;}',
      '.elp-live{font-size:11px;color:#555;margin-top:2px;display:flex;align-items:center;gap:5px;}',
      '.elp-live-dot{width:5px;height:5px;border-radius:50%;background:#22c55e;animation:elp-blink 1.5s infinite;}',
      '.elp-close{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.08);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#555;font-size:14px;font-family:inherit;transition:all .15s;}',
      '.elp-close:hover{background:rgba(255,255,255,0.1);color:#fff;}',
      '.elp-divider{height:0.5px;background:rgba(255,255,255,0.07);margin:14px 18px;}',
      '.elp-status{margin:0 18px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;}',
      '.elp-status-icon{width:32px;height:32px;border-radius:8px;background:' + color1 + '26;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.elp-status-label{font-size:12px;font-weight:500;color:#fff;margin-bottom:2px;}',
      '.elp-status-sub{font-size:11px;color:#555;line-height:1.4;}',
      '.elp-chat{margin:10px 18px;min-height:60px;max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;}',
      '.elp-row{display:flex;flex-direction:column;}',
      '.elp-row.user{align-items:flex-end;}',
      '.elp-lbl{font-size:10px;color:#444;margin-bottom:3px;letter-spacing:.03em;}',
      '.elp-bubble{font-size:12.5px;padding:9px 13px;border-radius:11px;line-height:1.55;max-width:88%;}',
      '.elp-bubble.ai{background:rgba(255,255,255,0.06);color:#ccc;border:0.5px solid rgba(255,255,255,0.08);}',
      '.elp-bubble.user{background:linear-gradient(135deg,' + color1 + ',' + color2 + ');color:#fff;}',
      '.elp-typing{display:flex;align-items:center;gap:4px;padding:10px 13px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;width:fit-content;}',
      '.elp-typing span{width:5px;height:5px;border-radius:50%;background:#555;display:block;}',
      '.elp-typing span:nth-child(1){animation:elp-bounce 0.9s infinite;}',
      '.elp-typing span:nth-child(2){animation:elp-bounce 0.9s infinite 0.15s;}',
      '.elp-typing span:nth-child(3){animation:elp-bounce 0.9s infinite 0.3s;}',
      '.elp-footer{padding:12px 18px 18px;}',
      '#elp-start{width:100%;height:48px;border-radius:12px;background:linear-gradient(135deg,' + color1 + ',' + color2 + ');border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;font-weight:600;color:#fff;letter-spacing:-.01em;font-family:"Inter",sans-serif;box-shadow:0 4px 20px ' + color1 + '4d;transition:all .2s;}',
      '#elp-start:hover{box-shadow:0 6px 28px ' + color1 + '73;transform:translateY(-1px);}',
      '#elp-start:disabled{opacity:0.6;cursor:not-allowed;transform:none;}',
      '#elp-end{width:100%;height:48px;border-radius:12px;background:rgba(220,38,38,0.12);border:0.5px solid rgba(220,38,38,0.3);cursor:pointer;display:none;align-items:center;justify-content:center;gap:10px;font-size:14px;font-weight:600;color:#ef4444;letter-spacing:-.01em;font-family:"Inter",sans-serif;transition:all .2s;}',
      '#elp-end:hover{background:rgba(220,38,38,0.22);}',
      '.elp-note{text-align:center;font-size:10.5px;color:#2a2a2a;margin-top:10px;letter-spacing:.02em;}'
    ].join('');
    document.head.appendChild(st);

    var phoneIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/></svg>';
    var chatIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';

    var wrap = document.createElement('div');
    wrap.id = 'elp-fab-wrap';
    wrap.innerHTML = [
      '<div id="elp-ring1"></div>',
      '<div id="elp-ring2"></div>',
      '<button id="elp-fab">' + chatIcon + '</button>',
      '<div id="elp-badge"></div>'
    ].join('');
    document.body.appendChild(wrap);

    var overlay = document.createElement('div');
    overlay.id = 'elp-overlay';
    document.body.appendChild(overlay);

    var modal = document.createElement('div');
    modal.id = 'elp-modal';
    modal.innerHTML = [
      '<div class="elp-header">',
        '<div class="elp-brand">',
          '<div class="elp-icon">' + chatIcon + '</div>',
          '<div><div class="elp-name">' + personaName + '</div><div class="elp-live"><span class="elp-live-dot"></span>Available 24/7</div></div>',
        '</div>',
        '<button class="elp-close" id="elp-close">✕</button>',
      '</div>',
      '<div class="elp-divider"></div>',
      '<div class="elp-status">',
        '<div class="elp-status-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + color1 + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>',
        '<div><div class="elp-status-label" id="elp-status-label">Ready to connect</div><div class="elp-status-sub" id="elp-status-sub">Click below — uses your microphone</div></div>',
      '</div>',
      '<div class="elp-chat" id="elp-chat"></div>',
      '<div class="elp-footer">',
        '<button id="elp-start">' + phoneIcon + 'Start AI Call</button>',
        '<button id="elp-end"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/></svg>End Call</button>',
        '<div class="elp-note">Powered by Mintt</div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);

    var w = document.createElement('div');
    w.id = 'elp-widget';
    document.body.appendChild(w);

    function open() { modal.classList.add('open'); overlay.classList.add('open'); }
    function close() { modal.classList.remove('open'); overlay.classList.remove('open'); }

    document.getElementById('elp-fab').onclick = open;
    document.getElementById('elp-close').onclick = close;
    overlay.onclick = close;

    function setStatus(label, sub) {
      document.getElementById('elp-status-label').textContent = label;
      document.getElementById('elp-status-sub').textContent = sub;
    }

    function addMsg(role, text) {
      hideTyping();
      var chat = document.getElementById('elp-chat');
      var row = document.createElement('div');
      row.className = 'elp-row' + (role === 'user' ? ' user' : '');
      var lbl = document.createElement('div');
      lbl.className = 'elp-lbl';
      lbl.textContent = role === 'ai' ? personaName : 'You';
      var bubble = document.createElement('div');
      bubble.className = 'elp-bubble ' + (role === 'ai' ? 'ai' : 'user');
      bubble.textContent = text;
      row.appendChild(lbl);
      row.appendChild(bubble);
      chat.appendChild(row);
      chat.scrollTop = chat.scrollHeight;
    }

    function showTyping() {
      if (document.getElementById('elp-typing-row')) return;
      var chat = document.getElementById('elp-chat');
      var row = document.createElement('div');
      row.className = 'elp-row';
      row.id = 'elp-typing-row';
      var lbl = document.createElement('div');
      lbl.className = 'elp-lbl';
      lbl.textContent = personaName;
      var typing = document.createElement('div');
      typing.className = 'elp-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      row.appendChild(lbl);
      row.appendChild(typing);
      chat.appendChild(row);
      chat.scrollTop = chat.scrollHeight;
    }

    function hideTyping() {
      var t = document.getElementById('elp-typing-row');
      if (t) t.remove();
    }

    var vapi = null;

    document.getElementById('elp-start').onclick = function () {
      document.getElementById('elp-start').textContent = 'Connecting...';
      document.getElementById('elp-start').disabled = true;
      setStatus('Connecting...', 'Loading AI assistant');

      import('https://esm.sh/@vapi-ai/web').then(function (module) {
        var VapiClass = module.default || module.Vapi;
        if (!VapiClass) {
          setStatus('Error', 'Could not load AI — try again');
          document.getElementById('elp-start').disabled = false;
          document.getElementById('elp-start').textContent = 'Start AI Call';
          return;
        }

        vapi = new VapiClass(cfg.vapiPublicKey);

        vapi.on('call-start', function () {
          document.getElementById('elp-start').style.display = 'none';
          document.getElementById('elp-end').style.display = 'flex';
          document.getElementById('elp-fab').classList.add('active');
          setStatus('Connected', 'Speak now — I\'m listening');
          showTyping();
        });

        vapi.on('call-end', function () {
          document.getElementById('elp-end').style.display = 'none';
          document.getElementById('elp-start').style.display = 'flex';
          document.getElementById('elp-start').disabled = false;
          document.getElementById('elp-start').innerHTML = phoneIcon + 'Start AI Call';
          document.getElementById('elp-fab').classList.remove('active');
          hideTyping();
          setStatus('Call complete', 'Our team will follow up shortly');
          addMsg('ai', endCallMessage);
        });

        vapi.on('speech-start', function () { showTyping(); });
        vapi.on('speech-end', function () { hideTyping(); });

        vapi.on('message', function (m) {
          if (m.type === 'transcript' && m.transcriptType === 'final') {
            hideTyping();
            addMsg(m.role === 'assistant' ? 'ai' : 'user', m.transcript);
            if (m.role === 'assistant') setTimeout(showTyping, 400);
          }
        });

        vapi.on('error', function (e) {
          console.error(e);
          setStatus('Error', 'Something went wrong — try again');
          document.getElementById('elp-start').disabled = false;
          document.getElementById('elp-start').innerHTML = phoneIcon + 'Start AI Call';
        });

        vapi.start(cfg.vapiAssistantId);

      }).catch(function (e) {
        console.error(e);
        setStatus('Error', e.message);
        document.getElementById('elp-start').disabled = false;
        document.getElementById('elp-start').innerHTML = phoneIcon + 'Start AI Call';
      });
    };

    document.getElementById('elp-end').onclick = function () { if (vapi) vapi.stop(); };
  }
})();