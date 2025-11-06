# Design System

**Last Updated**: 2025-11-06
**Source**: Spec 002-make-a-call (FR-029 through FR-032b)

This document captures the visual design system and branding decisions for promptalicious.

---

## Branding

### Logo
- **Mark**: 😋 (face savouring food emoji, Unicode U+1F60B)
- **Rationale**: Simple, playful branding that complements the "promptalicious" name
- **Implementation**: Used as favicon and in navbar alongside wordmark
- **Cross-platform**: Universally supported emoji across operating systems

### Application Name
- **Primary**: promptalicious (lowercase, single word)
- **Typography**: Used in navbar with cyan primary colour

---

## Colour Palette

### Theme Philosophy
**Style**: Retrofuturistic cyberpunk
**Approach**: Dark mode only (no light theme)
**Standards**: WCAG AA compliant (4.5:1 minimum for normal text)

### Core Principles (Research-Based)
1. **Avoid pure black** - Use Material Design's #121212 approach
2. **Desaturated neons** - Prevent eye strain from bright colours on dark backgrounds
3. **Layered elevation** - Progressively lighter surfaces create depth
4. **High contrast text** - Exceed AAA standards where possible

### Colour Variables (OKLCH Format)

#### Base Colours
```css
--background: oklch(0.18 0.015 250);     /* Deep space black with subtle blue tint */
--foreground: oklch(0.93 0.005 250);     /* Soft grey-white (>12:1 contrast) */
```

#### Surface Elevation
```css
--card: oklch(0.25 0.02 250);            /* Elevated surface (25% lightness) */
--popover: oklch(0.28 0.02 250);         /* Higher elevation (28% lightness) */
--secondary: oklch(0.30 0.02 250);       /* Subtle surface variation */
--muted: oklch(0.30 0.02 250);           /* For less prominent elements */
```

#### Accent Colours
```css
--primary: oklch(0.72 0.09 200);         /* Desaturated cyan (4.8:1 contrast) */
--accent: oklch(0.75 0.11 330);          /* Desaturated magenta (5.1:1 contrast) */
--destructive: oklch(0.65 0.22 25);      /* Warm red for errors */
```

#### Interactive Elements
```css
--border: oklch(0.35 0.02 250);          /* Visible component boundaries */
--input: oklch(0.40 0.02 250);           /* Slightly lighter for interactivity */
--ring: oklch(0.72 0.09 200);            /* Cyan focus indicator */
```

#### Text Hierarchy
```css
--card-foreground: oklch(0.93 0.005 250);     /* High contrast (>10:1) */
--muted-foreground: oklch(0.65 0.01 250);     /* Secondary text (4.6:1) */
```

### Colour Theory Applied

**Hue Palette**:
- **200° (Cyan)**: Cool, technological, futuristic
- **250° (Deep Blue)**: Unifying base tone across all neutrals
- **330° (Magenta)**: Warm accent, creates depth with cyan

**Saturation Strategy**:
- Neutrals: 0.01-0.02 (very low saturation)
- Accents: 0.09-0.11 (desaturated to avoid vibration)
- Destructive: 0.22 (higher saturation for visibility)

**Lightness Layers**:
1. Background: 18% - Foundation
2. Cards: 25% - Primary elevation (+39%)
3. Popovers: 28% - Secondary elevation (+56%)
4. Borders: 35% - Boundaries
5. Text: 93% - Maximum legibility

### WCAG Compliance

All colour combinations meet or exceed WCAG AA standards:

| Combination | Contrast Ratio | Standard Met |
|-------------|---------------|--------------|
| Background → Foreground | >12:1 | AAA (7:1) |
| Card → Card Foreground | >10:1 | AAA |
| Primary (cyan) → Background | 4.8:1 | AA Normal Text (4.5:1) |
| Accent (magenta) → Background | 5.1:1 | AA Normal Text |
| Muted Foreground → Background | 4.6:1 | AA Normal Text |

---

## Typography

### Font Stack
- **System**: Uses browser defaults (system font stack)
- **Fallback**: Standard web-safe fonts via Tailwind CSS defaults

### Scale
- **Navbar Title**: 2xl (1.5rem/24px) - Bold weight
- **Page Headings**: 3xl (1.875rem/30px) - Bold weight
- **Card Titles**: Default heading sizes from shadcn/ui
- **Body Text**: Base (1rem/16px) - Normal weight

---

## Component Patterns

### Elevation System
Following Material Design principles for dark mode:

- **Level 0**: Background (18% lightness)
- **Level 1**: Cards, sidebar (25% lightness)
- **Level 2**: Popovers, menus (28% lightness)
- **Level 3**: Modals (if needed in future) (32% lightness)

### Border Strategy
- **Weight**: 1px default
- **Colour**: `--border` (35% lightness) for clear separation
- **Opacity**: Semi-transparent for layering effects

### Interactive States
- **Hover**: Reduce opacity to 80% or transition to foreground colour
- **Focus**: Cyan ring (`--ring`) with 2px offset
- **Active**: Slightly darker/lighter variant of base colour

---

## Design Principles

### Simplicity Over Sophistication (FR-031)
- Prioritise clarity and usability
- No complex animations or transitions
- Straightforward layouts and component patterns
- Quick wins over pixel-perfect design

### Visibility Above All (Constitution)
- All actions observable
- No hidden state
- Clear error messages
- Diagnostic data always accessible

### Logical Flow (FR-032)
Standard user journey: Input → Execution → Results → Diagnostics

---

## Implementation Notes

### CSS Variable Pattern
- Colours defined in `:root` (not `.dark` class)
- Uses OKLCH colour space for perceptual uniformity
- Tailwind CSS utility classes map to CSS variables
- Single theme only (no light mode toggle needed)

### Retrofuturistic Aesthetic
Achieved through:
- Deep blue-tinted blacks (not pure black)
- Cyan/magenta accent combination
- Desaturated neon colours
- High-contrast text on dark backgrounds
- Layered surface elevation

### Cross-Platform Emoji Support
- 😋 emoji widely supported (Unicode 6.0, 2010)
- Fallback: Browser/OS renders native emoji font
- No custom icon fonts needed

---

## Future Considerations

**Deferred to Future Specs**:
- Light mode theme (if ever needed)
- Additional accent colour options
- Custom icon system (currently using Lucide React)
- Responsive design patterns (mobile-first approach)
- Animation/transition guidelines

**Current Scope**:
- Dark mode only
- Desktop-first (tool for developers)
- Minimal styling complexity
- Focus on functionality over aesthetics

---

**Design System Status**: Established for spec 002-make-a-call ✅
**Next Review**: After user feedback on visual clarity and readability
