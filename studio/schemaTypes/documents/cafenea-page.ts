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
		defineField({
			name: 'openingHours',
			title: 'Program',
			description:
				'Trage rândurile pentru a le reordona. Păstrează eticheta ca zi (sau interval de zile) și orele în format HH:MM–HH:MM ca să apară corect și în Google.',
			type: 'array',
			of: [defineArrayMember({ type: 'openingHoursRow' })],
		}),
	],
	preview: {
		prepare: () => ({ title: 'Cafenea' }),
	},
});
