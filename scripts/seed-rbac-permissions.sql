-- Seed RBAC Permissions for Operations Automation Roles
-- Run after migration: psql -d vully -f scripts/seed-rbac-permissions.sql

-- Insert new permissions (idempotent - ON CONFLICT DO NOTHING)
INSERT INTO permissions (key, description) VALUES
  -- User management
  ('users:manage', 'Create, update, delete users'),
  ('users:read', 'View user profiles'),
  
  -- Building management
  ('buildings:manage', 'Create, update, delete buildings'),
  ('buildings:read', 'View building information'),
  
  -- Apartment management
  ('apartments:manage', 'Create, update, delete apartments'),
  ('apartments:read', 'View apartment information'),
  
  -- Invoice management
  ('invoices:manage', 'Create, update, delete invoices'),
  ('invoices:read', 'View invoices'),
  
  -- Incident management
  ('incidents:manage', 'Create, update, delete incidents'),
  ('incidents:read', 'View incidents'),
  ('incidents:update_status', 'Update incident status only'),
  
  -- Access card management
  ('access_cards:manage', 'Create, update, delete access cards'),
  ('access_cards:read', 'View access cards'),
  
  -- Financial reports
  ('reports:financial', 'View financial reports and dashboards'),
  
  -- Resident data
  ('residents:read', 'View resident information'),
  
  -- Unmatched payments (accountant workflow)
  ('unmatched_payments:manage', 'Match or reject unmatched payments'),
  ('unmatched_payments:read', 'View unmatched payments list'),
  
  -- Contract management
  ('contracts:manage', 'Create, update, delete contracts'),
  ('contracts:read', 'View contracts'),
  
  -- Payment reconciliation
  ('payments:reconcile', 'Trigger payment reconciliation'),
  
  -- Notifications
  ('notifications:broadcast', 'Send building-wide announcements')
ON CONFLICT (key) DO NOTHING;

-- Clear existing role_permissions for new roles (to avoid duplicates on re-run)
DELETE FROM role_permissions WHERE role IN ('security', 'housekeeping', 'accountant', 'building_manager');

-- Assign permissions to SECURITY role (building-scoped)
INSERT INTO role_permissions (role, permission_id)
SELECT 'security', id FROM permissions WHERE key IN (
  'access_cards:read',
  'residents:read'
);

-- Assign permissions to HOUSEKEEPING role (building-scoped)
INSERT INTO role_permissions (role, permission_id)
SELECT 'housekeeping', id FROM permissions WHERE key IN (
  'incidents:read',
  'incidents:update_status'
);

-- Assign permissions to ACCOUNTANT role (global or building-scoped)
INSERT INTO role_permissions (role, permission_id)
SELECT 'accountant', id FROM permissions WHERE key IN (
  'invoices:manage',
  'invoices:read',
  'reports:financial',
  'unmatched_payments:manage',
  'unmatched_payments:read',
  'payments:reconcile',
  'contracts:read'
);

-- Assign permissions to BUILDING_MANAGER role (building-scoped)
INSERT INTO role_permissions (role, permission_id)
SELECT 'building_manager', id FROM permissions WHERE key IN (
  'users:manage',
  'users:read',
  'buildings:manage',
  'buildings:read',
  'apartments:manage',
  'apartments:read',
  'invoices:manage',
  'invoices:read',
  'incidents:manage',
  'incidents:read',
  'access_cards:manage',
  'access_cards:read',
  'reports:financial',
  'residents:read',
  'contracts:manage',
  'contracts:read',
  'notifications:broadcast'
);

-- Verify inserted permissions
SELECT 
  rp.role,
  p.key as permission,
  p.description
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role IN ('security', 'housekeeping', 'accountant', 'building_manager')
ORDER BY rp.role, p.key;
