import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import remoteScripts from 'vite-plugin-remote-scripts'

export default defineConfig({
  plugins: [
    vue(),
    remoteScripts({
      awaitDownload: false,
    }),
  ],
  build: {
    sourcemap: true,
  },
})
