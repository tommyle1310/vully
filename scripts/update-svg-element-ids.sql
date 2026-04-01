-- Update Apartment SVG Element IDs
-- Run this script after uploading an SVG floor plan to link apartments to SVG elements

-- Example: Link apartment unit numbers to SVG element IDs
-- Assumes SVG elements use pattern: apt-{unit_number}

-- For a specific building, update all apartments with SVG element IDs
UPDATE apartments
SET svg_element_id = 'apt-' || unit_number
WHERE building_id = 'YOUR_BUILDING_UUID_HERE'
  AND svg_element_id IS NULL;

-- Verify the updates
SELECT 
  unit_number,
  svg_element_id,
  status,
  floor
FROM apartments
WHERE building_id = 'YOUR_BUILDING_UUID_HERE'
ORDER BY floor, unit_number;

-- Alternative: Update specific apartments individually
-- UPDATE apartments SET svg_element_id = 'apt-101' WHERE unit_number = '101' AND building_id = 'YOUR_BUILDING_UUID_HERE';
-- UPDATE apartments SET svg_element_id = 'apt-102' WHERE unit_number = '102' AND building_id = 'YOUR_BUILDING_UUID_HERE';
-- UPDATE apartments SET svg_element_id = 'apt-103' WHERE unit_number = '103' AND building_id = 'YOUR_BUILDING_UUID_HERE';

-- Clear SVG element IDs (if you need to reset)
-- UPDATE apartments SET svg_element_id = NULL WHERE building_id = 'YOUR_BUILDING_UUID_HERE';
