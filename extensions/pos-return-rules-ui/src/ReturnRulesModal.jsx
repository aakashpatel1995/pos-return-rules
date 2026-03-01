/**
 * POS Return Rules & Routing Engine
 * Shopify POS UI Extension
 *
 * Enforces complex enterprise return rules at the register:
 *  1. Return Window Check   – blocks refunds past the configured window
 *  2. BNPL Payment Guard    – warns on Klarna / Afterpay / Affirm orders
 *  3. Inventory Router      – flags items that must go back to warehouse
 */

import {
  reactExtension,
  useApi,
  ScrollView,
  Text,
  Button,
  Banner,
  Stack,
  Badge,
  Section,
  List,
  TextField,
} from '@shopify/ui-extensions-react/point-of-sale';

import { useState, useCallback, useMemo } from 'react';

/* ─────────────────────────────────────────────
   Constants / helpers
───────────────────────────────────────────── */

const BNPL_DEFAULTS = ['klarna', 'afterpay', 'affirm', 'clearpay', 'sezzle', 'quadpay', 'zip'];
const WAREHOUSE_TAG_DEFAULTS = ['web-only', 'exclusive', 'online-exclusive', 'warehouse-return'];

function daysBetween(dateA, dateB) {
  const ms = Math.abs(new Date(dateA) - new Date(dateB));
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function parseTags(str, defaults) {
  if (!str || !str.trim()) return defaults;
  return str.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

/* ─────────────────────────────────────────────
   Rule Engine
───────────────────────────────────────────── */

function evaluateReturnRules(order, settings) {
  const alerts = [];

  // ── Rule 1: Return Window ──────────────────
  const windowDays = settings?.return_window_days || 30;
  const orderDate = order?.created_at;
  if (orderDate) {
    const age = daysBetween(orderDate, new Date());
    if (age > windowDays) {
      alerts.push({
        id: 'window_expired',
        level: 'critical',
        title: `Past ${windowDays}-Day Return Window`,
        body: `This order is ${age} days old. Full cash refunds are NOT permitted. Issue store credit only.`,
        action: 'STORE_CREDIT_ONLY',
      });
    } else {
      const remaining = windowDays - age;
      alerts.push({
        id: 'window_ok',
        level: 'success',
        title: `Within Return Window`,
        body: `${remaining} day${remaining !== 1 ? 's' : ''} remaining. Standard refund permitted.`,
        action: null,
      });
    }
  }

  // ── Rule 2: BNPL Payment Guard ────────────
  const bnplProviders = parseTags(settings?.bnpl_providers, BNPL_DEFAULTS);
  const gateway = (order?.payment_gateway || '').toLowerCase();
  const isBNPL = bnplProviders.some((p) => gateway.includes(p));
  if (isBNPL) {
    const provider = bnplProviders.find((p) => gateway.includes(p)) || 'Buy Now Pay Later';
    alerts.push({
      id: 'bnpl_detected',
      level: 'warning',
      title: `BNPL Order – ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
      body: `DO NOT refund cash or to a card. Paid with ${provider}. Issue a Digital Gift Card or Store Credit.`,
      action: 'GIFT_CARD_ONLY',
    });
  }

  // ── Rule 3: Inventory Router ──────────────
  const warehouseTags = parseTags(settings?.warehouse_return_tags, WAREHOUSE_TAG_DEFAULTS);
  const itemsRequiringWarehouseReturn = (order?.line_items || []).filter((item) => {
    const productTags = (item.tags || []).map((t) => t.toLowerCase());
    return warehouseTags.some((wt) => productTags.includes(wt));
  });

  if (itemsRequiringWarehouseReturn.length > 0) {
    const names = itemsRequiringWarehouseReturn.map((i) => i.title).join(', ');
    alerts.push({
      id: 'warehouse_route',
      level: 'warning',
      title: `Warehouse Return Required`,
      body: `These items are web-exclusives — ship back to warehouse, DO NOT restock on floor: ${names}`,
      action: 'PRINT_RETURN_LABEL',
    });
  }

  return alerts;
}

/* ─────────────────────────────────────────────
   Order Lookup Screen
───────────────────────────────────────────── */

function OrderLookupScreen({ onOrderFound, target }) {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const api = useApi(target);

  const handleSearch = useCallback(async () => {
    if (!orderId.trim()) {
      setError('Please enter an order number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await api.fetch(
        `/api/orders/lookup?order_name=${encodeURIComponent(orderId.trim())}`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Order not found');
      }
      const data = await response.json();
      onOrderFound(data.order);
    } catch (err) {
      setError(err.message || 'Could not find that order. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  }, [orderId, api, onOrderFound]);

  return (
    <ScrollView>
      <Stack direction="vertical" spacing="loose" paddingHorizontal="base" paddingVertical="base">

        <Section header="Return Rules Engine">
          <Stack direction="vertical" spacing="tight">
            <Text variant="body" color="subdued">
              Enter the customer's order number to check return eligibility and routing rules.
            </Text>
          </Stack>
        </Section>

        <Section header="Order Lookup">
          <Stack direction="vertical" spacing="base">
            <TextField
              label="Order Number (e.g. #1234)"
              value={orderId}
              onChange={setOrderId}
              placeholder="#1234"
            />
            {error ? (
              <Banner status="critical" title="Error">
                <Text>{error}</Text>
              </Banner>
            ) : null}
            <Button
              title={loading ? 'Looking up...' : 'Check Return Rules'}
              onPress={handleSearch}
              isDisabled={loading}
              type="primary"
            />
          </Stack>
        </Section>

        <Section header="This app enforces 3 rules">
          <Stack direction="vertical" spacing="tight">
            <Text>⏱ Return Window — Alerts if the order is past the allowed return period</Text>
            <Text>💳 BNPL Guard — Blocks cash refunds on Klarna, Afterpay, Affirm orders</Text>
            <Text>📦 Inventory Router — Flags web-exclusive items for warehouse return</Text>
          </Stack>
        </Section>

      </Stack>
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────
   Results Screen
───────────────────────────────────────────── */

function RulesResultScreen({ order, alerts, onBack }) {
  const orderAge = order?.created_at
    ? daysBetween(order.created_at, new Date())
    : null;

  const hasBlocker = alerts.some((a) => a.level === 'critical');

  const statusMap = {
    critical: 'critical',
    warning: 'warning',
    success: 'success',
    info: 'info',
  };

  return (
    <ScrollView>
      <Stack direction="vertical" spacing="loose" paddingHorizontal="base" paddingVertical="base">

        <Button title="← Back to Search" onPress={onBack} type="plain" />

        <Section header={`Order ${order.name}`}>
          <Stack direction="vertical" spacing="tight">
            <Text color="subdued">
              Placed {orderAge !== null ? `${orderAge} days ago` : 'unknown date'}
              {order.customer ? ` • ${order.customer.first_name} ${order.customer.last_name}` : ''}
            </Text>
            <Stack direction="horizontal" spacing="tight">
              <Badge status="info" text={`$${order.total_price}`} />
              <Badge
                status={hasBlocker ? 'critical' : 'success'}
                text={hasBlocker ? 'RESTRICTED RETURN' : 'ELIGIBLE FOR RETURN'}
              />
              {order.payment_gateway ? (
                <Badge status="info" text={order.payment_gateway} />
              ) : null}
            </Stack>
          </Stack>
        </Section>

        {order.line_items?.length > 0 && (
          <Section header="Items in Order">
            <Stack direction="vertical" spacing="tight">
              {order.line_items.map((item, i) => (
                <Text key={i}>• {item.title}</Text>
              ))}
            </Stack>
          </Section>
        )}

        <Section header="Return Rules Checklist">
          <Stack direction="vertical" spacing="base">
            {alerts.map((alert) => (
              <Banner
                key={alert.id}
                status={statusMap[alert.level] || 'info'}
                title={alert.title}
              >
                <Stack direction="vertical" spacing="tight">
                  <Text>{alert.body}</Text>
                  {alert.action === 'STORE_CREDIT_ONLY' && (
                    <Badge status="critical" text="ACTION: Issue Store Credit Only" />
                  )}
                  {alert.action === 'GIFT_CARD_ONLY' && (
                    <Badge status="warning" text="ACTION: Issue Digital Gift Card" />
                  )}
                  {alert.action === 'PRINT_RETURN_LABEL' && (
                    <Badge status="warning" text="ACTION: Put in Warehouse Return Bin" />
                  )}
                </Stack>
              </Banner>
            ))}
          </Stack>
        </Section>

        <Banner
          status={hasBlocker ? 'critical' : 'success'}
          title={hasBlocker ? 'Restricted Return' : 'Return Approved'}
        >
          <Text>
            {hasBlocker
              ? 'Requires supervisor review. Standard cash/card refund is NOT permitted.'
              : 'Standard return approved. Proceed with Shopify POS refund flow.'}
          </Text>
        </Banner>

      </Stack>
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────
   Root Extension (shared logic)
───────────────────────────────────────────── */

function ReturnRulesExtension({ target }) {
  const api = useApi(target);
  // Extension settings come from api.settings (not useSettings hook)
  const settings = api?.settings?.current ?? {};

  const [currentOrder, setCurrentOrder] = useState(null);
  const [screen, setScreen] = useState('lookup');

  const alerts = useMemo(() => {
    if (!currentOrder) return [];
    return evaluateReturnRules(currentOrder, settings);
  }, [currentOrder, settings]);

  const handleOrderFound = useCallback((order) => {
    setCurrentOrder(order);
    setScreen('results');
  }, []);

  const handleBack = useCallback(() => {
    setCurrentOrder(null);
    setScreen('lookup');
  }, []);

  if (screen === 'results' && currentOrder) {
    return (
      <RulesResultScreen
        order={currentOrder}
        alerts={alerts}
        onBack={handleBack}
      />
    );
  }

  return <OrderLookupScreen onOrderFound={handleOrderFound} target={target} />;
}

/* ─────────────────────────────────────────────
   Extension registrations
───────────────────────────────────────────── */

const HOME_TARGET = 'pos.home.tile.render';
const PRODUCT_TARGET = 'pos.product-details.action.render';

export default reactExtension(HOME_TARGET, () => (
  <ReturnRulesExtension target={HOME_TARGET} />
));

export const productDetailExtension = reactExtension(
  PRODUCT_TARGET,
  () => <ReturnRulesExtension target={PRODUCT_TARGET} />
);
