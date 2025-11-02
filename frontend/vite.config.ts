import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [tailwindcss()]
})

export default config
