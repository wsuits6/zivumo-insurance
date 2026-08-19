const express = require('express');
const { requireAuth } = require('../middleware/auth');

function createResourcesRouter() {
  const router = express.Router();

  router.get('/notifications', requireAuth, (req, res) => {
    res.json({ ok: true, data: req.db.notifications.filter((n) => n.userId === req.user.id) });
  });

  router.get('/documents', requireAuth, (req, res) => {
    res.json({ ok: true, data: req.db.documents.filter((d) => d.userId === req.user.id) });
  });

  router.get('/invoices', requireAuth, (req, res) => {
    res.json({ ok: true, data: req.db.invoices.filter((i) => i.userId === req.user.id) });
  });

  router.get('/payment-methods', requireAuth, (req, res) => {
    res.json({ ok: true, data: req.db.paymentMethods.filter((m) => m.userId === req.user.id) });
  });

  return router;
}

module.exports = createResourcesRouter;
