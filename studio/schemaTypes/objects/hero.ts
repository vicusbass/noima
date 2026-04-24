import { PlayIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const hero = defineType({
	name: 'hero',
	title: 'Hero',
	type: 'object',
	icon: PlayIcon,
	fields: [
		defineField({
			name: 'heading',
			title: 'Titlu',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'subheading',
			title: 'Subtitlu',
			type: 'string',
		}),
		defineField({
			name: 'mediaType',
			title: 'Tip media',
			type: 'string',
			options: {
				list: [
					{ title: 'Imagine', value: 'image' },
					{ title: 'Video', value: 'video' },
				],
				layout: 'radio',
			},
			initialValue: 'image',
			validation: (rule) => rule.required(),
		}),
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
			hidden: ({ parent }) => parent?.mediaType !== 'image',
		}),
		defineField({
			name: 'video',
			title: 'Videoclip',
			type: 'mux.video',
			hidden: ({ parent }) => parent?.mediaType !== 'video',
		}),
	],
});
