import { HomeIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const homePage = defineType({
	name: 'homePage',
	title: 'Home Page',
	type: 'document',
	icon: HomeIcon,
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			description: 'Internal title for reference in Studio',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'hero',
			title: 'Hero Section',
			type: 'hero',
		}),
	],
	preview: {
		select: {
			title: 'title',
		},
	},
});
