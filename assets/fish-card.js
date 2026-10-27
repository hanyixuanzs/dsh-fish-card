(function () {
  if (window.__dshFishCard) return
  window.__dshFishCard = true

  // ============================================================
  // 命名空间（与 dsh-whale-widget 完全隔离，已实测对方占用）：
  //   CSS    .dfc-*      （对方 .dshwv-*）
  //   DOM    [data-dfc-*]（对方 .dshwv-root）
  //   存储   dfc-*       （对方 dshw-*）
  //   全局   本文件顶部那个唯一标记（对方 window.__dshWhale*）
  //   层级   2147482000  （对方最高 2147483600，本鲸在其下）
  // ============================================================

  var Z = 2147482000
  var KEY_POS = 'dfc-pos'
  var KEY_SIZE = 'dfc-size'
  var KEY_MODE = 'dfc-mode'
  var KEY_SHOWBTN = 'dfc-showbtn'
  var KEY_FREQ = 'dfc-freq'

  var MODES = {
    daily: { label: '天天看', freqMin: 2, fade: false },
    glance: { label: '偶尔瞥', freqMin: 30, fade: true },
  }
  var FADE_OPACITY = 0.45
  var MULTI_CLICK_MS = 3000

  // ---------- 小工具 ----------
  function load(key, fallback) {
    try {
      var v = localStorage.getItem(key)
      return v === null ? fallback : v
    } catch (err) {
      return fallback
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, String(value))
    } catch (err) {}
  }
  function loadJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null')
    } catch (err) {
      return null
    }
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v))
  }

  // ---------- 只在主聊天界面挂载 ----------
  function isChatRoot(r) {
    if (!r || !r.querySelector) return false
    return !!(
      r.querySelector('[data-composer-input]') ||
      r.querySelector('[data-composer-seat],[data-composer-card]') ||
      r.querySelector('textarea') ||
      r.querySelector('[contenteditable="true"]') ||
      r.querySelector('[role="textbox"][aria-multiline="true"]')
    )
  }

  // ---------- 样式（只注入一次，全部前缀 dfc-） ----------
  var CSS = [
    '[data-dfc-root]{position:fixed;left:18px;bottom:18px;z-index:' + Z + ';',
    'width:240px;box-sizing:border-box;border-radius:14px;',
    'background:rgba(16,22,34,.88);backdrop-filter:blur(12px);',
    'border:1px solid rgba(120,180,255,.22);box-shadow:0 10px 30px rgba(0,0,0,.42);',
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#dbe7ff;',
    'user-select:none;transition:opacity .28s ease;display:flex;flex-direction:column;}',
    '[data-dfc-root].dfc-faded{opacity:' + FADE_OPACITY + ';}',
    '[data-dfc-root]:hover{opacity:1;}',
    '[data-dfc-head]{display:flex;align-items:center;gap:6px;padding:9px 10px 0 12px;cursor:grab;flex:0 0 auto;}',
    '[data-dfc-root].dfc-dragging [data-dfc-head]{cursor:grabbing;}',
    '[data-dfc-dot]{width:7px;height:7px;border-radius:50%;background:#5ad27d;flex:0 0 auto;}',
    '[data-dfc-status]{font-size:12px;letter-spacing:.12em;color:#8fc0ff;}',
    '[data-dfc-gear]{margin-left:auto;font-size:13px;color:#6f8fbb;cursor:pointer;',
    'padding:0 2px;line-height:1;}',
    '[data-dfc-gear]:hover{color:#a9cdff;}',
    '[data-dfc-body]{display:flex;gap:10px;padding:8px 12px 0 12px;flex:1 1 auto;min-height:0;}',
    // 2026-10-26：缩略图不再用固定 88×122 硬撑。
    // 卡片变矮时，盒子按 88:122 比例整体缩小（max-height:100% 顶到 body 高度即停），
    // 里面的 img 用 object-fit:contain 把小人完整塞进变小的盒子里，绝不再半截身子露在外面。
    '[data-dfc-avatar]{position:relative;flex:0 0 auto;height:122px;width:auto;max-height:100%;aspect-ratio:88/122;min-height:36px;}',
    '[data-dfc-avatar] img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;}',
    '[data-dfc-tail]{transform-origin:67.6% 85.2%;animation:dfc-tailwag 2s ease-in-out infinite;}',
    '@keyframes dfc-tailwag{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}',
    // 2026-10-26：文字不再按固定字数砍，改成按「卡片实际能放几行」决定省略。
    // -webkit-line-clamp 会在被截断的那行末尾自动补「…」，且文字放得下时完全不省略。
    // 行数由 JS 按卡片高度算好后写到 -webkit-line-clamp 上。
    '[data-dfc-line]{flex:1 1 0;min-width:0;min-height:0;font-size:13px;line-height:1.6;color:#e8f0ff;',
    'overflow-wrap:anywhere;word-break:break-word;',
    'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:6;overflow:hidden;}',
    '[data-dfc-root].dfc-h [data-dfc-line]{min-height:0;}',
    '[data-dfc-foot]{padding:8px 12px 10px;flex:0 0 auto;}',
    '[data-dfc-call]{width:100%;padding:6px 0;border-radius:9px;',
    'border:1px solid rgba(127,182,255,.36);background:rgba(90,150,255,.15);',
    'color:#a9cdff;font-size:12px;letter-spacing:.14em;cursor:pointer;}',
    '[data-dfc-call]:hover{background:rgba(90,150,255,.28);}',
    '[data-dfc-call]:active{transform:scale(.98);}',
    '[data-dfc-root].dfc-bounce{transform:scale(1.04);}',
    '[data-dfc-handle]{position:absolute;right:2px;bottom:2px;width:14px;height:14px;',
    'cursor:nwse-resize;opacity:.45;}',
    '[data-dfc-handle]:before{content:"";display:block;width:8px;height:8px;margin:3px;',
    'border-right:1px solid #8fc0ff;border-bottom:1px solid #8fc0ff;}',
    '[data-dfc-panel]{margin-top:8px;padding:8px;border-radius:9px;flex:0 0 auto;',
    'background:rgba(255,255,255,.05);font-size:11px;line-height:1.9;}',
    '[data-dfc-panel] label{display:flex;align-items:center;gap:6px;cursor:pointer;}',
    '[data-dfc-panel] button{width:100%;margin-top:6px;padding:4px 0;border-radius:6px;',
    'border:1px solid rgba(127,182,255,.3);background:transparent;color:#a9cdff;',
    'font-size:11px;cursor:pointer;}',
    // ---- 动效（2026-10-25）：呼吸 + 状态点脉冲，全部 CSS，不占主线程 ----
    '@keyframes dfc-breathe{0%{transform:scale(1) rotate(0deg)}30%{transform:scale(1.025) rotate(-2.2deg)}60%{transform:scale(1.03) rotate(1.6deg)}100%{transform:scale(1) rotate(0deg)}}',
    '@keyframes dfc-pulse{0%{box-shadow:0 0 0 0 rgba(90,210,125,.5)}70%{box-shadow:0 0 0 7px rgba(90,210,125,0)}100%{box-shadow:0 0 0 0 rgba(90,210,125,0)}}',
    '[data-dfc-avatar]{animation:dfc-breathe 5.4s ease-in-out infinite;transform-origin:50% 82%;transition:transform .18s ease;}',
    '[data-dfc-avatar]:hover{animation:none;transform:scale(1.05);}',
    '[data-dfc-root][data-dfc-state="awake"] [data-dfc-dot]{background:#5ad27d;animation:dfc-pulse 2.4s ease-out infinite;}',
    '[data-dfc-root][data-dfc-state="idle"] [data-dfc-dot]{background:#8fc0ff;opacity:.8;}',
    '[data-dfc-root][data-dfc-state="sleep"] [data-dfc-dot]{background:#8b7cf0;opacity:.5;}',
    '@media (prefers-reduced-motion:reduce){[data-dfc-avatar]{animation:none}[data-dfc-dot]{animation:none}}',
    '@keyframes dfc-flash{0%{color:#fff;text-shadow:0 0 10px rgba(127,182,255,.8)}100%{color:#e8f0ff;text-shadow:none}}',
    '[data-dfc-line].dfc-new{animation:dfc-flash .9s ease;}',
  ].join('')

  function ensureStyle() {
    if (document.getElementById('dfc-style')) return
    var s = document.createElement('style')
    s.id = 'dfc-style'
    s.textContent = CSS
    document.head.appendChild(s)
  }

  // ---------- 状态 ----------
  var el = null
  var statusEl = null
  var lineEl = null
  var avatarEl = null
  var bodyImgEl = null
  var tailImgEl = null
  var callBtn = null
  var panelEl = null
  var pollTimer = null
  var lastPayload = ''
  var clickTimes = []
  var drag = null

  function mode() {
    var m = load(KEY_MODE, 'daily')
    return MODES[m] ? m : 'daily'
  }
  function freqMs() {
    var custom = Number(load(KEY_FREQ, '0'))
    var minutes = custom > 0 ? custom : MODES[mode()].freqMin
    return Math.max(30, minutes) * 1000
  }

  // ---------- 构建 DOM ----------
  function build() {
    ensureStyle()
    var box = document.createElement('div')
    box.setAttribute('data-dfc-root', '')
    box.innerHTML =
      '<div data-dfc-head>' +
        '<span data-dfc-dot></span>' +
        '<span data-dfc-status></span>' +
        '<span data-dfc-gear title="设置">⚙</span>' +
      '</div>' +
      '<div data-dfc-body>' +
        '<div data-dfc-avatar>' +
          '<img data-dfc-tail alt="" hidden>' +
          '<img data-dfc-bodyimg alt="" hidden>' +
        '</div>' +
        '<div data-dfc-line></div>' +
      '</div>' +
      '<div data-dfc-foot>' +
        '<button type="button" data-dfc-call>叫本鲸</button>' +
      '</div>' +
      '<div data-dfc-handle title="拖动调整大小"></div>'
    document.body.appendChild(box)

    statusEl = box.querySelector('[data-dfc-status]')
    lineEl = box.querySelector('[data-dfc-line]')
    avatarEl = box.querySelector('[data-dfc-avatar]')
    bodyImgEl = box.querySelector('[data-dfc-bodyimg]')
    tailImgEl = box.querySelector('[data-dfc-tail]')
    callBtn = box.querySelector('[data-dfc-call]')

    // 图挂了就整层隐藏，不留破图
    ;[bodyImgEl, tailImgEl].forEach(function (img) {
      if (!img) return
      img.addEventListener('error', function () {
        img.hidden = true
      })
    })

    restoreGeometry(box)
    applyMode(box)
    bindDrag(box)
    bindResize(box)
    bindGear(box)
    bindCall(box)
    return box
  }

  // ---------- 位置与大小 ----------
  function restoreGeometry(box) {
    var pos = loadJson(KEY_POS)
    var size = loadJson(KEY_SIZE)
    if (size && size.w) {
      box.style.width = clamp(Number(size.w) || 240, 180, 520) + 'px'
    }
    if (size && size.h) {
      box.style.height = clamp(Number(size.h) || 0, 140, 640) + 'px'
      box.classList.add('dfc-h')
    }
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      box.style.left = pos.x + 'px'
      box.style.top = pos.y + 'px'
      box.style.bottom = 'auto'
    }
  }

  function persistGeometry(box) {
    var r = box.getBoundingClientRect()
    save(KEY_POS, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }))
    save(KEY_SIZE, JSON.stringify({
      w: Math.round(r.width),
      h: box.classList.contains('dfc-h') ? Math.round(r.height) : 0,
    }))
  }

  function bindDrag(box) {
    var head = box.querySelector('[data-dfc-head]')
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('[data-dfc-gear]')) return
      e.preventDefault()
      var r = box.getBoundingClientRect()
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }
      box.classList.add('dfc-dragging')
      try {
        head.setPointerCapture(e.pointerId)
      } catch (err) {}
    })
    head.addEventListener('pointermove', function (e) {
      if (!drag) return
      var vw = window.innerWidth
      var vh = window.innerHeight
      var r = box.getBoundingClientRect()
      var x = clamp(e.clientX - drag.dx, 0, Math.max(0, vw - r.width))
      var y = clamp(e.clientY - drag.dy, 0, Math.max(0, vh - r.height))
      box.style.left = x + 'px'
      box.style.top = y + 'px'
      box.style.bottom = 'auto'
    })
    head.addEventListener('pointerup', function () {
      if (!drag) return
      drag = null
      box.classList.remove('dfc-dragging')
      avoidNeighbour(box)
      persistGeometry(box)
    })
  }

  // ---------- 按卡片实际高度决定省略行数 ----------
  // 2026-10-26：用户要求「根据卡片大小选择省略」。
  // 做法：放开 -webkit-line-clamp 量出全文自然高度，再与 body 可用高度比较。
  //   · 放得下 → clamp 设极大，整句完整显示，不补「…」；
  //   · 放不下（缩小卡片 / 固定高度 dfc-h）→ 按每行 13px×1.6 反推能塞几行，多余补「…」。
  function fitLineClamp(box) {
    if (!lineEl) return
    var fs = parseFloat(getComputedStyle(lineEl).fontSize) || 13
    var lh = fs * 1.6
    var bodyEl = lineEl.parentElement
    // 先放开 clamp，量自然高度
    lineEl.style.webkitLineClamp = 'none'
    var natural = lineEl.scrollHeight
    // body 内容可用高度 = clientHeight 减去上 padding(8)
    var avail = (bodyEl ? bodyEl.clientHeight : lineEl.clientHeight) - 8
    if (avail <= 0) {
      lineEl.style.webkitLineClamp = '6'
      return
    }
    if (natural <= avail + 1) {
      // 放得下：全显示
      lineEl.style.webkitLineClamp = '999'
    } else {
      var n = Math.max(1, Math.min(60, Math.floor(avail / lh)))
      lineEl.style.webkitLineClamp = String(n)
    }
  }

  function bindResize(box) {
    var handle = box.querySelector('[data-dfc-handle]')
    var resizing = null
    handle.addEventListener('pointerdown', function (e) {
      e.preventDefault()
      e.stopPropagation()
      var r = box.getBoundingClientRect()
      resizing = { x: e.clientX, y: e.clientY, w: r.width, h: r.height }
      // 一上手就把当前高度钉住，避免中途切布局跳一下
      box.style.height = Math.round(r.height) + 'px'
      box.classList.add('dfc-h')
      try {
        handle.setPointerCapture(e.pointerId)
      } catch (err) {}
    })
    handle.addEventListener('pointermove', function (e) {
      if (!resizing) return
      // 两维一起拉：宽 180–520，高 140–640（最小抬高到能容下缩小后的小人 + 头尾）
      box.style.width = clamp(resizing.w + (e.clientX - resizing.x), 180, 520) + 'px'
      box.style.height = clamp(resizing.h + (e.clientY - resizing.y), 140, 640) + 'px'
      // 卡片尺寸实时变：立刻按新高度重算文字省略行数
      fitLineClamp(box)
    })
    handle.addEventListener('pointerup', function () {
      if (!resizing) return
      resizing = null
      persistGeometry(box)
    })
  }

  /**
   * 单向避让：只读对方的位置，绝不改它。
   * 对方根节点是 .dshwv-root（公开的 CSS 类，只读安全）。
   */
  function avoidNeighbour(box) {
    var theirs = document.querySelector('.dshwv-root')
    if (!theirs) return
    var a = box.getBoundingClientRect()
    var b = theirs.getBoundingClientRect()
    var gap = 10
    var overlapX = a.right + gap > b.left && a.left - gap < b.right
    var overlapY = a.bottom + gap > b.top && a.top - gap < b.bottom
    if (!(overlapX && overlapY)) return

    // 朝「推开的位移更小」的那一侧躲
    var leftward = a.left + a.width / 2 < b.left + b.width / 2
    var nx = leftward ? b.left - a.width - gap : b.right + gap
    var ny = a.top
    nx = clamp(nx, 0, Math.max(0, window.innerWidth - a.width))
    ny = clamp(ny, 0, Math.max(0, window.innerHeight - a.height))
    box.style.left = Math.round(nx) + 'px'
    box.style.top = Math.round(ny) + 'px'
    box.style.bottom = 'auto'
  }

  // ---------- 模式与淡出 ----------
  function applyMode(box) {
    box.classList.toggle('dfc-faded', MODES[mode()].fade)
  }

  // ---------- 设置面板 ----------
  function bindGear(box) {
    var gear = box.querySelector('[data-dfc-gear]')
    gear.addEventListener('click', function (e) {
      e.stopPropagation()
      if (panelEl) {
        panelEl.remove()
        panelEl = null
        return
      }
      panelEl = buildPanel(box)
      box.appendChild(panelEl)
    })
  }

  function buildPanel(box) {
    var p = document.createElement('div')
    p.setAttribute('data-dfc-panel', '')

    var mDaily = mode() === 'daily' ? ' checked' : ''
    var mGlance = mode() === 'glance' ? ' checked' : ''
    var btnChecked = load(KEY_SHOWBTN, '1') === '1' ? ' checked' : ''
    var curFreq = Number(load(KEY_FREQ, '0')) || 0

    p.innerHTML =
      '<label><input type="radio" name="dfc-mode" value="daily"' + mDaily + '>天天看</label>' +
      '<label><input type="radio" name="dfc-mode" value="glance"' + mGlance + '>偶尔瞥</label>' +
      '<label>频率 <input data-dfc-freq type="number" min="1" max="240" value="' +
        (curFreq || '') + '" placeholder="' + MODES[mode()].freqMin +
        '" style="width:52px;background:transparent;color:#a9cdff;border:1px solid rgba(127,182,255,.3);border-radius:4px;padding:1px 4px;"> 分钟</label>' +
      '<label><input data-dfc-showbtn type="checkbox"' + btnChecked + '>显示「叫本鲸」</label>' +
      '<button type="button" data-dfc-reset>回到左下角</button>'

    p.addEventListener('click', function (e) {
      e.stopPropagation()
    })

    p.querySelectorAll('input[name="dfc-mode"]').forEach(function (input) {
      input.addEventListener('change', function () {
        save(KEY_MODE, input.value)
        applyMode(box)
        restartPolling()
      })
    })

    var freqInput = p.querySelector('[data-dfc-freq]')
    freqInput.addEventListener('change', function () {
      var v = Number(freqInput.value)
      if (v > 0) save(KEY_FREQ, String(v))
      else save(KEY_FREQ, '0')
      restartPolling()
    })

    var btnCheck = p.querySelector('[data-dfc-showbtn]')
    btnCheck.addEventListener('change', function () {
      save(KEY_SHOWBTN, btnCheck.checked ? '1' : '0')
      callBtn.style.display = btnCheck.checked ? '' : 'none'
    })

    p.querySelector('[data-dfc-reset]').addEventListener('click', function () {
      box.style.left = '18px'
      box.style.top = ''
      box.style.bottom = '18px'
      box.style.width = '240px'
      box.style.height = ''
      box.classList.remove('dfc-h')
      try {
        localStorage.removeItem(KEY_POS)
        localStorage.removeItem(KEY_SIZE)
      } catch (err) {}
    })

    return p
  }

  // ---------- 叫本鲸 ----------
  function bindCall(box) {
    callBtn.addEventListener('click', function (e) {
      e.stopPropagation()
      var now = Date.now()
      clickTimes = clickTimes.filter(function (t) {
        return now - t < MULTI_CLICK_MS
      })
      clickTimes.push(now)

      // 连按（3 秒内 2 次以上）：本地反馈，不调模型、不花钱
      if (clickTimes.length > 1) {
        box.classList.add('dfc-bounce')
        setTimeout(function () {
          box.classList.remove('dfc-bounce')
        }, 160)
        return
      }

      // 单次：调模型，回一句，只显示在卡片上
      callBtn.disabled = true
      callBtn.textContent = '…'
      fetch('/dsh-fish/call', { method: 'POST' })
        .then(function (r) {
          return r.ok ? r.json() : null
        })
        .then(function (data) {
          if (data && data.line) {
            lineEl.textContent = data.line
            // 新句子到了：闪一下，让人注意到她开口了
            lineEl.classList.add('dfc-new')
            setTimeout(function () {
              lineEl.classList.remove('dfc-new')
            }, 900)
            lastPayload = ''
          }
        })
        .catch(function () {})
        .then(function () {
          callBtn.disabled = false
          callBtn.textContent = '叫本鲸'
        })
    })

    if (load(KEY_SHOWBTN, '1') !== '1') callBtn.style.display = 'none'
  }

  // ---------- 数据 ----------
  function render(data) {
    if (!data) return
    var status = String(data.status || '')
    if (statusEl) statusEl.textContent = status
    // 状态点跟着状态走：醒着=绿+脉冲，空闲=蓝，睡觉=紫且更暗
    if (el) {
      var state = status.indexOf('睡') >= 0 ? 'sleep' : (status.indexOf('醒') >= 0 ? 'awake' : 'idle')
      el.setAttribute('data-dfc-state', state)
    }
    if (lineEl) lineEl.textContent = String(data.line || '')
    // 文字变了：按当前卡片高度重算省略行数
    fitLineClamp(el)
    // 分层形象：先上尾巴层，再上身体层（尾巴在身体后面）
    if (data.hasAvatar && bodyImgEl && bodyImgEl.hidden) {
      bodyImgEl.hidden = false
      bodyImgEl.src = '/dsh-fish/avatar.png'
    }
    if (data.hasTail && tailImgEl && tailImgEl.hidden) {
      tailImgEl.hidden = false
      tailImgEl.src = '/dsh-fish/tail.png'
    }
  }

  function refresh() {
    fetch('/dsh-fish/card.json', { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.text() : ''
      })
      .then(function (text) {
        if (!text || text === lastPayload) return
        lastPayload = text
        try {
          render(JSON.parse(text))
        } catch (err) {}
      })
      .catch(function () {})
  }

  function restartPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(refresh, freqMs())
    refresh()
  }

  // ---------- 挂载 ----------
  var started = false
  function mount() {
    if (started) return
    started = true
    el = build()
    // 挂载成功：立刻摘掉观察器。
    // 对面 dsh-whale-widget 常驻两个 MutationObserver，本鲸不能再叠第三个。
    if (observer) {
      observer.disconnect()
      observer = null
    }
    restartPolling()
  }

  var observer = null

  function probe() {
    if (isChatRoot(document.body)) mount()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', probe)
  } else {
    probe()
  }

  if (typeof MutationObserver === 'function') {
    observer = new MutationObserver(function () {
      if (started) {
        observer.disconnect()
        observer = null
        return
      }
      probe()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
})()
