INSERT INTO users (name, email, password_hash, phone, address, preferences)
VALUES (
    'John Doe',
    'john.doe@email.com',
    '$2y$12$UTpZlWHVCpfaX9ySHrFg8eWQRzhGeHOqb9jKgjqpGjVPsH1dCgNLW',
    '(555) 201-8890',
    '245 North Harbor Way, Suite 300, San Diego, CA 92101',
    JSON_OBJECT('renewals', true, 'claims', true, 'announcements', false)
);
