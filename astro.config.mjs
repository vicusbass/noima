import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sanity from '@sanity/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// These are public (non-secret) values, safe to hardcode.
// Astro doesn't load .env for process.env in config files.
const PROJECT_ID = '4c9x2l5r';
const DATASET = 'production';

export default defineConfig({
	adapter: vercel(),
	integrations: [
		sanity({
			projectId: PROJECT_ID,
			dataset: DATASET,
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
