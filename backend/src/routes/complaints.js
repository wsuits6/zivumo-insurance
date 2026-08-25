const express = require('express');
const { getDb, getNextId } = require('../db');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const COMPLAINT_STATUSES = ['open', 'in-progress', 'resolved'];

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createComplaintsRouter() {
  const router = express.Router();

  /* ---------- User routes ---------- */

  router.get('/complaints', optionalAuth, (req, res) => {
    if (req.user) {
      const complaints = req.db.complaints
        .filter((c) => c.userId === req.user.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ ok: true, data: complaints, authenticated: true });
    }
    const email = String(req.query.email || '').trim().toLowerCase();
    if (email) {
      const complaints = req.db.complaints
        .filter((c) => c.guestEmail && c.guestEmail.toLowerCase() === email)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ ok: true, data: complaints, authenticated: false });
    }
    return res.json({ ok: true, data: [], authenticated: false });
  });

  router.post('/complaints', optionalAuth, (req, res) => {
    const subject = String(req.body.subject || '').trim();
    const description = String(req.body.description || '').trim();

    if (!subject || !description) {
      return res.status(422).json({ ok: false, message: 'Subject and description are required' });
    }
    if (subject.length > 150) {
      return res.status(422).json({ ok: false, message: 'Subject must be 150 characters or fewer' });
    }
    if (description.length > 5000) {
      return res.status(422).json({ ok: false, message: 'Description must be 5000 characters or fewer' });
    }

    let complaint;

    if (req.user) {
      complaint = {
        id: getNextId(req.db.complaints),
        userId: req.user.id,
        subject,
        description,
        status: 'open',
        createdAt: new Date().toISOString(),
        replies: []
      };
    } else {
      const guestName = String(req.body.name || '').trim();
      const guestEmail = String(req.body.email || '').trim().toLowerCase();
      if (!guestName || !guestEmail) {
        return res.status(422).json({ ok: false, message: 'Name and email are required for guest submissions' });
      }
      complaint = {
        id: getNextId(req.db.complaints),
        userId: null,
        guestName,
        guestEmail,
        subject,
        description,
        status: 'open',
        createdAt: new Date().toISOString(),
        replies: []
      };
    }

    req.db.complaints.push(complaint);

    return res.status(201).json({ ok: true, data: complaint, message: 'Complaint submitted successfully' });
  });

  router.post('/complaints/:id/reply', optionalAuth, (req, res) => {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ ok: false, message: 'Reply message is required' });
    if (message.length > 5000) {
      return res.status(422).json({ ok: false, message: 'Reply must be 5000 characters or fewer' });
    }

    const db = getDb();
    const complaint = db.complaints.find((c) => c.id === Number(req.params.id));
    if (!complaint) return res.status(404).json({ ok: false, message: 'Complaint not found' });

    if (req.user) {
      if (complaint.userId !== req.user.id) {
        return res.status(403).json({ ok: false, message: 'Not authorized' });
      }
    } else {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email || !complaint.guestEmail || complaint.guestEmail.toLowerCase() !== email) {
        return res.status(403).json({ ok: false, message: 'Not authorized' });
      }
    }

    const reply = {
      sender: 'user',
      userId: req.user ? req.user.id : null,
      message,
      timestamp: new Date().toISOString()
    };
    complaint.replies.push(reply);

    return res.json({ ok: true, data: complaint, message: 'Reply sent' });
  });

  /* ---------- Admin routes ---------- */

  router.get('/admin/complaints', requireAdmin, (req, res) => {
    const db = getDb();
    const complaints = db.complaints
      .map((complaint) => {
        const owner = db.users.find((u) => u.id === complaint.userId);
        return {
          ...complaint,
          userName: owner ? owner.name : (complaint.guestName || 'Unknown'),
          userEmail: owner ? owner.email : (complaint.guestEmail || 'Unknown')
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ ok: true, data: complaints });
  });

  router.post('/admin/complaints/:id/reply', requireAdmin, (req, res) => {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ ok: false, message: 'Reply message is required' });
    if (message.length > 5000) {
      return res.status(422).json({ ok: false, message: 'Reply must be 5000 characters or fewer' });
    }

    const db = getDb();
    const complaint = db.complaints.find((c) => c.id === Number(req.params.id));
    if (!complaint) return res.status(404).json({ ok: false, message: 'Complaint not found' });

    const reply = {
      sender: 'admin',
      adminId: req.admin && req.admin.adminId != null ? req.admin.adminId : null,
      message,
      timestamp: new Date().toISOString()
    };
    complaint.replies.push(reply);

    if (complaint.status === 'open') {
      complaint.status = 'in-progress';
    }

    if (complaint.userId) {
      db.notifications.push({
        id: getNextId(db.notifications),
        userId: complaint.userId,
        type: 'complaint_reply',
        complaintId: complaint.id,
        subject: complaint.subject,
        replyText: message,
        replyTimestamp: reply.timestamp,
        message: `Admin replied to your complaint "${complaint.subject}": ${message}`,
        date: new Date().toISOString().slice(0, 10),
        read: false
      });
    }

    return res.json({ ok: true, data: complaint, message: 'Reply sent' });
  });

  router.put('/admin/complaints/:id/status', requireAdmin, (req, res) => {
    const status = String(req.body.status || '').trim();
    if (!COMPLAINT_STATUSES.includes(status)) {
      return res.status(422).json({ ok: false, message: 'Invalid status' });
    }

    const db = getDb();
    const complaint = db.complaints.find((c) => c.id === Number(req.params.id));
    if (!complaint) return res.status(404).json({ ok: false, message: 'Complaint not found' });

    complaint.status = status;
    return res.json({ ok: true, data: complaint, message: 'Complaint status updated' });
  });

  return router;
}

module.exports = createComplaintsRouter;
