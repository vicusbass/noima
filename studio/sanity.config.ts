import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { muxInput } from 'sanity-plugin-mux-input';
import { schemaTypes } from './schemaTypes';

export default defineConfig({
	projectId: 'cnyyihx7',
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
						S.listItem()
							.title('Pagina cafenea')
							.id('cafeneaPage')
							.child(
								S.document()
									.schemaType('cafeneaPage')
									.documentId('cafeneaPage')
									.title('Cafenea'),
							),
						S.divider(),
						S.documentTypeListItem('event').title('Evenimente'),
					]),
		}),
		muxInput(),
	],
	schema: {
		types: schemaTypes,
	},
});
