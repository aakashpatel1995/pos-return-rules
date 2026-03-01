import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    Text,
    BlockStack,
    InlineStack,
    Badge,
    Button,
    Banner,
    Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    await authenticate.admin(request);
    return json({ ok: true });
};

export default function Index() {
    return (
        <Page
            title="POS Return Rules"
            subtitle="Enterprise return policy enforcement for Shopify POS"
            primaryAction={
                <Button url="/app/settings" variant="primary">
                    Configure Rules
                </Button>
            }
        >
            <Layout>
                <Layout.Section>
                    <Banner
                        title="Your POS extension is active"
                        status="success"
                    >
                        <Text>
                            The Return Rules tile is available in your Shopify POS app. Tap it before processing any customer return.
                        </Text>
                    </Banner>
                </Layout.Section>

                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">How It Works</Text>
                            <BlockStack gap="200">
                                <InlineStack gap="200" align="start">
                                    <Badge status="success">Step 1</Badge>
                                    <Text>Cashier taps "Return Rules" tile in Shopify POS</Text>
                                </InlineStack>
                                <InlineStack gap="200" align="start">
                                    <Badge status="success">Step 2</Badge>
                                    <Text>Enters the customer's order number</Text>
                                </InlineStack>
                                <InlineStack gap="200" align="start">
                                    <Badge status="success">Step 3</Badge>
                                    <Text>App checks return window, BNPL status, and inventory routing</Text>
                                </InlineStack>
                                <InlineStack gap="200" align="start">
                                    <Badge status="success">Step 4</Badge>
                                    <Text>Cashier follows the displayed instructions for compliant return processing</Text>
                                </InlineStack>
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="300">
                            <Text as="h2" variant="headingMd">3 Rules Enforced</Text>
                            <BlockStack gap="200">
                                <Text>⏱ <Text as="span" fontWeight="bold">Return Window</Text> — No cash refunds past your policy window</Text>
                                <Text>💳 <Text as="span" fontWeight="bold">BNPL Guard</Text> — Gift card only for Klarna/Afterpay orders</Text>
                                <Text>📦 <Text as="span" fontWeight="bold">Inventory Router</Text> — Warehouse flag for web-exclusive items</Text>
                            </BlockStack>
                            <Box paddingBlockStart="200">
                                <Button url="/app/settings" fullWidth>
                                    Configure Rules →
                                </Button>
                            </Box>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
