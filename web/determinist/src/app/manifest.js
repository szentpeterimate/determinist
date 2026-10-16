export const dynamic = 'force-static';

export default function manifest() {
  return {
    name: 'Determinist',
    short_name: 'Determinist',
    description: 'A deterministic password generator you can use anywhere!',
    start_url: '/',
    display: 'standalone',
    background_color: '#161721',
    theme_color: '#161721',
    icons: [
      {
        src: '/icon192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: "maskable"
      },
      {
        src: '/icon512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: "maskable"
      },
    ],
  }
}