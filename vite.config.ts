import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Preload the hashed data files, so they download alongside the code instead of after it. */
const preloadData = (): Plugin => ({
  name: 'nivel-preload-data',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, ctx) =>
      Object.values(ctx.bundle ?? {})
        .filter((f) => f.type === 'asset' && /^assets\/(companies|indexes|simulations)-[\w-]+\.json$/.test(f.fileName))
        .map((f) => ({ tag: 'link', attrs: { rel: 'preload', href: `/${f.fileName}`, as: 'fetch', type: 'application/json', crossorigin: '' }, injectTo: 'head' as const })),
  },
})

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), preloadData()],
  build: { copyPublicDir: !isSsrBuild },
}))
