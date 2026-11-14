import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. Colours mirror the tokens in globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Uphar CRM',
    short_name: 'Uphar CRM',
    description: 'Specimen distribution CRM for Uphar Prakashan: challans, leads, follow-up calls and district analytics.',
    // "/" sends signed-in users to their own desk and everyone else to the front page.
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#f7f5f0',
    theme_color: '#f7f5f0',
    lang: 'en-IN',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the home screen icon. Roles without access are redirected to their own desk.
    shortcuts: [
      { name: 'Follow-ups', short_name: 'Follow-ups', url: '/follow-ups', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }] },
      { name: 'Call mode', short_name: 'Call mode', url: '/follow-ups?mode=call', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }] },
      { name: 'New challan', short_name: 'New challan', url: '/de', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }] },
      { name: 'Leads', short_name: 'Leads', url: '/leads', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }] },
    ],
  };
}
