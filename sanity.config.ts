import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { muxInput } from 'sanity-plugin-mux-input';
import { schemaTypes } from './src/sanity/schemaTypes';

export default defineConfig({
	projectId: '4c9x2l5r',
	dataset: 'production',
	plugins: [
		structureTool({
			structure: (S) =>
				S.list()
					.title('Conținut')
					.items([
						S.listItem()
							.title('Pagina principală')
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
