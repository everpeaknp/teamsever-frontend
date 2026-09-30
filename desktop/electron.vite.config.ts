import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    define: {
      'process.env.TEAMSEVER_WEB_URL': JSON.stringify(process.env.TEAMSEVER_WEB_URL ?? ''),
      'process.env.TEAMSEVER_API_URL': JSON.stringify(process.env.TEAMSEVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''),
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: 'src/preload/index.ts',
        output: {
          format: 'cjs',
        },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: 'src/renderer/index.html',
      },
    },
  },
});
