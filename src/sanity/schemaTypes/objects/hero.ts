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
			title: 'Heading',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'subheading',
			title: 'Subheading',
			type: 'string',
		}),
		defineField({
			name: 'mediaType',
			title: 'Media Type',
			type: 'string',
			options: {
				list: [
					{ title: 'Image', value: 'image' },
					{ title: 'Video', value: 'video' },
				],
				layout: 'radio',
			},
			initialValue: 'image',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'image',
			title: 'Image',
			type: 'image',
			options: {
				hotspot: true,
			},
			fields: [
				defineField({
					name: 'alt',
					title: 'Alternative Text',
					type: 'string',
					validation: (rule) => rule.required(),
				}),
			],
			hidden: ({ parent }) => parent?.mediaType !== 'image',
		}),
		defineField({
			name: 'video',
			title: 'Video',
			type: 'mux.video',
			hidden: ({ parent }) => parent?.mediaType !== 'video',
		}),
	],
});
