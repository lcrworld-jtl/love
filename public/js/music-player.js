// 全局音乐播放器 - 跨页面连续播放
// 原理：每个页面都加载此脚本，通过 localStorage 保存/恢复播放状态
// 在 index/lover 页面：检测到 app.js 已初始化播放器则跳过
// 在其他页面：自动注入播放器 UI + 初始化 + 从 localStorage 恢复播放进度

(function () {
  'use strict';

  // iframe 模式：音乐播放器由顶层 shell 常驻提供，本页不再注入
  if (window.self !== window.top) return;

  // 如果页面已有 app.js 管理的播放器，跳过（避免双重初始化）
  if (document.getElementById('music-player')) return;

  // ===== 注入播放器 HTML =====
  const playerHtml = `
    <div class="music-player" id="music-player">
      <div class="music-cover" id="music-cover">
        <svg viewBox="0 0 24 24" fill="currentColor" class="music-cover-default"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
      </div>
      <div class="music-info">
        <div class="music-name" id="music-name">未播放</div>
        <div class="music-status" id="music-status">加载中...</div>
      </div>
      <button class="music-toggle" id="music-toggle">
        <svg viewBox="0 0 24 24" fill="currentColor" id="music-icon">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
    </div>
    <div class="music-playlist" id="music-playlist">
      <div class="playlist-header">
        <span>播放列表</span>
        <button class="playlist-close" id="playlist-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="playlist-body" id="playlist-body"></div>
    </div>
    <div class="playlist-overlay" id="playlist-overlay"></div>
  `;
  document.body.insertAdjacentHTML('beforeend', playerHtml);

  // ===== 播放器逻辑（与 app.js 中的 initMusicPlayer 保持一致） =====
  const player = document.getElementById('music-player');
  const cover = document.getElementById('music-cover');
  const nameEl = document.getElementById('music-name');
  const statusEl = document.getElementById('music-status');
  const toggleBtn = document.getElementById('music-toggle');
  const iconEl = document.getElementById('music-icon');
  const playlistPanel = document.getElementById('music-playlist');
  const playlistOverlay = document.getElementById('playlist-overlay');
  const playlistClose = document.getElementById('playlist-close');
  const playlistBody = document.getElementById('playlist-body');

  let audio = null;
  let songs = [];
  let currentIdx = 0;
  let isPlaying = false;
  // 请求令牌：每次切歌自增，用于作废上一次仍在进行中的异步加载/播放结果
  let loadToken = 0;

  const PLAY_ICON = '<path d="M8 5v14l11-7z"/>';
  const PAUSE_ICON = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  const PLAYING_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  // ===== 跨页面播放状态持久化 =====
  function saveMusicState() {
    try {
      const state = {
        idx: currentIdx,
        songId: songs[currentIdx] ? songs[currentIdx].id : null,
        playing: isPlaying,
        time: audio ? audio.currentTime : 0,
        ts: Date.now()
      };
      localStorage.setItem('love_music', JSON.stringify(state));
    } catch (e) {}
  }

  function loadMusicState() {
    try {
      const raw = localStorage.getItem('love_music');
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (Date.now() - state.ts > 30 * 60 * 1000) {
        localStorage.removeItem('love_music');
        return null;
      }
      return state;
    } catch (e) { return null; }
  }

  // 页面离开前保存播放进度
  window.addEventListener('beforeunload', saveMusicState);
  // 定时保存进度（每 5 秒），防止意外关闭
  setInterval(saveMusicState, 5000);

  async function loadPlaylist() {
    try {
      const res = await fetch('/api/music/playlist');
      const data = await res.json();
      if (data.songs && data.songs.length > 0) {
        songs = data.songs;
        renderPlaylist();

        // 检查是否有跨页面恢复的状态
        const saved = loadMusicState();
        // 歌单顺序/内容可能被调整，优先按歌曲 ID 匹配恢复，避免旧索引错位
        let restoreIdx = -1;
        if (saved && saved.songId && songs.length) {
          restoreIdx = songs.findIndex(s => String(s.id) === String(saved.songId));
        }
        if (restoreIdx === -1 && saved && saved.idx < songs.length) {
          restoreIdx = saved.idx;
        }
        if (restoreIdx >= 0) {
          currentIdx = restoreIdx;
          updateCover(songs[currentIdx]);
          nameEl.textContent = songs[currentIdx].name;
          if (saved.playing) {
            statusEl.textContent = '恢复播放...';
            playSong(currentIdx, saved.time || 0);
          } else {
            statusEl.textContent = '已暂停';
            iconEl.innerHTML = PLAY_ICON;
          }
          renderPlaylist();
        } else {
          updateCover(songs[0]);
          nameEl.textContent = songs[0].name;
          statusEl.textContent = '点击播放';
        }
      }
    } catch (e) {
      nameEl.textContent = '加载失败';
      statusEl.textContent = '请刷新重试';
    }
  }

  function updateCover(song) {
    if (song.picUrl) {
      cover.innerHTML = `<img src="${song.picUrl}" alt="${escapeHtml(song.name)}" referrerpolicy="no-referrer">`;
    } else {
      cover.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" class="music-cover-default"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
    }
  }

  function renderPlaylist() {
    playlistBody.innerHTML = songs.map((song, i) => `
      <div class="playlist-item ${i === currentIdx ? 'active' : ''}" data-idx="${i}">
        <div class="playlist-item-cover">
          ${song.picUrl ? `<img src="${song.picUrl}" alt="" referrerpolicy="no-referrer">` : ''}
        </div>
        <div class="playlist-item-info">
          <div class="playlist-item-name ${i === currentIdx ? 'active' : ''}">${escapeHtml(song.name)}</div>
          <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
        </div>
        ${i === currentIdx ? `<div class="playlist-item-playing">${PLAYING_ICON}</div>` : ''}
      </div>
    `).join('');

    playlistBody.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx);
        if (idx !== currentIdx) {
          playSong(idx);
        }
        closePlaylist();
      });
    });
  }

  function openPlaylist() {
    playlistPanel.classList.add('show');
    playlistOverlay.classList.add('show');
  }

  function closePlaylist() {
    playlistPanel.classList.remove('show');
    playlistOverlay.classList.remove('show');
  }

  player.addEventListener('click', (e) => {
    if (e.target.closest('.music-toggle')) return;
    openPlaylist();
  });

  playlistClose.addEventListener('click', closePlaylist);
  playlistOverlay.addEventListener('click', closePlaylist);

  async function playSong(idx, startTime) {
    if (!songs.length) return;

    // 令牌自增：让任何仍在进行中的旧加载/播放结果全部作废
    const token = ++loadToken;

    currentIdx = idx;
    const song = songs[idx];
    nameEl.textContent = song.name;
    statusEl.textContent = '加载中...';
    updateCover(song);
    renderPlaylist();

    // 清理旧音频，避免旧歌继续发声
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = '';
      audio = null;
    }

    try {
      const res = await fetch('/api/music/url?id=' + song.id);
      if (token !== loadToken) return; // 已被更新的切歌取代
      const data = await res.json();
      if (token !== loadToken) return;

      if (!data.url) {
        statusEl.textContent = '无版权，跳过';
        setTimeout(() => {
          if (token === loadToken) playSong((currentIdx + 1) % songs.length);
        }, 1500);
        return;
      }

      const newAudio = new Audio(data.url);
      newAudio.volume = 0.4;

      newAudio.onended = () => {
        if (audio !== newAudio) return;
        playSong((currentIdx + 1) % songs.length);
      };

      newAudio.onerror = () => {
        if (audio !== newAudio) return;
        statusEl.textContent = '播放失败，跳过';
        if (songs.length > 1) {
          setTimeout(() => {
            if (audio === newAudio) playSong((currentIdx + 1) % songs.length);
          }, 2000);
        }
      };

      audio = newAudio;

      // 跨页面恢复：先设置播放进度再播放
      if (startTime && startTime > 0) {
        await new Promise((resolve) => {
          const onMeta = () => {
            newAudio.currentTime = startTime;
            resolve();
          };
          if (newAudio.readyState >= 1) {
            onMeta();
          } else {
            newAudio.addEventListener('loadedmetadata', onMeta, { once: true });
          }
        });
      }

      await newAudio.play();
      if (token !== loadToken) return; // 播放期间又被切了歌，放弃
      isPlaying = true;
      iconEl.innerHTML = PAUSE_ICON;
      cover.classList.add('spinning');
      statusEl.textContent = '播放中';
      saveMusicState();

    } catch (e) {
      if (token !== loadToken) return;
      isPlaying = false;
      iconEl.innerHTML = PLAY_ICON;
      cover.classList.remove('spinning');
      statusEl.textContent = '点击播放';
    }
  }

  function togglePlay() {
    if (!songs.length) return;

    if (isPlaying && audio) {
      audio.pause();
      isPlaying = false;
      iconEl.innerHTML = PLAY_ICON;
      cover.classList.remove('spinning');
      statusEl.textContent = '已暂停';
      saveMusicState();
    } else {
      if (audio && audio.src) {
        audio.play().then(() => {
          isPlaying = true;
          iconEl.innerHTML = PAUSE_ICON;
          cover.classList.add('spinning');
          statusEl.textContent = '播放中';
          saveMusicState();
        }).catch(() => {});
      } else {
        playSong(currentIdx);
      }
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  loadPlaylist();
})();
