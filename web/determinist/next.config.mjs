import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  cacheStartUrl: true,
  reloadOnOnline: true,

  workboxOptions: {
    additionalManifestEntries: undefined,
    runtimeCaching: [
      {
        urlPattern: /.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
        }
      }
    ]
  }
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactCompiler: true,
  basePath: process.env.NODE_ENV === 'production' ? '/determinist' : '',
  allowedDevOrigins: ['192.168.1.243']
};

export default withPWA(nextConfig);
