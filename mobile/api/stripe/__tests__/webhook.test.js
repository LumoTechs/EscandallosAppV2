// Smoke test: stripe/webhook handler — verifica firma + upsert subscripción
// Ejecutar con: npx jest api/stripe/__tests__/webhook.test.js

const mockConstructEvent = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
const mockFromFn = jest.fn();
const mockUpsert = jest.fn();
const mockSelectChain = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }));
});

jest.mock('../../_lib/supabase.js', () => ({
  getAdminClient: jest.fn(() => ({
    from: mockFromFn,
  })),
}));

let handler;

function makeReq(overrides = {}) {
  const chunks = [Buffer.from('raw-body')];
  const req = {
    method: 'POST',
    headers: { 'stripe-signature': 'sig-test' },
    [Symbol.asyncIterator]: async function* () {
      for (const c of chunks) yield c;
    },
    ...overrides,
  };
  return req;
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mockSubFrom(restaurantId = 'rest-abc') {
  mockFromFn.mockImplementation((table) => {
    if (table === 'subscriptions') {
      return { upsert: mockUpsert };
    }
    if (table === 'restaurant_members') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: { restaurant_id: restaurantId } }),
            })),
          })),
        })),
      };
    }
    return { select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) })) })) };
  });
  mockUpsert.mockResolvedValue({ error: null });
}

beforeEach(() => {
  jest.resetModules();
  mockConstructEvent.mockReset();
  mockSubscriptionsRetrieve.mockReset();
  mockFromFn.mockReset();
  mockUpsert.mockReset();

  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  process.env.STRIPE_PRICE_PRO = 'price_pro_test';

  handler = require('../webhook.js').default;
});

describe('webhook handler', () => {
  it('rechaza métodos no POST', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rechaza petición sin cabecera stripe-signature', async () => {
    const res = makeRes();
    await handler(makeReq({ headers: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rechaza firma inválida', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('firma inválida'); });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Firma inválida' }));
  });

  it('procesa checkout.session.completed y hace upsert de subscripción', async () => {
    const sub = {
      id: 'sub_test',
      status: 'active',
      metadata: { user_id: 'user-123', plan: 'pro' },
      customer: 'cus_test',
      cancel_at_period_end: false,
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
      items: { data: [{ price: { id: 'price_pro_test' } }] },
    };

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { client_reference_id: 'user-123', subscription: 'sub_test' } },
    });
    mockSubscriptionsRetrieve.mockResolvedValue(sub);
    mockSubFrom();

    const res = makeRes();
    await handler(makeReq(), res);

    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        restaurant_id: 'rest-abc',
        stripe_customer_id: 'cus_test',
        stripe_subscription_id: 'sub_test',
        plan: 'pro',
        status: 'active',
      }),
      { onConflict: 'user_id' }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('procesa customer.subscription.updated', async () => {
    const sub = {
      id: 'sub_upd',
      status: 'active',
      metadata: { user_id: 'user-456' },
      customer: 'cus_456',
      cancel_at_period_end: true,
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
      items: { data: [{ price: { id: 'price_pro_test' } }] },
    };

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
    });
    mockSubFrom('rest-456');

    const res = makeRes();
    await handler(makeReq(), res);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-456', cancel_at_period_end: true }),
      expect.anything()
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('responde 200 para eventos desconocidos (no reintento Stripe)', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    });

    const res = makeRes();
    await handler(makeReq(), res);

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
