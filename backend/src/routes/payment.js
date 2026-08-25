const express = require('express');
const crypto = require('crypto');
const { getNextId, getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { calcPolicyTotalAmount, buildPolicyRecord } = require('../utils/billing');

const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;
const LAST4_PATTERN = /^\d{4}$/;

/* method -> display label */
const PAYMENT_METHODS = {
  mobile_money: { label: 'Mobile Money' },
  card: { label: 'Card' },
  bank: { label: 'Bank Transfer' }
};

/* Official company accounts shown to users at checkout. Every purchase is recorded
   as "pending_approval" and only becomes a policy after an admin confirms the money arrived. */
const MANUAL_PAYMENT_DETAILS = {
  mobile_money: [
    { network: 'MTN MoMo', number: '0595969885', accountName: 'Mahamoud Abdul Rahaman Peligah' },
    { network: 'Telecel Cash', number: '0202413729', accountName: 'Sulemana Farid Akonatu' },
    { network: 'GhanaPay', number: '0595969885', accountName: 'Mahamoud Abdul Rahaman Peligah' }
  ],
  card: [
    { network: 'GhanaPay (accepts card-funded transfers)', number: '0595969885', accountName: 'Mahamoud Abdul Rahaman Peligah' },
    { network: 'Bank Transfer', number: '90000000001235', accountName: 'Aves-insurance' }
  ],
  bank: [
    { network: 'Bank Transfer', number: '90000000001235', accountName: 'Aves-insurance' }
  ]
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createPaymentRouter() {
  const router = express.Router();

  function deriveLast4(cardNumber) {
    return String(cardNumber || '').replace(/\D/g, '').slice(-4);
  }

  function clearOtherDefaults(db, userId, exceptId = null) {
    db.paymentMethods.forEach((method) => {
      if (method.userId === userId && method.id !== exceptId) {
        method.isDefault = false;
      }
    });
  }

  router.get('/payment-methods', requireAuth, (req, res) => {
    res.json({ ok: true, data: req.db.paymentMethods.filter((m) => m.userId === req.user.id) });
  });

  router.post('/payment-methods', requireAuth, (req, res) => {
    const brand = String(req.body.brand || '').trim();
    const expiry = String(req.body.expiry || '').trim();
    const last4 = deriveLast4(req.body.cardNumber);
    const userMethods = req.db.paymentMethods.filter((m) => m.userId === req.user.id);

    if (!brand) {
      return res.status(422).json({ ok: false, message: 'Brand is required' });
    }
    if (!LAST4_PATTERN.test(last4)) {
      return res.status(422).json({ ok: false, message: 'Card number must end with 4 digits' });
    }
    if (!EXPIRY_PATTERN.test(expiry)) {
      return res.status(422).json({ ok: false, message: 'Expiry must be in MM/YY format' });
    }

    const isDefault = userMethods.length === 0 ? true : Boolean(req.body.isDefault);
    if (isDefault) {
      clearOtherDefaults(req.db, req.user.id);
    }

    const method = { id: getNextId(req.db.paymentMethods), userId: req.user.id, brand, last4, expiry, isDefault };
    req.db.paymentMethods.push(method);
    res.status(201).json({ ok: true, data: method, message: 'Payment method added' });
  });

  router.put('/payment-methods/:id', requireAuth, (req, res) => {
    const method = req.db.paymentMethods.find((m) => m.id === Number(req.params.id) && m.userId === req.user.id);
    if (!method) {
      return res.status(404).json({ ok: false, message: 'Payment method not found' });
    }

    if (req.body.brand !== undefined) {
      const brand = String(req.body.brand || '').trim();
      if (!brand) {
        return res.status(422).json({ ok: false, message: 'Brand cannot be empty' });
      }
      method.brand = brand;
    }
    if (req.body.cardNumber !== undefined) {
      const last4 = deriveLast4(req.body.cardNumber);
      if (!LAST4_PATTERN.test(last4)) {
        return res.status(422).json({ ok: false, message: 'Card number must end with 4 digits' });
      }
      method.last4 = last4;
    }
    if (req.body.expiry !== undefined) {
      const expiry = String(req.body.expiry || '').trim();
      if (!EXPIRY_PATTERN.test(expiry)) {
        return res.status(422).json({ ok: false, message: 'Expiry must be in MM/YY format' });
      }
      method.expiry = expiry;
    }
    if (req.body.isDefault !== undefined) {
      if (req.body.isDefault) {
        clearOtherDefaults(req.db, req.user.id, method.id);
      }
      method.isDefault = Boolean(req.body.isDefault);
    }

    res.json({ ok: true, data: method, message: 'Payment method updated' });
  });

  router.delete('/payment-methods/:id', requireAuth, (req, res) => {
    const index = req.db.paymentMethods.findIndex((m) => m.id === Number(req.params.id) && m.userId === req.user.id);
    if (index === -1) {
      return res.status(404).json({ ok: false, message: 'Payment method not found' });
    }

    const [removed] = req.db.paymentMethods.splice(index, 1);
    if (removed.isDefault) {
      const next = req.db.paymentMethods.find((m) => m.userId === req.user.id);
      if (next) next.isDefault = true;
    }

    res.json({ ok: true, message: 'Payment method removed' });
  });

  /* ---------- Policy purchase checkout ---------- */

  /* Official account details for manual Card / Mobile Money / Bank payments */
  router.get('/payments/instructions/:method', requireAuth, (req, res) => {
    const methodKey = String(req.params.method || '').trim();
    const details = MANUAL_PAYMENT_DETAILS[methodKey];
    if (!details) {
      return res.status(422).json({ ok: false, message: 'Unknown payment method' });
    }
    res.json({ ok: true, data: { method: methodKey, label: PAYMENT_METHODS[methodKey].label, accounts: details } });
  });

  router.post('/payments/initialize', requireAuth, asyncHandler(async (req, res) => {
    const type = String(req.body.type || '').trim();
    const coverage = String(req.body.coverage || '').trim();
    const startDate = String(req.body.startDate || '').trim();
    const endDate = String(req.body.endDate || '').trim();
    const methodKey = String(req.body.method || '').trim();

    const method = PAYMENT_METHODS[methodKey];
    if (!method) {
      return res.status(422).json({ ok: false, message: 'Select a valid payment method' });
    }
    if (!type || !coverage || !startDate || !endDate) {
      return res.status(422).json({ ok: false, message: 'Type, coverage and dates are required' });
    }

    /* Premium is always recomputed server-side - the client amount is ignored */
    const premium = calcPolicyTotalAmount(type, startDate, endDate);
    if (premium === null || premium <= 0) {
      return res.status(422).json({ ok: false, message: 'Invalid policy details or date range' });
    }

    const reference = `AVS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    /* All methods (Card, Mobile Money, Bank) are manual transfers to official company
       accounts. The purchase is recorded and only becomes a policy after an admin
       approves it - there is no gateway and no automatic issuance. */
    const payment = {
      id: getNextId(req.db.payments),
      userId: req.user.id,
      reference,
      draft: { type, coverage, startDate, endDate, premium },
      amount: premium,
      currency: 'GHS',
      method: methodKey,
      provider: 'manual',
      status: 'pending_approval',
      policyId: null,
      createdAt: new Date().toISOString(),
      paidAt: null
    };
    req.db.payments.push(payment);

    return res.json({
      ok: true,
      data: {
        reference,
        provider: 'manual',
        method: methodKey,
        amount: premium,
        status: 'pending_approval',
        instructions: MANUAL_PAYMENT_DETAILS[methodKey]
      },
      message: 'Purchase submitted. It will appear on your dashboard once an admin approves your payment.'
    });
  }));

  /* Status lookup by reference - kept so existing links keep working.
     Policies are never issued here; approval happens through the admin endpoints. */
  router.get('/payments/verify/:reference', requireAuth, (req, res) => {
    const db = req.db;
    const payment = db.payments.find(
      (p) => p.reference === req.params.reference && p.userId === req.user.id
    );
    if (!payment) {
      return res.status(404).json({ ok: false, message: 'Payment not found' });
    }

    if (payment.status === 'approved' || payment.status === 'paid') {
      const policy = db.policies.find((p) => p.id === payment.policyId);
      return res.json({ ok: true, data: { status: 'paid', policy, payment } });
    }

    if (payment.status === 'pending_approval' || payment.status === 'pending') {
      return res.json({ ok: false, data: { status: 'pending_approval', payment }, message: 'Awaiting admin approval.' });
    }

    return res.json({ ok: false, data: { status: payment.status }, message: `This purchase was ${payment.status}. No policy was issued.` });
  });

  /* ---------- Admin: manual purchase approvals ---------- */

  router.get('/admin/purchases/pending', requireAdmin, asyncHandler(async (_req, res) => {
    const db = getDb();
    const purchases = db.payments
      .filter((p) => p.status === 'pending_approval')
      .map((p) => {
        const owner = db.users.find((u) => u.id === p.userId);
        return { ...p, userName: owner ? owner.name : 'Unknown', userEmail: owner ? owner.email : 'Unknown' };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ ok: true, data: purchases });
  }));

  router.post('/admin/purchases/:id/approve', requireAdmin, asyncHandler(async (req, res) => {
    const db = getDb();
    const payment = db.payments.find((p) => p.id === Number(req.params.id));
    if (!payment) return res.status(404).json({ ok: false, message: 'Purchase not found' });
    if (payment.status !== 'pending_approval') {
      return res.status(422).json({ ok: false, message: `This purchase is already ${payment.status}` });
    }

    /* Issue the policy only now that the admin has confirmed the money arrived */
    const policy = buildPolicyRecord(db, payment.userId, { ...payment.draft });
    db.policies.push(policy);
    payment.status = 'approved';
    payment.policyId = policy.id;
    payment.paidAt = new Date().toISOString();

    const owner = db.users.find((u) => u.id === payment.userId);
    db.notifications.push({
      id: getNextId(db.notifications),
      userId: payment.userId,
      type: 'purchase',
      message: `Congratulations ${owner ? owner.name : ''}! Your new ${policy.type} (${policy.policyNumber}) has been approved and is now active on your dashboard through ${policy.endDate}. Thank you for choosing Aves Insurance!`,
      date: new Date().toISOString().slice(0, 10),
      read: false
    });

    return res.json({ ok: true, data: { payment, policy }, message: 'Purchase approved and policy activated' });
  }));

  router.post('/admin/purchases/:id/reject', requireAdmin, asyncHandler(async (req, res) => {
    const db = getDb();
    const payment = db.payments.find((p) => p.id === Number(req.params.id));
    if (!payment) return res.status(404).json({ ok: false, message: 'Purchase not found' });
    if (payment.status !== 'pending_approval') {
      return res.status(422).json({ ok: false, message: `This purchase is already ${payment.status}` });
    }

    payment.status = 'rejected';
    return res.json({ ok: true, data: payment, message: 'Purchase rejected - no policy was issued' });
  }));

  return router;
}

module.exports = createPaymentRouter;
