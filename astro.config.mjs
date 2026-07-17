// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';

import cloudflare from '@astrojs/cloudflare';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://digi-business.co.uk',
  integrations: [mdx(), sitemap()],
  adapter: cloudflare()
});