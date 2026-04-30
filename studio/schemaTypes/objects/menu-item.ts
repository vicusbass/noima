import { OlistIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const menuItem = defineType({
	name: 'menuItem',
	title: 'Articol meniu',
	type: 'object',
	icon: OlistIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Nume',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'price',
			title: 'Preț (lei)',
			type: 'number',
			validation: (rule) => rule.required().positive(),
		}),
	],
	preview: {
		select: {
			name: 'name',
			price: 'price',
		},
		prepare({ name, price }) {
			return {
				title: name,
				subtitle: typeof price === 'number' ? `${price} lei` : undefined,
			};
		},
	},
});
