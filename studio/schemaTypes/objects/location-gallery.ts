import { defineField, defineType } from 'sanity';

const imageField = (name: string, title: string, description: string) =>
	defineField({
		name,
		title,
		type: 'image',
		description,
		options: {
			hotspot: true,
		},
		fields: [
			defineField({
				name: 'alt',
				title: 'Text alternativ',
				type: 'string',
			}),
		],
	});

export const locationGallery = defineType({
	name: 'locationGallery',
	title: 'Galerie locație',
	type: 'object',
	options: { collapsible: true, collapsed: false },
	fields: [
		imageField(
			'topLeft',
			'Rândul 1 — stânga',
			'Format pătrat (1:1). Folosește decupajul (hotspot) pentru a alege zona vizibilă.',
		),
		imageField(
			'topCenter',
			'Rândul 1 — centru',
			'Format orizontal lat (2:1). Folosește decupajul (hotspot) pentru a alege zona vizibilă.',
		),
		imageField(
			'topRight',
			'Rândul 1 — dreapta',
			'Format pătrat (1:1). Folosește decupajul (hotspot) pentru a alege zona vizibilă.',
		),
		imageField(
			'bottomLeft',
			'Rândul 2 — stânga',
			'Format pătrat (1:1). Folosește decupajul (hotspot) pentru a alege zona vizibilă.',
		),
		imageField(
			'bottomCenter',
			'Rândul 2 — centru',
			'Format pătrat (1:1). Folosește decupajul (hotspot) pentru a alege zona vizibilă.',
		),
		imageField(
			'bottomRight',
			'Rândul 2 — dreapta',
			'Format orizontal lat (2:1). Folosește decupajul (hotspot) pentru a alege zona vizibilă.',
		),
	],
});
