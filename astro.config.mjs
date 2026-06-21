// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeCatppuccin from '@catppuccin/starlight';

// https://astro.build/config
export default defineConfig({
  // Org GitHub Pages root site — served at the domain root, so no `base` needed.
  site: 'https://chinny-swg.github.io',
  integrations: [
    starlight({
      title: 'chinny-swg',
      description:
        'Documentation for the chinny-swg SWGEmu Core3 fork — building, deploying, and administering a Pre-CU Star Wars Galaxies private server.',
      plugins: [
        starlightThemeCatppuccin({
          dark: { flavor: 'mocha', accent: 'sky' },
          light: { flavor: 'latte', accent: 'sky' },
        }),
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/chinny-swg/Core3',
        },
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Overview & Requirements', slug: 'guides/overview' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Building Core3', slug: 'guides/building-core3' },
            { label: 'Docker Deployment', slug: 'guides/docker-deployment' },
            { label: 'Server Deployment (Dockge)', slug: 'guides/server-deployment' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Admin & Console Commands', slug: 'reference/admin-commands' },
          ],
        },
      ],
    }),
  ],
});
