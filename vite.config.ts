import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// @ts-expect-error: the edge handler is plain JavaScript, shared with api/data.js.
import { handleData } from './api/_data.js'

/**
 * The build holds no data (decision 0014). In development, the dev server answers the data paths the same way
 * the edge function does in production, from the public data site; with NIVEL_DATA_BYPASS set, `?release=` also
 * reaches a staged release, since the dev server is private.
 */
const devData = (): Plugin => ({
  name: 'nivel-dev-data',
  apply: 'serve',
  configureServer(server) {
    const routes: [RegExp, string][] = [[/^\/data\/(.*)$/, '$1'], [/^\/feeds\/spot\/(.*)$/, 'feed/$1'], [/^\/logos\/(.*)$/, 'logo/$1']]
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://dev')
      const route = routes.find(([re]) => re.test(url.pathname))
      if (!route) return next()
      const out: Response = await handleData(decodeURIComponent(url.pathname.replace(route[0], route[1])), { preview: true })
      res.statusCode = out.status
      out.headers.forEach((v, k) => res.setHeader(k, v))
      res.end(Buffer.from(await out.arrayBuffer()))
    })
  },
})

/**
 * Development only, behind MARKETS_MOCK (PARITY-44): answers /api/markets, /api/markets-admin and a stand-in for
 * Neon Auth from scripts/markets-mock.ts, so the market pages can be checked without Neon. `apply: 'serve'` and the
 * module loaded inside the dev server keep it out of every build.
 */
const devMarkets = (): Plugin => ({
  name: 'nivel-dev-markets',
  apply: (_, { command }) => command === 'serve' && !!process.env.MARKETS_MOCK,
  configureServer(server) {
    let handle: Promise<(req: Request) => Promise<Response | null>> | null = null
    server.middlewares.use(async (req, res, next) => {
      if (!/^\/(api\/markets|__mock-auth\/)/.test(req.url ?? '')) return next()
      handle ??= server.ssrLoadModule('/scripts/markets-mock.ts').then((m) => m.createMock(process.env))
      const chunks: Buffer[] = []
      for await (const c of req) chunks.push(c as Buffer)
      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
      const out = await (await handle)(new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      }))
      if (!out) return next()
      res.statusCode = out.status
      out.headers.forEach((v, k) => res.setHeader(k, v))
      res.end(Buffer.from(await out.arrayBuffer()))
    })
  },
})

/**
 * In production every page is served by the page function (api/page.js), which fills its title, link-preview
 * tags and data preloads. The built page becomes a module the function imports (api/_shell.js, not in git),
 * so it never fetches its own site, and no static index.html is left to bypass the function.
 */
const shell = (): Plugin => ({
  name: 'nivel-shell',
  apply: 'build',
  closeBundle() {
    writeFileSync('api/_shell.js', `// Written by vite.config.ts at build time.\nexport default ${JSON.stringify(readFileSync('dist/index.html', 'utf8'))}\n`)
    rmSync('dist/index.html')
  },
})

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), devData(), devMarkets(), ...(isSsrBuild ? [] : [shell()])],
  build: { copyPublicDir: !isSsrBuild },
}))
