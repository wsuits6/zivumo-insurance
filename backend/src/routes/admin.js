const express = require('express');
const bcrypt = require('bcryptjs');
const { readDb, writeDb } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const ADMIN_PASSWORD_SEED = process.env.ADMIN_PASSWORD_SEED || '';
const ADMIN_PASSWORD_HASH = ADMIN_PASSWORD_SEED ? bcrypt.hashSync(ADMIN_PASSWORD_SEED, 10) : null;

function createAdminRouter({ loginLimiter }) {
  const router = express.Router();

  router.post('/login', loginLimiter, async (req, res) => {
    const password = String(req.body.password || '');

    if (!ADMIN_PASSWORD_SEED || !ADMIN_PASSWORD_HASH) {
      return res.status(500).json({ ok: false, message: 'Admin password seed not configured' });
    }
    if (!password) {
      return res.status(422).json({ ok: false, message: 'Admin password is required' });
    }

    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    req.session.isAdmin = true;
    return res.json({ ok: true, message: 'Admin authenticated' });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true, message: 'Logged out' });
    });
  });

  router.get('/me', requireAdmin, (_req, res) => {
    res.json({ ok: true, data: { role: 'admin' } });
  });

  router.get('/summary', requireAdmin, async (_req, res) => {
    const db = await readDb();
    const totalUsers = db.users.length;
    const totalPolicies = db.policies.length;
    const activePolicies = db.policies.filter((p) => p.status === 'active').length;
    const totalPremium = db.policies.reduce((sum, policy) => sum + (Number(policy.premium) || 0), 0);

    res.json({
      ok: true,
      data: {
        totalUsers,
        totalPolicies,
        activePolicies,
        totalPremium: totalPremium.toFixed(2)
      }
    });
  });

  router.get('/users', requireAdmin, async (_req, res) => {
    const db = await readDb();
    const users = db.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      policies: db.policies.filter((p) => p.userId === user.id).length,
      archived: user.archived || false
    }));
    res.json({ ok: true, data: users });
  });

  router.get('/policies', requireAdmin, async (_req, res) => {
    const db = await readDb();
    const policies = db.policies.map((policy) => {
      const owner = db.users.find((u) => u.id === policy.userId);
      return {
        ...policy,
        userName: owner ? owner.name : 'Unknown',
        userEmail: owner ? owner.email : 'Unknown'
      };
    });
    res.json({ ok: true, data: policies });
  });

  router.post('/policies/:id/status', requireAdmin, async (req, res) => {
    const policyId = Number(req.params.id);
    const status = String(req.body.status || '').trim();
    const allowed = new Set(['active', 'pending_renewal', 'cancelled']);

    if (!allowed.has(status)) {
      return res.status(422).json({ ok: false, message: 'Invalid status' });
    }

    const db = await readDb();
    const policy = db.policies.find((p) => p.id === policyId);
    if (!policy) {
      return res.status(404).json({ ok: false, message: 'Policy not found' });
    }

    policy.status = status;
    await writeDb(db);
    return res.json({ ok: true, data: policy, message: 'Policy status updated' });
  });

  router.post('/users', requireAdmin, async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email) {
      return res.status(422).json({ ok: false, message: 'Name and email are required' });
    }
    if (!password || password.length < 6) {
      return res.status(422).json({ ok: false, message: 'Password must be at least 6 characters' });
    }

    const db = await readDb();
    if (db.users.find((u) => u.email === email)) {
      return res.status(409).json({ ok: false, message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: getNextId(db.users),
      name,
      email,
      passwordHash,
      phone: '',
      address: '',
      preferences: { renewals: true, claims: true, announcements: false }
    };

    db.users.push(newUser);
    await writeDb(db);
    return res.status(201).json({ ok: true, data: { id: newUser.id, name, email }, message: 'User created successfully' });
  });

  router.post('/users/:id/delete', requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const db = await readDb();
    const index = db.users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    db.users.splice(index, 1);
    db.policies = db.policies.filter((p) => p.userId !== userId);
    await writeDb(db);
    return res.json({ ok: true, message: 'User deleted successfully' });
  });

  router.post('/users/:id/archive', requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const db = await readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    user.archived = true;
    await writeDb(db);
    return res.json({ ok: true, data: { id: user.id }, message: 'User archived successfully' });
  });

  router.post('/users/:id/restore', requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const db = await readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }
    user.archived = false;
    await writeDb(db);
    return res.json({ ok: true, data: { id: user.id }, message: 'User restored successfully' });
  });

  router.post('/policies/:id/delete', requireAdmin, async (req, res) => {
    const policyId = Number(req.params.id);
    const db = await readDb();
    const index = db.policies.findIndex((p) => p.id === policyId);
    if (index === -1) {
      return res.status(404).json({ ok: false, message: 'Policy not found' });
    }
    db.policies.splice(index, 1);
    await writeDb(db);
    return res.json({ ok: true, message: 'Policy deleted successfully' });
  });

  router.post('/policies/:id/archive', requireAdmin, async (req, res) => {
    const policyId = Number(req.params.id);
    const db = await readDb();
    const policy = db.policies.find((p) => p.id === policyId);
    if (!policy) {
      return res.status(404).json({ ok: false, message: 'Policy not found' });
    }
    policy.archived = true;
    await writeDb(db);
    return res.json({ ok: true, data: { id: policy.id }, message: 'Policy archived successfully' });
  });

  router.post('/policies/:id/restore', requireAdmin, async (req, res) => {
    const policyId = Number(req.params.id);
    const db = await readDb();
    const policy = db.policies.find((p) => p.id === policyId);
    if (!policy) {
      return res.status(404).json({ ok: false, message: 'Policy not found' });
    }
    policy.archived = false;
    await writeDb(db);
    return res.json({ ok: true, data: { id: policy.id }, message: 'Policy restored successfully' });
  });

  router.post('/assign-policy', requireAdmin, async (req, res) => {
    const { userId, type, coverage, startDate, endDate, premium } = req.body;

    if (!userId || !type || !coverage || !startDate || !endDate || !premium) {
      return res.status(422).json({ ok: false, message: 'Missing required policy fields' });
    }

    const db = await readDb();
    const user = db.users.find((u) => u.id === Number(userId));
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const id = getNextId(db.policies);
    const year = new Date(startDate).getFullYear();
    const policyNumber = `${type.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${year}-${id}`;

    const policy = {
      id,
      userId: Number(userId),
      type,
      policyNumber,
      status: 'active',
      coverage,
      startDate,
      endDate,
      premium: Number(premium),
      currency: 'GHS'
    };

    db.policies.push(policy);
    await writeDb(db);
    return res.status(201).json({ ok: true, data: policy, message: 'Policy assigned successfully' });
  });

  /* ---------- Reports & Analytics ---------- */
  router.get('/reports/summary', requireAdmin, async (_req, res) => {
    try {
      const db = await readDb();
      const policies = db.policies || [];
      const users = db.users || [];

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      /* --- Policies per month (from startDate) --- */
      const policiesByMonth = {};
      policies.forEach((p) => {
        const d = new Date(p.startDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!policiesByMonth[key]) policiesByMonth[key] = { label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, count: 0, premium: 0 };
        policiesByMonth[key].count += 1;
        policiesByMonth[key].premium += Number(p.premium) || 0;
      });
      const sortedMonthKeys = Object.keys(policiesByMonth).sort();
      const policiesPerMonth = sortedMonthKeys.map((k) => ({ month: policiesByMonth[k].label, count: policiesByMonth[k].count }));
      const premiumPerMonth = sortedMonthKeys.map((k) => ({ month: policiesByMonth[k].label, total: Number(policiesByMonth[k].premium.toFixed(2)) }));

      /* --- Users per month (from id ordering as proxy for creation time) --- */
      const usersPerMonth = {};
      users.forEach((u) => {
        const d = new Date(Date.UTC(2026, 0, 1));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!usersPerMonth[key]) usersPerMonth[key] = { label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, count: 0 };
        usersPerMonth[key].count += 1;
      });

      /* --- Policy type distribution (pie) --- */
      const typeCounts = {};
      policies.forEach((p) => {
        const t = p.type || 'Unknown';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      const policyTypeDistribution = Object.entries(typeCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      /* --- Policy status breakdown (pie) --- */
      const statusCounts = {};
      policies.forEach((p) => {
        const s = p.status || 'unknown';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      const policyStatusBreakdown = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value }));

      /* --- User status distribution (pie) --- */
      let activeUsers = 0;
      let archivedUsers = 0;
      users.forEach((u) => {
        if (u.archived) archivedUsers++;
        else activeUsers++;
      });

      /* --- Summary numbers --- */
      const totalUsers = users.length;
      const totalPolicies = policies.length;
      const activePolicies = policies.filter((p) => p.status === 'active').length;
      const pendingPolicies = policies.filter((p) => p.status === 'pending_renewal').length;
      const cancelledPolicies = policies.filter((p) => p.status === 'cancelled').length;
      const totalPremium = policies.reduce((s, p) => s + (Number(p.premium) || 0), 0);

      /* --- Auto-generated text summary --- */
      const summaryLines = [];

      if (totalPolicies === 0) {
        summaryLines.push('No policies have been created yet. Data will appear once policies are added.');
      } else {
        if (policyTypeDistribution.length > 0) {
          const top = policyTypeDistribution[0];
          const pct = ((top.value / totalPolicies) * 100).toFixed(1);
          summaryLines.push(`The most popular policy type is "${top.name}" with ${top.value} policies (${pct}% of all policies).`);
        }

        if (sortedMonthKeys.length >= 2) {
          const latest = policiesByMonth[sortedMonthKeys[sortedMonthKeys.length - 1]];
          const prev = policiesByMonth[sortedMonthKeys[sortedMonthKeys.length - 2]];
          if (prev.count > 0) {
            const change = (((latest.count - prev.count) / prev.count) * 100).toFixed(1);
            const direction = latest.count >= prev.count ? 'increased' : 'decreased';
            summaryLines.push(`Policy signups ${direction} by ${Math.abs(change)}% from ${prev.label} (${prev.count}) to ${latest.label} (${latest.count}).`);
          } else {
            summaryLines.push(`${latest.label} saw ${latest.count} new policy signups.`);
          }
        } else if (sortedMonthKeys.length === 1) {
          const latest = policiesByMonth[sortedMonthKeys[0]];
          summaryLines.push(`${latest.label} saw ${latest.count} policy signups.`);
        }

        if (totalPolicies > 0) {
          const ratio = activePolicies / totalPolicies;
          summaryLines.push(`${activePolicies} of ${totalPolicies} policies are active (${(ratio * 100).toFixed(1)}% active, ${pendingPolicies} pending renewal, ${cancelledPolicies} cancelled).`);
        }

        summaryLines.push(`Total premium collected across all policies: GHS ${totalPremium.toFixed(2)}.`);
      }

      if (totalUsers > 0) {
        const userPct = ((activeUsers / totalUsers) * 100).toFixed(1);
        summaryLines.push(`${activeUsers} of ${totalUsers} users are active (${userPct}% active, ${archivedUsers} archived).`);
      }

      res.json({
        ok: true,
        data: {
          policiesPerMonth,
          premiumPerMonth,
          usersPerMonth,
          policyTypeDistribution,
          policyStatusBreakdown,
          userStatusDistribution: [
            { name: 'Active', value: activeUsers },
            { name: 'Archived', value: archivedUsers }
          ],
          totals: {
            totalUsers,
            totalPolicies,
            activePolicies,
            pendingPolicies,
            cancelledPolicies,
            totalPremium: Number(totalPremium.toFixed(2))
          },
          summaryLines
        }
      });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Failed to generate report data' });
    }
  });

  return router;
}

module.exports = createAdminRouter;
