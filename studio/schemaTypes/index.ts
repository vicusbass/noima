import type { SchemaTypeDefinition } from 'sanity';
import { event } from './documents/event';
import { homePage } from './documents/home-page';
import { hero } from './objects/hero';

export const schemaTypes: SchemaTypeDefinition[] = [hero, homePage, event];
