-- Data Migration: Migrate existing single-role users to multi-role system
-- This script creates UserRoleAssignment junction table records for all existing users
-- based on their current 'role' field value

DO $$
DECLARE
    user_record RECORD;
    role_count INTEGER;
    total_migrated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting user role migration...';
    
    -- Check if user_role_assignments table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_role_assignments'
    ) THEN
        RAISE EXCEPTION 'user_role_assignments table does not exist. Run Prisma migration first.';
    END IF;

    -- Migrate each user's single role to user_role_assignments junction table
    FOR user_record IN 
        SELECT id, email, role 
        FROM users 
        WHERE role IS NOT NULL
    LOOP
        -- Check if user already has role assignments
        SELECT COUNT(*) INTO role_count
        FROM user_role_assignments
        WHERE user_id = user_record.id;

        IF role_count = 0 THEN
            -- Create role assignment for the user's existing role
            INSERT INTO user_role_assignments (user_id, role)
            VALUES (user_record.id, user_record.role)
            ON CONFLICT (user_id, role) DO NOTHING;

            total_migrated := total_migrated + 1;
            RAISE NOTICE 'Migrated user %: % -> role: %', 
                user_record.id, user_record.email, user_record.role;
        ELSE
            RAISE NOTICE 'User % already has % role assignment(s), skipping', 
                user_record.email, role_count;
        END IF;
    END LOOP;

    -- Verification: Check for users without any roles
    SELECT COUNT(*) INTO role_count
    FROM users u
    LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
    WHERE ura.id IS NULL;

    IF role_count > 0 THEN
        RAISE WARNING '% users have no role assignments!', role_count;
        
        -- List users without roles
        FOR user_record IN
            SELECT u.id, u.email
            FROM users u
            LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
            WHERE ura.id IS NULL
        LOOP
            RAISE WARNING 'User without role: % (%)', user_record.email, user_record.id;
        END LOOP;
    ELSE
        RAISE NOTICE 'All users have role assignments ✓';
    END IF;

    -- Summary
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'Migration complete: % users migrated', total_migrated;
    RAISE NOTICE '=====================================';
    
END $$;

-- Validate migration results
SELECT 
    u.email,
    u.role AS legacy_role,
    array_agg(ura.role ORDER BY ura.created_at) AS new_roles,
    COUNT(ura.id) AS role_count
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
GROUP BY u.id, u.email, u.role
ORDER BY u.email
LIMIT 20;

-- Summary statistics
SELECT 
    'Total Users' AS metric,
    COUNT(DISTINCT u.id) AS count
FROM users u
UNION ALL
SELECT 
    'Users with Roles' AS metric,
    COUNT(DISTINCT ura.user_id) AS count
FROM user_role_assignments ura
UNION ALL
SELECT 
    'Total Role Assignments' AS metric,
    COUNT(*) AS count
FROM user_role_assignments
UNION ALL
SELECT 
    'Users with 1 Role' AS metric,
    COUNT(*) AS count
FROM (
    SELECT user_id
    FROM user_role_assignments
    GROUP BY user_id
    HAVING COUNT(*) = 1
) sub
UNION ALL
SELECT 
    'Users with 2+ Roles' AS metric,
    COUNT(*) AS count
FROM (
    SELECT user_id
    FROM user_role_assignments
    GROUP BY user_id
    HAVING COUNT(*) > 1
) sub;
