import { CalendarIcon } from '@sanity/icons';
import { defineArrayMember, defineField, defineType } from 'sanity';

export const event = defineType({
	name: 'event',
	title: 'Eveniment',
	type: 'document',
	icon: CalendarIcon,
	fields: [
		defineField({
			name: 'image',
			title: 'Imagine',
			type: 'image',
			options: {
				hotspot: true,
			},
			fields: [
				defineField({
					name: 'alt',
					title: 'Text alternativ',
					type: 'string',
					validation: (rule) => rule.required(),
				}),
			],
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'date',
			title: 'Dată',
			type: 'date',
			options: {
				dateFormat: 'DD.MM.YYYY',
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'title',
			title: 'Titlu',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title',
				maxLength: 96,
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Descriere',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'block',
				}),
			],
			validation: (rule) => rule.required(),
		}),
	],
	preview: {
		select: {
			title: 'title',
			date: 'date',
			media: 'image',
		},
		prepare({ title, date, media }) {
			return {
				title,
				subtitle: date,
				media,
			};
		},
	},
});
