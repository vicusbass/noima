import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sanity from '@sanity/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

// These are public (non-secret) values, safe to hardcode.
// Astro doesn't load .env for process.env in config files.
const PROJECT_ID = '4c9x2l5r';
const DATASET = 'production';

export default defineConfig({
	adapter: vercel({
		imageService: true,
	}),
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Google Sans Flex',
			cssVariable: '--font-google-sans',
			weights: [400, 500, 700, 900],
			styles: ['normal'],
			subsets: ['latin', 'latin-ext'],
		},
	],
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
				// @sanity/astro injects these into optimizeDeps.include for its embedded
				// Studio route. The Studio lives in ./studio, so those packages aren't
				// installed here — filter them out to silence Vite resolve warnings.
				name: 'strip-sanity-studio-optimize-deps',
				configResolved(config) {
					const studioOnly = [
						'react-compiler-runtime',
						'react-is',
						'styled-components',
						'lodash/startCase.js',
					];
					config.optimizeDeps.include = config.optimizeDeps.include?.filter(
						(d) => !studioOnly.includes(d),
					);
				},
			},
		],
	},
});
