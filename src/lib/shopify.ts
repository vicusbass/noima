const SHOPIFY_STORE_DOMAIN = import.meta.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = import.meta.env
	.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export interface ShopifyProduct {
	id: string;
	title: string;
	handle: string;
	description: string;
	priceRange: {
		minVariantPrice: {
			amount: string;
			currencyCode: string;
		};
	};
	featuredImage: {
		url: string;
		altText: string | null;
	} | null;
}

const FEATURED_PRODUCTS_QUERY = `
	query FeaturedProducts($first: Int!) {
		products(first: $first, sortKey: BEST_SELLING) {
			nodes {
				id
				title
				handle
				description
				priceRange {
					minVariantPrice {
						amount
						currencyCode
					}
				}
				featuredImage {
					url
					altText
				}
			}
		}
	}
`;

export async function getFeaturedProducts(
	count: number = 4,
): Promise<ShopifyProduct[]> {
	if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
		console.warn(
			'Shopify environment variables not set, skipping product fetch',
		);
		return [];
	}

	const response = await fetch(
		`https://${SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			},
			body: JSON.stringify({
				query: FEATURED_PRODUCTS_QUERY,
				variables: { first: count },
			}),
		},
	);

	const { data } = await response.json();
	return data?.products?.nodes ?? [];
}

export function getProductUrl(handle: string): string {
	return `https://${SHOPIFY_STORE_DOMAIN}/products/${handle}`;
}
