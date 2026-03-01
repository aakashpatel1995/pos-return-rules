/**
 * Settings Route: /app/settings
 *
 * Merchant dashboard to configure Return Rules:
 *  - Return window days
 *  - BNPL provider list
 *  - Warehouse-return product tags
 */

import { useState, useCallback } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useSubmit, Form } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import {
    Page,
    Layout,
    Card,
    Text,
    TextField,
    Button,
    Banner,
    BlockStack,
    InlineStack,
    Badge,
    Divider,
    Box,
    List,
} from '@shopify/polaris';

/* ── Loader: read metafield settings ── */
export async function loader({ request }) {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(`
    query getAppSettings {
      currentAppInstallation {
        metafields(first: 10, namespace: "pos_return_rules") {
          edges {
            node {
              key
              value
            }
          }
        }
      }
    }
  `);

    const data = await response.json();
    const metafields = data?.data?.currentAppInstallation?.metafields?.edges || [];

    const settings = {};
    metafields.forEach(({ node }) => {
        settings[node.key] = node.value;
    });

    return json({ settings });
}

/* ── Action: save settings to metafields ── */
export async function action({ request }) {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();

    const fields = [
        { key: 'return_window_days', value: formData.get('return_window_days') || '30' },
        { key: 'bnpl_providers', value: formData.get('bnpl_providers') || 'klarna,afterpay,affirm' },
        { key: 'warehouse_return_tags', value: formData.get('warehouse_return_tags') || 'web-only,exclusive' },
    ];

    const metafieldInputs = fields.map((f) => ({
        namespace: 'pos_return_rules',
        key: f.key,
        value: f.value,
        type: 'single_line_text_field',
    }));

    await admin.graphql(`
    mutation saveSettings($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key value }
        userErrors { field message }
      }
    }
  `, { variables: { metafields: metafieldInputs } });

    return json({ success: true });
}

/* ── Settings UI ── */
export default function SettingsPage() {
    const { settings } = useLoaderData();
    const submit = useSubmit();

    const [windowDays, setWindowDays] = useState(settings.return_window_days || '30');
    const [bnplProviders, setBnplProviders] = useState(settings.bnpl_providers || 'klarna,afterpay,affirm,clearpay,sezzle');
    const [warehouseTags, setWarehouseTags] = useState(settings.warehouse_return_tags || 'web-only,exclusive,online-exclusive');
    const [saved, setSaved] = useState(false);

    const handleSave = useCallback(() => {
        submit(
            { return_window_days: windowDays, bnpl_providers: bnplProviders, warehouse_return_tags: warehouseTags },
            { method: 'post' }
        );
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }, [windowDays, bnplProviders, warehouseTags, submit]);

    return (
        <Page
            title="POS Return Rules — Settings"
            subtitle="Configure the rules enforced at your physical store registers"
            primaryAction={{ content: 'Save Settings', onAction: handleSave }}
        >
            <Layout>
                {saved && (
                    <Layout.Section>
                        <Banner status="success" title="Settings saved successfully!" />
                    </Layout.Section>
                )}

                {/* Rule 1 */}
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack gap="200" align="start">
                                <Text as="h2" variant="headingMd">⏱ Rule 1: Return Window</Text>
                                <Badge status="success">Active</Badge>
                            </InlineStack>
                            <Text color="subdued">
                                If a customer tries to return an order older than this number of days,
                                the cashier will be blocked from issuing a cash refund and must
                                issue store credit only.
                            </Text>
                            <TextField
                                label="Return window (days)"
                                type="number"
                                value={windowDays}
                                onChange={setWindowDays}
                                min="1"
                                max="365"
                                suffix="days"
                                helpText="Recommended: 30 days for most enterprise retailers"
                            />
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* Rule 2 */}
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack gap="200" align="start">
                                <Text as="h2" variant="headingMd">💳 Rule 2: BNPL Payment Guard</Text>
                                <Badge status="warning">Active</Badge>
                            </InlineStack>
                            <Text color="subdued">
                                If the original order was paid using a Buy Now Pay Later provider,
                                the cashier will be warned that a cash refund is NOT possible and must
                                issue a Digital Gift Card or Store Credit instead.
                            </Text>
                            <TextField
                                label="BNPL payment gateway names"
                                value={bnplProviders}
                                onChange={setBnplProviders}
                                helpText="Comma-separated. Must match exactly what appears in Shopify as the payment gateway name (lowercase)."
                                multiline={2}
                            />
                            <Box>
                                <Text variant="bodyMd" fontWeight="semibold">Common BNPL providers:</Text>
                                <InlineStack gap="100" wrap>
                                    {['klarna', 'afterpay', 'affirm', 'clearpay', 'sezzle', 'laybuy', 'zip', 'paidy'].map((p) => (
                                        <Badge key={p}>{p}</Badge>
                                    ))}
                                </InlineStack>
                            </Box>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* Rule 3 */}
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack gap="200" align="start">
                                <Text as="h2" variant="headingMd">📦 Rule 3: Inventory Router</Text>
                                <Badge status="warning">Active</Badge>
                            </InlineStack>
                            <Text color="subdued">
                                If a returned item has any of the following product tags, the cashier will
                                be instructed NOT to restock it on the store floor and to place it in
                                the warehouse return bin.
                            </Text>
                            <TextField
                                label="Warehouse-return product tags"
                                value={warehouseTags}
                                onChange={setWarehouseTags}
                                helpText="Comma-separated. These must match the product tags in your Shopify admin exactly."
                                multiline={2}
                            />
                            <Text color="subdued" variant="bodyMd">
                                <Text fontWeight="semibold">How to tag products: </Text>
                                In Shopify Admin → Products → select the product → add these tags.
                                Common examples: <Text code>web-only</Text>, <Text code>exclusive</Text>, <Text code>online-exclusive</Text>
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                {/* Help */}
                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="300">
                            <Text as="h2" variant="headingMd">📖 How It Works</Text>
                            <Divider />
                            <List>
                                <List.Item>
                                    Install this app in your Shopify Partners dashboard
                                </List.Item>
                                <List.Item>
                                    Assign it to your POS home tile in the Shopify POS app under Settings → Apps
                                </List.Item>
                                <List.Item>
                                    Your cashiers tap "Return Rules" before processing any return
                                </List.Item>
                                <List.Item>
                                    They enter the order number and instantly see all alerts and required actions
                                </List.Item>
                            </List>
                            <Divider />
                            <Text variant="bodyMd" color="subdued">
                                Built for enterprise retailers on Shopify Plus with complex multi-location
                                and omnichannel return policies.
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>

            </Layout>
        </Page>
    );
}
