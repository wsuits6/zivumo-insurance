const express = require('express');
const { writeDb, getNextId } = require('../db');
const { requireAuth } = require('../middleware/auth');

function createPoliciesRouter() {
  const router = express.Router();

  router.get('/policies', requireAuth, async (req, res) => {
    const policies = req.db.policies.filter((p) => p.userId === req.user.id);
    const today = new Date();
    const enriched = policies.map((policy) => {
      const endDate = new Date(policy.endDate);
      const totalDays = Math.max(1, Math.ceil((endDate - new Date(policy.startDate)) / 86400000));
      const remaining = Math.max(0, Math.ceil((endDate - today) / 86400000));
      return {
        ...policy,
        remainingDays: remaining,
        progress: Math.min(100, Math.max(0, Math.round(((totalDays - remaining) / totalDays) * 100)))
      };
    });
    res.json({ ok: true, data: enriched });
  });

  router.get('/policies/:id', requireAuth, async (req, res) => {
    const policyId = Number(req.params.id);
    const policy = req.db.policies.find((p) => p.id === policyId && p.userId === req.user.id);
    if (!policy) {
      return res.status(404).json({ ok: false, message: 'Policy not found' });
    }
    res.json({ ok: true, data: policy });
  });

  router.post('/policies', requireAuth, async (req, res) => {
    const type = String(req.body.type || '').trim();
    const coverage = String(req.body.coverage || '').trim();
    const startDate = String(req.body.startDate || '').trim();
    const endDate = String(req.body.endDate || '').trim();
    const premium = Number(req.body.premium || 0);
    const currency = String(req.body.currency || 'USD').trim().toUpperCase();

    if (!type || !coverage || !startDate || !endDate || !premium) {
      return res.status(422).json({ ok: false, message: 'Type, coverage, dates, and premium are required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
      return res.status(422).json({ ok: false, message: 'Invalid policy date range' });
    }

    const id = getNextId(req.db.policies);
    const year = start.getFullYear() || new Date().getFullYear();
    const policyNumber = `${type.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${year}-${id}`;

    const policy = {
      id,
      userId: req.user.id,
      type,
      policyNumber,
      status: 'active',
      coverage,
      startDate,
      endDate,
      premium,
      currency
    };

    req.db.policies.push(policy);
    await writeDb(req.db);

    res.status(201).json({ ok: true, data: policy, message: 'Policy created' });
  });

  router.post('/policies/:id/renew', requireAuth, async (req, res) => {
    const policyId = Number(req.params.id);
    const policy = req.db.policies.find((p) => p.id === policyId && p.userId === req.user.id);
    if (!policy) {
      return res.status(404).json({ ok: false, message: 'Policy not found' });
    }

    const currentEnd = new Date(policy.endDate);
    const nextEnd = new Date(currentEnd);
    nextEnd.setFullYear(currentEnd.getFullYear() + 1);
    policy.endDate = nextEnd.toISOString().slice(0, 10);
    policy.status = 'active';

    req.db.notifications.push({
      id: getNextId(req.db.notifications),
      userId: req.user.id,
      type: 'renewal',
      message: `${policy.type} policy ${policy.policyNumber} renewed through ${policy.endDate}.`,
      date: new Date().toISOString().slice(0, 10),
      read: false
    });

    await writeDb(req.db);
    res.json({ ok: true, data: policy, message: 'Policy renewed' });
  });

  return router;
}

module.exports = createPoliciesRouter;
