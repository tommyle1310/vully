-- Check user contracts and role assignments for debugging
-- This script helps diagnose why a resident might not see their apartment

-- 1. Show all users with their roles
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    array_agg(DISTINCT ura.role) as assigned_roles
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. Show all contracts with user and apartment details
SELECT 
    c.id as contract_id,
    c.status,
    c.start_date,
    c.end_date,
    u.email as tenant_email,
    u.first_name || ' ' || u.last_name as tenant_name,
    a.unit_number,
    b.name as building_name,
    c.created_at
FROM contracts c
JOIN users u ON c.tenant_id = u.id
JOIN apartments a ON c.apartment_id = a.id
JOIN buildings b ON a.building_id = b.id
ORDER BY c.created_at DESC
LIMIT 10;

-- 3. Show contracts for residents (users with 'resident' role)
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as tenant_name,
    c.status,
    a.unit_number,
    b.name as building_name,
    c.start_date,
    c.end_date
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN contracts c ON u.id = c.tenant_id
JOIN apartments a ON c.apartment_id = a.id
JOIN buildings b ON a.building_id = b.id
WHERE ura.role = 'resident'
ORDER BY c.created_at DESC;

-- 4. Check for residents without active contracts
SELECT 
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    COUNT(c.id) as total_contracts,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_contracts
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN contracts c ON u.id = c.tenant_id
WHERE ura.role = 'resident'
GROUP BY u.id, u.email, u.first_name, u.last_name
HAVING COUNT(CASE WHEN c.status = 'active' THEN 1 END) = 0;

-- 5. Show meter readings with apartment and tenant info
SELECT 
    mr.id,
    mr.billing_period,
    mr.reading_date,
    mr.current_value,
    mr.usage,
    ut.name as utility_type,
    a.unit_number,
    b.name as building_name,
    c.status as contract_status,
    u.email as tenant_email
FROM meter_readings mr
JOIN apartments a ON mr.apartment_id = a.id
JOIN buildings b ON a.building_id = b.id
JOIN utility_types ut ON mr.utility_type_id = ut.id
LEFT JOIN contracts c ON a.id = c.apartment_id AND c.status = 'active'
LEFT JOIN users u ON c.tenant_id = u.id
ORDER BY mr.created_at DESC
LIMIT 10;
