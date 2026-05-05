import { PlayIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const hero = defineType({
	name: 'hero',
	title: 'Hero',
	type: 'object',
	icon: PlayIcon,
	fields: [
		defineField({
			name: 'video',
			title: 'Videoclip',
			type: 'mux.video',
			validation: (rule) => rule.required(),
		}),
	],
});
