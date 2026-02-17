import { HomeIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const homePage = defineType({
	name: 'homePage',
	title: 'Pagina principală',
	type: 'document',
	icon: HomeIcon,
	fields: [
		defineField({
			name: 'title',
			title: 'Titlu',
			type: 'string',
			description: 'Titlu intern pentru referință în Studio',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'hero',
			title: 'Secțiunea Hero',
			type: 'hero',
		}),
	],
	preview: {
		select: {
			title: 'title',
		},
	},
});
