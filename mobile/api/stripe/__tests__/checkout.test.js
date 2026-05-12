// Smoke test: stripe/checkout handler — verifica que crea sesiones y valida inputs
// Ejecutar con: npx jest api/stripe/__tests__/checkout.test.js

const mockSessionCreate = jest.fn();
const mockCustomerCreate = jest.fn();
const mockSubscriptionsSelect = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockSessionCreate } },
    customers: { create: mockCustomerCreate },
  }));
});

jest.mock('../../_lib/supabase.js', () => ({
  getUserClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        not: jest.fn(() => ({
          limit: mockSubscriptionsSelect,
        })),
      })),
    })),
  })),
}));

// Evita que requireAuth/rateLimit bloqueen en tests
jest.mock('../../_lib/auth.js', () => ({
  requireAuth: jest.fn((fn) => fn),
  rateLimit: jest.fn(() => (fn) => fn),
  requireSameOrigin: jest.fn((fn) => fn),
  compose: jest.fn((...middlewares) => (handler) => {
    return middlewares.reduceRight((acc, mw) => mw(acc), handler);
  }),
}));

let handler;

beforeEach(() => {
  jest.resetModules();
  mockSessionCreate.mockReset();
  mockCustomerCreate.mockReset();
  mockSubscriptionsSelect.mockReset();

  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.STRIPE_PRICE_BASIC = 'price_basic_test';
  process.env.STRIPE_PRICE_PRO = 'price_pro_test';
  process.env.STRIPE_PRICE_PREMIUM = 'price_premium_test';
  process.env.PUBLIC_APP_URL = 'https://test.lumotech.app';

  handler = require('../checkout.js').default;
});

function makeReq(overrides = {}) {
  return {
    method: 'POST',
    body: { plan: 'basico' },
    headers: { authorization: 'Bearer test-token', origin: 'https://test.lumotech.app' },
    user: { id: 'user-123', email: 'test@restaurante.com' },
    ...overrides,
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('checkout handler', () => {
  it('rechaza métodos no POST', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rechaza plan inválido', async () => {
    const res = makeRes();
    await handler(makeReq({ body: { plan: 'ultra' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Plan') }));
  });

  it.each(['basico', 'pro', 'premium'])('crea sesión para plan %s (sin customer previo)', async (plan) => {
    mockSubscriptionsSelect.mockResolvedValue({ data: [], error: null });
    mockCustomerCreate.mockResolvedValue({ id: 'cus_new' });
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test', id: 'cs_test' });

    const res = makeRes();
    await handler(makeReq({ body: { plan } }), res);

    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@restaurante.com', metadata: { user_id: 'user-123' } })
    );
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        allow_promotion_codes: true,
        customer: 'cus_new',
        client_reference_id: 'user-123',
        line_items: [{ price: expect.stringContaining('_test'), quantity: 1 }],
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ url: 'https://checkout.stripe.com/test', id: 'cs_test' });
  });

  it('reutiliza customer_id existente (no crea duplicado)', async () => {
    mockSubscriptionsSelect.mockResolvedValue({ data: [{ stripe_customer_id: 'cus_existing' }], error: null });
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/reuse', id: 'cs_reuse' });

    const res = makeRes();
    await handler(makeReq({ body: { plan: 'pro' } }), res);

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('devuelve 401 si no hay user', async () => {
    const res = makeRes();
    await handler(makeReq({ user: null }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('devuelve 500 si Stripe falla', async () => {
    mockSubscriptionsSelect.mockResolvedValue({ data: [], error: null });
    mockCustomerCreate.mockRejectedValue(new Error('Stripe network error'));

    const res = makeRes();
    await handler(makeReq({ body: { plan: 'basico' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
