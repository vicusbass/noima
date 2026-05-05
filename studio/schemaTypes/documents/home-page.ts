import { HomeIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const homePage = defineType({
	name: 'homePage',
	title: 'Pagina principală',
	type: 'document',
	icon: HomeIcon,
	fields: [
		defineField({
			name: 'hero',
			title: 'Secțiunea Hero',
			type: 'hero',
		}),
	],
	preview: {
		prepare: () => ({ title: 'Pagina principală' }),
	},
});
