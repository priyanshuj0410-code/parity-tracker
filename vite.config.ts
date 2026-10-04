import { renameSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// @ts-expect-error: the edge handler is plain JavaScript, shared with api/data.js.
import { handleData } from './api/_data.js'

/**
 * The build holds no data (decision 0014). In development, the dev server answers the data paths the same way
 * the edge function does in production, from the live release (or `?release=`) in Firestore.
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
      const out: Response = await handleData(decodeURIComponent(url.pathname.replace(route[0], route[1])))
      res.statusCode = out.status
      out.headers.forEach((v, k) => res.setHeader(k, v))
      res.end(Buffer.from(await out.arrayBuffer()))
    })
  },
})

/**
 * In production every page is served by the page function (api/page.js), which fills its title, link-preview
 * tags and data preloads, so the built page is renamed to the shell it reads, leaving no static index.html.
 */
const shell = (): Plugin => ({
  name: 'nivel-shell',
  apply: 'build',
  closeBundle() {
    renameSync('dist/index.html', 'dist/shell.html')
  },
})

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), devData(), ...(isSsrBuild ? [] : [shell()])],
  build: { copyPublicDir: !isSsrBuild },
}))
