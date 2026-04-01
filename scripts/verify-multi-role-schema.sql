-- Verify Multi-Role Schema
-- Run this to confirm database is properly set up

-- 1. Check that new tables exist
SELECT 
    'user_role_assignments' as table_name, 
    COUNT(*) as record_count 
FROM user_role_assignments
UNION ALL
SELECT 
    'permissions',
    COUNT(*) 
FROM permissions
UNION ALL
SELECT 
    'role_permissions',
    COUNT(*) 
FROM role_permissions;

-- 2. Show current users and their role assignments
SELECT 
    u.id,
    u.email,
    u.role as deprecated_single_role,
    ARRAY_AGG(ura.role) as current_roles,
    COUNT(ura.id) as role_count
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
GROUP BY u.id, u.email, u.role
ORDER BY u.created_at DESC;

-- 3. Find users without role assignments (need migration)
SELECT 
    u.id,
    u.email,
    u.role as deprecated_role,
    u.created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    WHERE ura.user_id = u.id
)
ORDER BY u.created_at ASC;

-- 4. Show users with multiple roles
SELECT 
    u.email,
    ARRAY_AGG(ura.role ORDER BY ura.created_at) as roles,
    COUNT(ura.id) as role_count
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
GROUP BY u.id, u.email
HAVING COUNT(ura.id) > 1
ORDER BY role_count DESC;
