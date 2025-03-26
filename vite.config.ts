import {defineConfig} from 'vite';

declare const process: {
  env: Record<string, string | undefined>;
}

export default defineConfig({
  base: process.env.VITE_REPO_NAME ?? '/',
  optimizeDeps: {
    exclude: ['@agrodt/three-zstd-volume-loader'],
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
});
