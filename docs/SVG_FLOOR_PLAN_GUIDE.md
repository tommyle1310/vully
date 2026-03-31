# SVG Floor Plan Guide

This guide explains how to create SVG floor plans that work with the Vully apartment management system.

## Overview

The system uses SVG (Scalable Vector Graphics) files to display interactive floor plans. Each apartment unit in the SVG must have a special attribute that links it to apartment data in the database.

## Requirements

### File Format
- **Format**: SVG (Scalable Vector Graphics)
- **File Extension**: `.svg`
- **Max Size**: 2MB
- **MIME Type**: `image/svg+xml`

### Apartment Linking

Each apartment element in your SVG must have one of these attributes:
- `data-apartment-id="apt-101"` (recommended)
- `id="apt-101"` (alternative)

The value should match the `svgElementId` field in your apartment records.

## Sample SVG Template

```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Floor 1 -->
  <g id="floor-1">
    <!-- Apartment 101 -->
    <rect 
      data-apartment-id="apt-101" 
      x="50" 
      y="50" 
      width="150" 
      height="100" 
      fill="#e0e0e0" 
      stroke="#333" 
      stroke-width="2"
    />
    <text x="125" y="105" text-anchor="middle" font-size="14" fill="#333">101</text>

    <!-- Apartment 102 -->
    <rect 
      data-apartment-id="apt-102" 
      x="220" 
      y="50" 
      width="150" 
      height="100" 
      fill="#e0e0e0" 
      stroke="#333" 
      stroke-width="2"
    />
    <text x="295" y="105" text-anchor="middle" font-size="14" fill="#333">102</text>

    <!-- Apartment 103 -->
    <rect 
      data-apartment-id="apt-103" 
      x="390" 
      y="50" 
      width="150" 
      height="100" 
      fill="#e0e0e0" 
      stroke="#333" 
      stroke-width="2"
    />
    <text x="465" y="105" text-anchor="middle" font-size="14" fill="#333">103</text>
  </g>

  <!-- Common Areas (no data-apartment-id) -->
  <g id="common-areas">
    <!-- Hallway -->
    <rect 
      x="50" 
      y="170" 
      width="490" 
      height="50" 
      fill="#f5f5f5" 
      stroke="#999" 
      stroke-width="1"
    />
    <text x="295" y="200" text-anchor="middle" font-size="12" fill="#666">Hallway</text>
  </g>
</svg>
```

## Best Practices

### 1. Consistent Naming
- Use a consistent prefix for apartment IDs (e.g., `apt-101`, `apt-102`)
- Match the format used in your database's `svgElementId` field

### 2. Shapes
- **Rectangles** (`<rect>`): Best for standard apartment units
- **Polygons** (`<polygon>`): For irregular shaped units
- **Paths** (`<path>`): For complex shapes

### 3. Styling
- Use neutral colors (gray) - the system will override colors based on apartment status
- Add clear borders (`stroke`) for visibility
- Include unit numbers as text labels

### 4. Organization
- Group elements by floor: `<g id="floor-1">`
- Separate common areas from apartment units
- Use layers for different building components

### 5. Accessibility
- Keep SVG size reasonable (< 2MB)
- Use viewBox for responsive scaling
- Avoid overly complex paths

## Status Colors

The system automatically applies these colors based on apartment status:

| Status | Color | Hex |
|--------|-------|-----|
| Vacant | Green | `#22c55e` |
| Occupied | Blue | `#3b82f6` |
| Maintenance | Yellow | `#eab308` |
| Reserved | Purple | `#a855f7` |

**Note**: Don't manually color apartment elements - the system handles this automatically.

## Creating Floor Plans

### Using Design Tools

**Inkscape (Free)**
1. Draw apartment shapes using Rectangle/Polygon tools
2. Select each apartment shape
3. Open XML Editor (Edit → XML Editor)
4. Add custom attribute: `data-apartment-id="apt-101"`
5. Save as "Plain SVG"

**Adobe Illustrator**
1. Create shapes for apartments
2. Select shape
3. Window → Attributes
4. Add custom data attribute in the panel
5. Export as SVG with "Presentation Attributes" style

**Figma**
1. Design floor plan with shapes
2. Export as SVG
3. Open in text editor
4. Manually add `data-apartment-id` attributes to relevant elements

## Updating Apartment Records

After uploading your SVG, update each apartment record with the corresponding `svgElementId`:

```typescript
// Example: Update apartment with SVG element ID
await prisma.apartment.update({
  where: { id: 'apartment-uuid' },
  data: { svgElementId: 'apt-101' }
});
```

Or via the admin UI:
1. Go to Apartments page
2. Edit apartment
3. Set "SVG Element ID" to match your SVG attribute (e.g., `apt-101`)

## Troubleshooting

### Apartment not interactive?
- Check that `data-apartment-id` attribute exists on the SVG element
- Verify the ID matches the `svgElementId` in the apartment record
- Ensure the element is not inside a nested group

### Wrong colors showing?
- The system overrides fill colors based on status
- Don't use inline styles - use attributes instead
- Check if apartment status is set correctly in database

### SVG not displaying?
- Verify file is valid SVG (open in browser)
- Check file size is under 2MB
- Ensure `xmlns="http://www.w3.org/2000/svg"` attribute exists

### Zoom/pan not working?
- Make sure you're not clicking on text or non-interactive elements
- Try using mouse wheel for zoom
- On mobile, use two-finger pinch for zoom

## Example Data Flow

1. **Create SVG** with `data-apartment-id` attributes
2. **Upload SVG** via Building detail page
3. **Update apartments** with matching `svgElementId` values
4. **Interactive map** automatically links SVG elements to apartment data
5. **Users click** apartments to see details, filtered by status

## Support

For issues or questions:
- Check the browser console for errors
- Verify SVG structure with a text editor
- Ensure apartment records have correct `svgElementId` values
