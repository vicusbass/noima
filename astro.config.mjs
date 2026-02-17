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
		}),
		react(),
	],
	vite: {
		plugins: [
			tailwindcss(),
			{
				name: 'remove-sanity-studio-deps',
				configResolved(config) {
					const deps = [
						'react-compiler-runtime',
						'react-is',
						'styled-components',
						'lodash/startCase.js',
					];
					config.optimizeDeps.include = config.optimizeDeps.include?.filter(
						(d) => !deps.includes(d),
					);
				},
			},
		],
	},
});
