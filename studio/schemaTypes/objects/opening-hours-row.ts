import { ClockIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const openingHoursRow = defineType({
	name: 'openingHoursRow',
	title: 'Rând program',
	type: 'object',
	icon: ClockIcon,
	fields: [
		defineField({
			name: 'label',
			title: 'Zi / Interval',
			description:
				'Ex: „Luni”, „Marți–Joi”. Folosește numele zilei (sau un interval de zile) ca să apară și în Google.',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'value',
			title: 'Ore',
			description:
				'Ex: „07:30–16:00” sau „Închis”. Folosește formatul HH:MM–HH:MM ca să apară și în Google.',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
	],
	preview: {
		select: {
			label: 'label',
			value: 'value',
		},
		prepare({ label, value }) {
			return {
				title: label,
				subtitle: value,
			};
		},
	},
});
