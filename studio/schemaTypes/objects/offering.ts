import { PlayIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const offering = defineType({
	name: 'offering',
	title: 'Ce primește omul',
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
