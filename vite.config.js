import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nexora-m3u-server',
      configureServer(server) {
        server.middlewares.use('/api/m3u', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end('Method not allowed')
          }

          try {
            let body = ''
            for await (const chunk of req) body += chunk

            const { url } = JSON.parse(body)
            const target = new URL(url)

            if (!['http:', 'https:'].includes(target.protocol)) {
              throw new Error('URL no válida')
            }

            if (
              target.hostname === 'localhost' ||
              target.hostname === '127.0.0.1' ||
              target.hostname === '::1' ||
              target.hostname.endsWith('.local')
            ) {
              throw new Error('Dirección no permitida')
            }

            const response = await fetch(target, {
              signal: AbortSignal.timeout(20000),
              redirect: 'error',
              headers: { 'User-Agent': 'NEXORA/1.0' }
            })

            if (!response.ok) {
              throw new Error(`El servidor respondió HTTP ${response.status}`)
            }

            const content = await response.text()
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(content)
          } catch (error) {
            res.statusCode = 400
            res.end(error.message || 'No se pudo descargar la lista')
          }
        })
      }
    }
  ]
})
