export const contactInfo = {
	email: 'hello@prajitorianoima.ro',
	phone: '+40743595002',
	phoneHref: 'tel:+40743595002',
	address: {
		street: 'Strada Bobâlnei, 18',
		city: 'Cluj-Napoca',
		postalCode: '400628',
	},
	hours: [
		{ days: 'Luni – Sâmbătă', time: '07:30 – 19:00' },
		{ days: 'Duminică', time: '09:00 – 15:00' },
	],
} as const;

export const operatorInfo = {
	legalName: 'ALIKOF HORECA TRADING SRL',
	cui: '24604705',
	regCom: 'J2008001897245',
	address: {
		street: 'Str. Mierlei 18',
		city: 'Vișeu de Sus',
		county: 'Maramureș',
		postalCode: '435700',
	},
} as const;
