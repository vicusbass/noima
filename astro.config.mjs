import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sanity from '@sanity/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
	process.env.NODE_ENV,
	process.cwd(),
	'',
);

export default defineConfig({
	adapter: vercel(),
	integrations: [
		sanity({
			projectId: PUBLIC_SANITY_PROJECT_ID,
			dataset: PUBLIC_SANITY_DATASET,
			useCdn: false,
			apiVersion: '2026-02-16',
			studioBasePath: '/studio',
			stega: {
				studioUrl: '/studio',
			},
		}),
		react(),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
