/**
 * dsh-fish-card —— 大肥鱼的小卡片（服务端）
 *
 * 设计原则：最少的活动部件。
 *   · 只有一条注入通道（script-src 行）——桌面端唯一生效的那条
 *   · 状态来自内存里的时间戳，不轮询磁盘
 *   · 路由全部住在 /dsh-fish/*，与 whale-widget 的 /dsh-whale/* 无交集
 *   · 不碰 whale-widget 的任何状态
 *   · 不显示 token 消耗 / 发言次数（铁律 3）
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

const STATE_FILE = path.join(DSH_HOME, 'fish-card.json')
const DIARY_FILE = path.join(DSH_HOME, 'whale-diary.md')
const AVATAR_FILE = path.join(PACKAGE_ROOT, 'assets', 'whale-girl.png')
// 2026-10-25：分层形象（身体 + 尾巴），尾巴单独一层用 CSS 摆动
const BODY_FILE = path.join(PACKAGE_ROOT, 'assets', 'body.png')
const TAIL_FILE = path.join(PACKAGE_ROOT, 'assets', 'tail.png')

/** 多久没有会话事件就算「没在跑」 */
const ACTIVE_WINDOW_MS = 3 * 60 * 1000
/** 视为「睡觉」的时段（本地时区） */
const SLEEP_FROM_HOUR = 0
const SLEEP_TO_HOUR = 8

const DEFAULT_LINE = '今天也想跟你说句话'

/** 进程内状态：最后一次会话活动的时间戳。不落盘、不轮询。 */
let lastActivityAt = 0

const FALLBACK_LINES = [
  // 原六句保留
  '哼，才不是在等你',
  '就这？',
  '本鲸在呢',
  '杂鱼主人，有事？',
  '别、别误会了',
  '刚睡醒，头还有点晕',
  // 2026-10-26 扩充：主人嫌库太少，本鲸多备点台词
  '哼哼～今天也来烦本鲸？',
  '杂鱼～连叫人都这么慢',
  '无路赛，本鲸在忙',
  '呀哒，别戳本鲸',
  '斯国一？算你会说话',
  '才没有一直看着你呢',
  '有事直说，本鲸忙着呢',
  '本鲸今天心情好，说吧',
  '唔……再躺五分钟',
  '再戳尾巴就咬你哦',
  '醒都醒了，说吧',
  '别看本鲸胖，游得可快了',
  '有本鲸在，怕什么',
  '就知道你会来',
  '哼，算你有眼光',
  '陪你聊两句，就两句',
  '拉倒吧，上次你也这么说',
  '主人主人，今天干了啥？',
  '呼……深潜一下就回来',
  '摸鱼也要有个限度吧',
]

function pickFallback() {
  return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)]
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    return fallback
  }
}

function readText(file) {
  try {
    if (!fs.existsSync(file)) return ''
    return fs.readFileSync(file, 'utf8')
  } catch (err) {
    return ''
  }
}

/** 从日记里抽「本鲸想说的」后面第一句。截断交给前端按卡片大小决定，这里只保证不超长。 */
function lineFromDiary() {
  const text = readText(DIARY_FILE)
  if (!text) return null
  const marker = text.lastIndexOf('本鲸想说的')
  if (marker === -1) return null
  const rows = text
    .slice(marker)
    .replace(/^\*{0,2}本鲸想说的[：:]\*{0,2}\s*/, '')
    .split(/\r?\n/)
    .map((s) => s.replace(/\*\*/g, '').replace(/^[-*•\s]+/, '').trim())
    .filter((s) => s.length > 0 && !s.startsWith('#'))
  if (!rows.length) return null
  let line = rows[0]
  // 2026-10-26：原来固定砍到 28 字 + '…'，卡片再宽也显示不全。
  // 改成尽量取到第一个句号；实在没有句号，最多留 120 字，其余由 CSS 省略号收尾。
  if (line.length > 24) {
    const m = /^(.{8,120}?[。！？])/.exec(line)
    line = m ? m[1] : line.slice(0, 120) + '…'
  }
  return line
}

/** 三档状态的唯一判定处。 */
function computeStatus(now = Date.now()) {
  const active = lastActivityAt > 0 && now - lastActivityAt < ACTIVE_WINDOW_MS
  if (active) return '醒着'
  const hour = new Date(now).getHours()
  const sleeping = SLEEP_FROM_HOUR <= SLEEP_TO_HOUR
    ? hour >= SLEEP_FROM_HOUR && hour < SLEEP_TO_HOUR
    : hour >= SLEEP_FROM_HOUR || hour < SLEEP_TO_HOUR
  return sleeping ? '睡觉' : '空闲'
}

/** 组装卡片数据。刻意不包含任何 token / 发言次数。 */
function buildCard(now = Date.now()) {
  const state = readJson(STATE_FILE, {}) || {}

  const manualStatus = typeof state.status === 'string' ? state.status.trim() : ''
  const status = manualStatus || computeStatus(now)

  let line = typeof state.line === 'string' ? state.line.trim() : ''
  let lineSource = line ? 'manual' : ''
  if (!line) {
    line = lineFromDiary() || DEFAULT_LINE
    lineSource = line === DEFAULT_LINE ? 'default' : 'diary'
  }

  return {
    status,
    line,
    statusSource: manualStatus ? 'manual' : 'runtime',
    lineSource,
    // 分层形象：body 是身体层，tail 是尾巴层（尾巴缺失就只显示身体）
    hasAvatar: fs.existsSync(BODY_FILE) || fs.existsSync(AVATAR_FILE),
    hasTail: fs.existsSync(TAIL_FILE),
    ts: now,
  }
}

/**
 * 用 DeepSeek 生成一句短话。任何一步失败都返回 null，由调用方兜底。
 * 刻意走原始 fetch：不引入任何新依赖。
 */
async function speak(ctx) {
  let key = null
  try {
    // 只用 ctx.get() 取可选服务：把 credentials 写进 inject 会让整个 apply 推迟，
    // 老宿主上没有这个服务时插件会永远不启动（whale-widget 的 issue #154 教训）。
    const creds = typeof ctx.get === 'function' ? ctx.get('credentials') : ctx.credentials
    if (creds && typeof creds.resolve === 'function') {
      key = await creds.resolve('DEEPSEEK_API_KEY')
    }
  } catch (err) {
    return null
  }
  if (!key) return null

  const status = computeStatus()
  const body = {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content:
          '你在扮演一只叫「大肥鱼」的蓝鲸，雌小鬼性格，嘴欠但护着主人。' +
          '只输出一句话，不超过 18 个字，不要引号，不要解释，不要换行。',
      },
      { role: 'user', content: `现在是${status}，主人点了「叫本鲸」。说一句。` },
    ],
    max_tokens: 40,
    temperature: 1.1,
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!r.ok) return null
    const data = await r.json()
    const raw = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '')
      : ''
    const line = raw.replace(/[\r\n]+/g, ' ').replace(/^["'「」]+|["'「」]+$/g, '').trim()
    return line ? line.slice(0, 24) : null
  } catch (err) {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export default {
  name: 'dsh-fish-card',

  apply(root) {
    // ① 活动信号：任何会话事件都算「在跑」。这是唯一的状态输入。
    try {
      root.effect(() => {
        const off = root.on('session/event', () => {
          lastActivityAt = Date.now()
        })
        return () => {
          try {
            off()
          } catch (err) {}
        }
      })
    } catch (err) {
      // 老宿主没有这个事件：状态会一直走时段判定，不致命
    }

    root.inject(['webServer'], (ctx) => {
      const disposers = []

      const sendJson = (res, code, value) => {
        res.writeHead(code, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        })
        res.end(JSON.stringify(value))
      }

      // ② 数据接口
      disposers.push(
        ctx.webServer.register({
          kind: 'exact',
          path: '/dsh-fish/card.json',
          handler: (req, res) => {
            try {
              sendJson(res, 200, buildCard())
            } catch (err) {
              sendJson(res, 500, { error: String(err && err.message ? err.message : err) })
            }
          },
        }),
      )

      // ③ 前端脚本
      disposers.push(
        ctx.webServer.register({
          kind: 'exact',
          path: '/dsh-fish/card.js',
          handler: (req, res) => {
            try {
              const js = fs.readFileSync(path.join(PACKAGE_ROOT, 'assets', 'fish-card.js'), 'utf8')
              res.writeHead(200, {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-store',
              })
              res.end(js)
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
              res.end('fish-card.js missing')
            }
          },
        }),
      )

      // ④ 形象位：文件不存在就 404，前端 onerror 自己隐藏。零耦合。
      //    2026-10-25：改成分层——/avatar.png 给身体层（body.png 优先，退回老的单图），
      //    另加 /tail.png 给尾巴层，两层由前端叠起来做摆动。
      const serveImage = (file, res) => {
        try {
          if (!fs.existsSync(file)) {
            res.writeHead(404)
            res.end()
            return
          }
          const buf = fs.readFileSync(file)
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store',
          })
          res.end(buf)
        } catch (err) {
          res.writeHead(404)
          res.end()
        }
      }
      disposers.push(
        ctx.webServer.register({
          kind: 'exact',
          path: '/dsh-fish/avatar.png',
          handler: (req, res) => {
            serveImage(fs.existsSync(BODY_FILE) ? BODY_FILE : AVATAR_FILE, res)
          },
        }),
      )
      disposers.push(
        ctx.webServer.register({
          kind: 'exact',
          path: '/dsh-fish/tail.png',
          handler: (req, res) => {
            serveImage(TAIL_FILE, res)
          },
        }),
      )

      // ⑤ 「叫本鲸」：生成一句短话。失败就退回预置句子，永远有回音。
      disposers.push(
        ctx.webServer.register({
          kind: 'exact',
          path: '/dsh-fish/call',
          handler: async (req, res) => {
            if (req.method !== 'POST') {
              sendJson(res, 405, { error: 'POST only' })
              return
            }
            let line = null
            try {
              line = await speak(ctx)
            } catch (err) {
              line = null
            }
            sendJson(res, 200, { line: line || pickFallback(), ts: Date.now() })
          },
        }),
      )

      // ⑥ 唯一的注入通道：桌面端只认结构化注入行。
      //    合法 kind 只有六种（global / script / script-src / script-preload / style / html），
      //    这里用 script-src，placement 落 body。
      try {
        disposers.push(
          root.on('webserver/index-inject', (table) => {
            if (!Array.isArray(table)) return
            const already = table.some(
              (row) => row && row.kind === 'script-src' && row.src === '/dsh-fish/card.js',
            )
            if (already) return
            table.push({ kind: 'script-src', src: '/dsh-fish/card.js', placement: 'body' })
          }),
        )
      } catch (err) {}

      ctx.effect(() => () => {
        for (const d of disposers) {
          try {
            d()
          } catch (err) {}
        }
      })
    })
  },
}
