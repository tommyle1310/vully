-- Upgrade User to Admin Role
-- Replace 'your-email@example.com' with your actual email

-- Option 1: Upgrade by email
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Option 2: Upgrade by user ID
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE id = 'your-user-id-here';

-- Verify the change
SELECT id, email, role, "firstName", "lastName", "isActive"
FROM users 
WHERE email = 'your-email@example.com';

-- List all admin users
SELECT id, email, role, "firstName", "lastName", "isActive"
FROM users 
WHERE role = 'admin';
