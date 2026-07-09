import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // アプリの更新があったら自動でアップデートする
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png'], // キャッシュする画像
      manifest: {
        name: 'LogDex',
        short_name: 'LogDex',
        description: 'Pokémon VGC Recorder & Analyzer',
        theme_color: '#1A73E8',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})