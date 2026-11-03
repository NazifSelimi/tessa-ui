import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { validateBuildApiUrl } from './scripts/validate-build-env'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    validateBuildApiUrl(process.env.VITE_API_URL ?? env.VITE_API_URL, mode)
  }
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'vendor-redux', test: /[\\/]node_modules[\\/](@reduxjs[\\/]toolkit|react-redux|redux|redux-persist|immer|reselect)[\\/]/ },
            // antd intentionally excluded: lets the bundler tree-shake unused
            // components & icons instead of bundling the entire library
          ],
        },
      },
    },
  },
  }
})
