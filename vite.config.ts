import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// 빌드마다 바뀌는 식별자. 앱 번들에 박히고(__BUILD_ID__), 같은 값이 dist/version.json 으로도 나간다.
// 열려 있는 탭은 주기적으로 version.json 을 다시 받아 자기 값과 다르면 '새 버전' 배너를 띄운다 (src/lib/appUpdate.ts)
const BUILD_ID = `${pkg.version}-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;

const versionFile = (): Plugin => ({
  name: 'naran-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, build: BUILD_ID }) });
  },
});

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    versionFile(),
    VitePWA({
      // 새 워커는 바로 대기 → 사용자가 배너의 '지금 받기'를 누를 때 캐시를 비우고 새로 받는다(appUpdate.ts).
      // 검사 도중 저절로 새로고침되면 답이 날아갈 수 있어서 자동 새로고침은 하지 않는다.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // 개발 서버에서는 끈다 — 켜면 워커가 옛 번들을 선캐시해 코드를 고쳐도 옛 화면이 나온다(focus-accounter 에서 겪은 문제)
      devOptions: { enabled: false },
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: '나란 · 나라는 사람',
        short_name: '나란',
        description: '가치관·성격·애착·기질, 나라는 사람을 한 조각씩 채워가요.',
        categories: ['lifestyle', 'health', 'personalization'],
        lang: 'ko',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // version.json 은 항상 네트워크에서 — 캐시되면 새 버전을 영영 못 알아챈다
        globIgnores: ['**/version.json', '**/og-image.png', '**/google*.html'],
        navigateFallback: 'index.html',
        // 글꼴(Pretendard CDN)은 처음 받은 뒤 오프라인에서도 쓰게
        runtimeCaching: [{
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/,
          handler: 'CacheFirst',
          options: { cacheName: 'cdn', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        }],
      },
    }),
  ],
});
