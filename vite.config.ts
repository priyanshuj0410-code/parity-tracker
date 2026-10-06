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
  plugins: [react(), devData(), ...(isSsrBuild ? [] : [shell()])],
  build: { copyPublicDir: !isSsrBuild },
}))
