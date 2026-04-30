import { PinIcon } from '@sanity/icons';
import { defineArrayMember, defineField, defineType } from 'sanity';

export const cafeneaPage = defineType({
	name: 'cafeneaPage',
	title: 'Pagina cafenea',
	type: 'document',
	icon: PinIcon,
	fields: [
		defineField({
			name: 'menuItems',
			title: 'Meniu',
			description: 'Trage articolele pentru a le reordona.',
			type: 'array',
			of: [defineArrayMember({ type: 'menuItem' })],
		}),
		defineField({
			name: 'locationGallery',
			title: 'Galerie locație',
			type: 'locationGallery',
		}),
	],
	preview: {
		prepare: () => ({ title: 'Cafenea' }),
	},
});
