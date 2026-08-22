// Love 站点互动组件 - 留言墙 / 语音留言 / 打字机情书
// 所有方法挂在 window.LoveWidgets 上

(function () {
  'use strict';

  const { api, showToast } = window.LoveCommon;

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
  }

  function timeAgo(iso) {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 2592000000) return Math.floor(diff / 86400000) + ' 天前';
    return new Date(iso).toLocaleDateString('zh-CN');
  }

  // ===== ALTCHA(人机验证) 组件辅助 =====
  let altchaScriptLoading = null;
  function loadAltchaWidgetScript() {
    if (typeof window.customElements === 'undefined') return Promise.resolve();
    if (customElements.get('altcha-widget')) return Promise.resolve();
    if (altchaScriptLoading) return altchaScriptLoading;
    altchaScriptLoading = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = '/js/altcha-widget.min.js';
      s.type = 'module';
      s.onload = () => {
        const check = () => customElements.get('altcha-widget') ? resolve() : setTimeout(check, 40);
        check();
      };
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
    return altchaScriptLoading;
  }

  // 向容器内的 .altcha-box 注入验证码组件（每个容器只注入一次）
  function ensureAltchaBox(container) {
    const box = container.querySelector('.altcha-box');
    if (!box || box.dataset.altchaReady) return;
    box.dataset.altchaReady = '1';
    loadAltchaWidgetScript().then(() => {
      if (customElements.get('altcha-widget')) {
        const w = document.createElement('altcha-widget');
        w.setAttribute('challengeurl', '/api/captcha/challenge');
        box.appendChild(w);
      } else {
        box.innerHTML = '<div style="font-size:12px;color:#999;">验证码组件加载失败，请刷新页面后重试</div>';
      }
    });
  }

  // 取容器的验证码状态（未完成时返回 null）
  function getAltchaState(container) {
    const w = container && container.querySelector('altcha-widget');
    if (!w || typeof w.getState !== 'function') return null;
    const st = w.getState();
    if (!st || !st.solution) return null;
    return st;
  }

  // ===== 留言墙 =====
  async function loadMessages(container) {
    const data = await api('/api/messages');
    if (!data) return;
    renderMessages(container, data.messages || []);
  }

  function renderMessages(container, messages) {
    const list = container.querySelector('.msg-list');
    const count = messages.length;
    const countEl = container.querySelector('.msg-count');
    if (countEl) countEl.textContent = count;

    if (!count) {
      list.innerHTML = '<div class="msg-empty">还没有留言，做第一个吧</div>';
      return;
    }
    list.innerHTML = messages.map(m => `
      <div class="msg-card">
        <div class="msg-avatar">${escapeHtml((m.name || '匿').charAt(0))}</div>
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-name">${escapeHtml(m.name)}</span>
            <span class="msg-time">${timeAgo(m.time)}</span>
          </div>
          <div class="msg-content">${escapeHtml(m.content)}</div>
        </div>
      </div>
    `).join('');
  }

  async function submitMessage(container) {
    const nameInput = container.querySelector('.msg-input-name');
    const contentInput = container.querySelector('.msg-input-content');
    const name = nameInput.value.trim();
    const content = contentInput.value.trim();
    if (!content) {
      showToast('留言内容不能为空');
      return;
    }
    const altcha = getAltchaState(container);
    if (!altcha) {
      showToast('请先完成人机验证');
      return;
    }
    const btn = container.querySelector('.msg-submit');
    if (btn) btn.disabled = true;
    const data = await api('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || '匿名', content, altcha })
    });
    if (btn) btn.disabled = false;
    if (data) {
      contentInput.value = '';
      showToast('留言已提交，审核后将展示');
    }
  }

  // 渲染留言墙区块
  function renderMessageWall() {
    const container = document.createElement('div');
    container.className = 'section';
    container.innerHTML = `
      <div class="card msg-wall">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          <span>留言墙</span>
          <span class="msg-count-badge"><span class="msg-count">0</span> 条</span>
        </div>
        <div class="msg-form">
          <input type="text" class="msg-input-name" placeholder="昵称（选填）" maxlength="20">
          <textarea class="msg-input-content" placeholder="写下你想说的话..." maxlength="500" rows="2"></textarea>
          <div class="altcha-box"></div>
          <button class="msg-submit">送出</button>
        </div>
        <div class="msg-list"></div>
      </div>
    `;
    container.querySelector('.msg-submit').addEventListener('click', () => submitMessage(container));
    ensureAltchaBox(container);
    loadMessages(container);
    return container;
  }

  // ===== 语音留言 =====
  let mediaRecorder = null;
  let audioChunks = [];
  let recordTimer = null;
  let recordStart = 0;

  async function startRecording(btn, statusEl, container) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      // 优先 webm，回退 mp3
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp3') ? 'audio/mp3'
        : '';
      mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: mime || 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await uploadVoice(blob, btn, statusEl, mime || 'audio/webm', container);
      };
      mediaRecorder.start();
      recordStart = Date.now();
      btn.classList.add('recording');
      btn.innerHTML = '<span class="rec-dot"></span>停止';
      statusEl.textContent = '录制中...';
      statusEl.classList.add('recording');
      recordTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - recordStart) / 1000);
        statusEl.textContent = '录制中 ' + sec + 's';
        if (sec >= 60) stopRecording(btn, statusEl);
      }, 200);
    } catch (e) {
      showToast('无法访问麦克风：' + (e.message || '权限被拒绝'));
    }
  }

  function stopRecording(btn, statusEl) {
    if (recordTimer) { clearInterval(recordTimer); recordTimer = null; }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    btn.classList.remove('recording');
    btn.innerHTML = '按住说话 / 点击录音';
    statusEl.classList.remove('recording');
    statusEl.textContent = '上传中...';
  }

  async function uploadVoice(blob, btn, statusEl, mime, container) {
    const altcha = getAltchaState(container);
    if (!altcha) {
      statusEl.textContent = '';
      showToast('请先完成人机验证，再重新录制');
      return;
    }
    const duration = Math.floor((Date.now() - recordStart) / 1000);
    try {
      const res = await fetch('/api/voice/upload?duration=' + duration + '&from=' + encodeURIComponent('匿名') + '&altcha=' + encodeURIComponent(JSON.stringify(altcha)), {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: blob
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast('语音已上传，审核后将展示');
        statusEl.textContent = '已录制 ' + duration + 's';
      } else {
        showToast(data.error || '上传失败');
        statusEl.textContent = '上传失败';
      }
    } catch (e) {
      showToast('网络错误');
      statusEl.textContent = '上传失败';
    }
  }

  async function loadVoices(container) {
    const data = await api('/api/voice');
    if (!data) return;
    const list = container.querySelector('.voice-list');
    const voices = data.voices || [];
    if (!voices.length) {
      list.innerHTML = '<div class="msg-empty">还没有语音留言</div>';
      return;
    }
    list.innerHTML = voices.map(v => `
      <div class="voice-card">
        <div class="voice-info">
          <div class="voice-from">${escapeHtml(v.from)}</div>
          <div class="voice-meta">${timeAgo(v.time)} · ${v.duration}s</div>
        </div>
        <audio controls preload="none" src="/voice/${escapeHtml(v.filename)}"></audio>
      </div>
    `).join('');
  }

  function renderVoiceWall() {
    const container = document.createElement('div');
    container.className = 'section';
    container.innerHTML = `
      <div class="card voice-wall">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
          <span>语音留言</span>
        </div>
        <div class="voice-recorder">
          <button class="voice-btn">按住说话 / 点击录音</button>
          <div class="voice-status"></div>
          <div class="altcha-box"></div>
        </div>
        <div class="voice-list"></div>
      </div>
    `;
    const recBtn = container.querySelector('.voice-btn');
    const statusEl = container.querySelector('.voice-status');
    recBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording(recBtn, statusEl);
      } else {
        startRecording(recBtn, statusEl, container);
      }
    });
    ensureAltchaBox(container);
    loadVoices(container);
    return container;
  }

  // ===== 打字机情书 =====
  function renderTypewriterLetter(texts) {
    // texts: 字符串数组，每个元素一段
    const container = document.createElement('div');
    container.className = 'section';
    container.innerHTML = `
      <div class="card letter-card">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span>致 · 一封信</span>
        </div>
        <div class="letter-body" id="letter-body"></div>
      </div>
    `;
    setTimeout(() => runTypewriter(container.querySelector('#letter-body'), texts), 800);
    return container;
  }

  function runTypewriter(el, texts) {
    if (!texts || !texts.length) return;
    let textIdx = 0;
    let charIdx = 0;
    let currentP = null;

    function nextChar() {
      if (textIdx >= texts.length) {
        // 完成
        el.classList.add('done');
        return;
      }
      const text = texts[textIdx];
      if (charIdx === 0) {
        currentP = document.createElement('p');
        currentP.className = 'letter-p';
        el.appendChild(currentP);
      }
      if (charIdx < text.length) {
        currentP.textContent += text[charIdx];
        charIdx++;
        setTimeout(nextChar, 50 + Math.random() * 60);
      } else {
        // 段落结束，停顿后下一段
        charIdx = 0;
        textIdx++;
        setTimeout(nextChar, 600);
      }
    }
    nextChar();
  }

  // 动态创建的 .section 在 setupRevealAnimation() 之后才插入 DOM，
  // 全局 IntersectionObserver 不会观察到它们，会一直停留在 opacity:0。
  // 这里在插入后用一个新的 observer 兜底，进入视口就 add .revealed。
  function autoReveal(container) {
    if (!('IntersectionObserver' in window)) {
      container.classList.add('revealed');
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    obs.observe(container);
  }

  // 暴露
  window.LoveWidgets = {
    renderMessageWall: function () {
      const c = renderMessageWall();
      autoReveal(c);
      return c;
    },
    renderVoiceWall: function () {
      const c = renderVoiceWall();
      autoReveal(c);
      return c;
    },
    renderTypewriterLetter: function (texts) {
      const c = renderTypewriterLetter(texts);
      autoReveal(c);
      return c;
    },
    loadMessages: loadMessages,
    loadVoices: loadVoices
  };
})();
