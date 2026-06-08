import type { SchemaTypeDefinition } from 'sanity';
import { cafeneaPage } from './documents/cafenea-page';
import { event } from './documents/event';
import { homePage } from './documents/home-page';
import { hero } from './objects/hero';
import { locationGallery } from './objects/location-gallery';
import { menuItem } from './objects/menu-item';
import { offering } from './objects/offering';

export const schemaTypes: SchemaTypeDefinition[] = [
	hero,
	offering,
	locationGallery,
	menuItem,
	homePage,
	cafeneaPage,
	event,
];
