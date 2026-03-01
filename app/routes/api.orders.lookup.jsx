/**
 * API Route: /api/orders/lookup
 *
 * Accepts ?order_name=#1234 and returns the full order data
 * needed by the POS Return Rules extension.
 *
 * Fetches from Shopify Admin API and enriches line items
 * with product tags for the Inventory Router rule.
 */

import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
    const { admin } = await authenticate.public.appProxy(request);

    const url = new URL(request.url);
    const orderName = url.searchParams.get('order_name');

    if (!orderName) {
        return json({ error: 'order_name is required' }, { status: 400 });
    }

    // Normalize order name (add # if missing)
    const normalizedName = orderName.startsWith('#') ? orderName : `#${orderName}`;

    try {
        // Query order by name via GraphQL Admin API
        const response = await admin.graphql(`
      query getOrderByName($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              paymentGatewayNames
              displayFinancialStatus
              customer {
                firstName
                lastName
                email
              }
              lineItems(first: 20) {
                edges {
                  node {
                    id
                    title
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                    variant {
                      product {
                        tags
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `, {
            variables: { query: `name:${normalizedName}` },
        });

        const data = await response.json();
        const orderNode = data?.data?.orders?.edges?.[0]?.node;

        if (!orderNode) {
            return json({ error: `Order ${normalizedName} not found.` }, { status: 404 });
        }

        // Transform to simplified format for the extension
        const order = {
            id: orderNode.id,
            name: orderNode.name,
            created_at: orderNode.createdAt,
            total_price: orderNode.totalPriceSet?.shopMoney?.amount || '0.00',
            payment_gateway: (orderNode.paymentGatewayNames || []).join(', '),
            financial_status: orderNode.displayFinancialStatus,
            customer: {
                first_name: orderNode.customer?.firstName || '',
                last_name: orderNode.customer?.lastName || '',
                email: orderNode.customer?.email || '',
            },
            line_items: (orderNode.lineItems?.edges || []).map(({ node }) => ({
                id: node.id,
                title: node.title,
                quantity: node.quantity,
                price: node.originalUnitPriceSet?.shopMoney?.amount || '0.00',
                tags: node.variant?.product?.tags || [],
            })),
        };

        return json({ order });
    } catch (error) {
        console.error('Order lookup error:', error);
        return json({ error: 'Failed to fetch order. Please try again.' }, { status: 500 });
    }
}
