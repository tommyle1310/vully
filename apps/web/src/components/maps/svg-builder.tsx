/**
 * SVG Floor Plan Builder
 *
 * This file re-exports the refactored modular SvgBuilder component.
 * The component has been split into separate modules for better maintainability:
 *
 * - svg-builder/svg-builder.types.ts    - TypeScript types & interfaces
 * - svg-builder/svg-builder.constants.ts - Templates, configs, scale factor
 * - svg-builder/svg-builder.geometry.ts  - Overlap detection, polygon math
 * - svg-builder/svg-parser.ts           - SVG import/export utilities
 * - svg-builder/sub-rect.utils.ts       - Complex shape editing
 * - svg-builder/hooks/                  - Custom React hooks
 * - svg-builder/components/             - UI sub-components
 * - svg-builder/index.tsx               - Main component
 *
 * Scale Factor: 10 builder units = 1 meter (1 unit = 0.1m = 10cm)
 */

export { SvgBuilder, default } from './svg-builder/index';
export type { SvgBuilderProps, SvgElement, RectArea } from './svg-builder/svg-builder.types';
