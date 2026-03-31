# SVG Floor Plan Builder - User Guide

## Overview

The **SVG Floor Plan Builder** is an integrated visual editor that allows you to create interactive floor plans directly in the Vully platform, eliminating the need for external design tools like Inkscape or Adobe Illustrator.

## Quick Start

1. **Navigate to a Building**
   - Go to Buildings page (`/buildings`)
   - Click on any building to open the detail page

2. **Open the Builder**
   - Click the "Manage Floor Plan" or "Add Floor Plan" button
   - Select **"Build Floor Plan"** from the dropdown

3. **Create Your Floor Plan**
   - Drag apartment templates onto the canvas
   - Position and resize as needed
   - Set apartment IDs and labels
   - Save directly to the building

## Features

### 🎨 Apartment Templates

Pre-designed apartment shapes optimized for common layouts:

| Template | Size | Best For |
|----------|------|----------|
| **Studio** | 100×80px | Small units, studios |
| **1 Bedroom** | 140×100px | Standard 1BR apartments |
| **2 Bedroom** | 180×120px | Medium 2BR units |
| **3 Bedroom** | 200×140px | Large 3BR units |

**How to use:**
1. Go to **Templates** tab in the right sidebar
2. Click any template to add it to the canvas (appears at center)
3. Drag to reposition

### 🛠️ Drawing Tools

Create custom shapes and labels:

- **Select Tool** (default) - Click and drag elements
- **Rectangle Tool** - Click canvas to add custom rectangles
- **Text Tool** - Click canvas to add labels

**Shortcuts:**
- Click a tool to activate it
- After drawing, tool automatically returns to Select mode

### 📐 Canvas Controls

**Top Toolbar:**
- **Undo/Redo** - Navigate through edit history
- **Zoom Controls** - Adjust view (50% - 200%)
- **Grid Toggle** - Show/hide alignment grid
- **Download** - Export SVG file to your computer
- **Save** - Upload floor plan to the building

**Grid & Snapping:**
- Grid size: 10px × 10px
- **Snap to Grid**: ON by default (toggle in Tools tab)
- Helps align apartments perfectly

### ✨ Element Properties

When you select an element, edit its properties in the **Properties** tab:

#### For Apartments (Rectangles):
- **Apartment ID** - Links to database (e.g., `apt-101`)
  - This must match the `svgElementId` field in your apartment records
  - Format: `apt-{unitNumber}` recommended
- **Label** - Display number (e.g., `101`)
- **Position** - X, Y coordinates
- **Size** - Width, Height in pixels
- **Colors** - Fill and stroke colors
  
#### For Text:
- **Text Content** - What displays on the canvas
- **Position** - X, Y coordinates  
- **Color** - Text fill color

**Note:** Apartment fill colors will be overridden by the system based on status (vacant, occupied, etc.) when displayed on the floor plan.

### 🎯 Element Actions

**Tools Tab:**
- **Duplicate** - Copy selected element (creates duplicate +20px offset)
- **Delete** - Remove selected element
- **Snap to Grid** - Toggle ON/OFF

**Mouse Actions:**
- **Click** - Select element
- **Drag** - Move element
- **Click background** - Deselect all

## Workflow Example

### Creating a 6-Unit Floor Plan

1. **Setup**
   - Open builder (`/buildings/{id}` → "Build Floor Plan")
   - Ensure Grid and Snap to Grid are ON

2. **Add Apartments**
   - Click "2 Bedroom" template (6 times)
   - Arrange in 2 rows of 3 units
   - Use grid for perfect alignment

3. **Set IDs and Labels**
   - Select first apartment
   - Properties tab → Set:
     - Apartment ID: `apt-101`
     - Label: `101`
   - Repeat for all 6 units (101-106)

4. **Add Common Elements**
   - Use Rectangle tool for hallways
   - Use Text tool for labels ("Hallway", "Elevator")
   - Set neutral colors (gray)

5. **Save**
   - Click **Download** to get SVG file (backup)
   - Click **Save** to upload to building
   - Floor plan is now live!

## Linking to Database

After creating the floor plan, link SVG elements to apartment records:

### Option 1: Bulk Update Script (Recommended)

```bash
cd apps/api
npx tsx ../scripts/update-svg-ids.ts <building-id> "apt-{unitNumber}"
```

### Option 2: Manual Update (SQL)

```sql
UPDATE apartments
SET svg_element_id = 'apt-' || unit_number
WHERE building_id = 'YOUR_BUILDING_ID';
```

### Option 3: Admin UI (Individual)

1. Go to Apartments page
2. Edit each apartment
3. Set "SVG Element ID" to match (e.g., `apt-101`)

## Best Practices

### 📏 Layout Tips
- **Consistent spacing**: Use 10-20px gaps between apartments
- **Align rows/columns**: Snap to grid keeps everything aligned
- **Logical numbering**: Use floor prefix (101-106 for floor 1, 201-206 for floor 2)
- **Leave space**: Hallways should be clearly defined

### 🎨 Design Tips
- **Neutral base colors**: Use gray (#e0e0e0) - system will override based on status
- **Clear labels**: Use large, bold unit numbers (system renders at 16px)
- **Stroke width**: 2px recommended for clean borders
- **Text placement**: Labels should be centered within apartments

### 🔗 ID Conventions
- **Format**: Use `apt-{unitNumber}` consistently
- **Match database**: Ensure IDs match `svgElementId` field exactly
- **Unique IDs**: Each apartment must have a unique ID
- **No spaces**: Use hyphens or underscores only

### 💾 Saving Workflow
1. **Download** periodically as backup
2. **Save** to building when complete
3. **Update database** apartment records with SVG IDs
4. **Test** by viewing building page and clicking apartments

## Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Undo | *Click button* | Revert last change |
| Redo | *Click button* | Reapply undone change |
| Delete | *Delete button* | Remove selected element |
| Deselect | *Click background* | Clear selection |

## Advanced Features

### Multi-Floor Buildings

**Approach 1: Separate SVGs**
- Create one SVG per floor
- Upload to different buildings or use naming convention

**Approach 2: Single SVG with Groups**
- Use layering to stack floors
- Label clearly (Floor 1, Floor 2, etc.)
- Adjust element positions to avoid overlap

### Complex Shapes

Currently limited to rectangles. For complex layouts:
1. Use multiple rectangles to approximate shape
2. Set same Apartment ID for all rectangles forming one unit
3. Or export SVG and edit in vector editor

### Importing Existing SVGs

The builder doesn't currently support importing SVG files for editing. Instead:
1. Click "Upload SVG File" from the dropdown
2. Or manually trace over uploaded SVG using builder

## Troubleshooting

### Issue: Elements won't snap
**Solution:** Toggle "Snap to Grid" ON in Tools tab

### Issue: Can't click elements
**Solution:** Ensure Select tool is active (not Rectangle or Text tool)

### Issue: Apartment not  interactive on floor plan
**Solution:** 
1. Check Apartment ID is set (`apt-101`, etc.)
2. Verify database record has matching `svgElementId`
3. Refresh building page after saving

### Issue: Colors are wrong
**Solution:** SVG builder colors are just for design. The live floor plan uses status-based colors automatically.

### Issue: Lost my work
**Solution:** Use Download button frequently to save local backups

### Issue: Zoom/Pan not working
**Solution:** Use zoom buttons in toolbar. Grid might appear static at certain zoom levels.

## Export Format

The builder generates clean, standards-compliant SVG:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <g id="apartments">
    <rect 
      data-apartment-id="apt-101" 
      x="50" y="50" width="180" height="120" 
      fill="#e0e0e0" stroke="#333333" stroke-width="2"
      rx="4"
    />
    <text x="140" y="110" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">101</text>
  </g>
</svg>
```

**Features:**
- Proper XML declaration
- Valid SVG structure
- `data-apartment-id` attributes for interactivity
- Rounded corners (`rx="4"`)
- Centered text labels

## Comparison with External Tools

| Feature | SVG Builder | Inkscape | Illustrator |
|---------|-------------|----------|-------------|
| **Setup** | None (built-in) | Download & install | Paid subscription |
| **Learning curve** | Minimal | Moderate | Steep |
| **Apartment templates** | ✅ Built-in | ❌ Manual | ❌ Manual |
| **Auto apartment IDs** | ✅ Yes | ❌ Manual | ❌ Manual |
| **Save to building** | ✅ One click | ❌ Export + upload | ❌ Export + upload |
| **Grid/snap** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Complex shapes** | ⚠️ Limited | ✅ Full power | ✅ Full power |
| **Collaboration** | ✅ Cloud-based | ❌ Local files | ⚠️ Requires CC | |

**Recommendation:** Use SVG Builder for standard layouts. For complex architectural drawings, use external tools and upload.

## Future Enhancements

Planned features (not yet implemented):
- [ ] Import existing SVG for editing
- [ ] Polygon tool for irregular shapes
- [ ] Auto-generate apartment IDs from unit numbers
- [ ] Template library (save/load custom templates)
- [ ] Multi-select and group operations
- [ ] Copy/paste between buildings
- [ ] Background image import (trace over architectural plans)
- [ ] 3D view generation

## Support & Feedback

For issues or feature requests:
- Check [SVG Floor Plan Guide](./SVG_FLOOR_PLAN_GUIDE.md) for general SVG help
- Review [Session B Summary](../SESSION_B_SUMMARY.md) for technical details
- Contact system administrator for database-related issues

---

**Last Updated:** March 31, 2026  
**Version:** 1.0.0  
**Component:** `apps/web/src/components/maps/svg-builder.tsx`
