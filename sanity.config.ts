import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { muxInput } from 'sanity-plugin-mux-input';
import { schemaTypes } from './src/sanity/schemaTypes';

export default defineConfig({
	projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
	dataset: import.meta.env.PUBLIC_SANITY_DATASET,
	plugins: [
		structureTool({
			structure: (S) =>
				S.list()
					.title('Content')
					.items([
						S.listItem()
							.title('Home Page')
							.id('homePage')
							.child(
								S.document().schemaType('homePage').documentId('homePage'),
							),
					]),
		}),
		muxInput(),
	],
	schema: {
		types: schemaTypes,
	},
});
