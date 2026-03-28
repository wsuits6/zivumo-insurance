const express = require('express');
const { requireAuth } = require('../middleware/auth');

function createResourcesRouter() {
  const router = express.Router();

  router.get('/notifications', requireAuth, (req, res) => {
    const items = req.db.notifications.filter((n) => n.userId === req.user.id);
    res.json({ ok: true, data: items });
  });

  router.get('/documents', requireAuth, (req, res) => {
    const docs = req.db.documents.filter((d) => d.userId === req.user.id);
    res.json({ ok: true, data: docs });
  });

  router.get('/invoices', requireAuth, (req, res) => {
    const invoices = req.db.invoices.filter((i) => i.userId === req.user.id);
    res.json({ ok: true, data: invoices });
  });

  router.get('/payment-methods', requireAuth, (req, res) => {
    const methods = req.db.paymentMethods.filter((m) => m.userId === req.user.id);
    res.json({ ok: true, data: methods });
  });

  return router;
}

module.exports = createResourcesRouter;
