# Design System

**Last Updated:** 2026-06-21

---

## Color System

> **IMPORTANT (2026-06-16, PR #186):** CTRL is **globally forced dark**. `index.html` ships `class="dark"` on the root element. There is NO light mode. The old light-mode palette below has been removed; it is no longer the design system. The current system is the `ctrl-ds` instrument palette.

### ctrl-ds Instrument Palette (current, globally forced dark)

```css
/* Accent / Primary: emerald */
--primary: 171 100% 43%;          /* #00D9B6 - Emerald */
--primary-foreground: 171 100% 10%; /* Deep emerald text */

/* Surface */
--background: 220 20% 6%;         /* Deep dark instrument surface */
--foreground: 210 20% 95%;        /* Near-white text */
--card: 220 16% 10%;              /* Slightly raised card surface */
--card-foreground: 210 20% 95%;
--border: 220 16% 18%;            /* Subtle instrument border */
--muted: 220 16% 14%;             /* Muted surface */
--muted-foreground: 220 10% 55%; /* Mid-tone text */

/* Interactive */
--ring: 171 100% 43%;             /* Emerald focus ring */
```

### Token Reference
```
Emerald primary:  #00D9B6  (HSL: 171 100% 43%)  - Accent, CTAs, active states
Dark surface:     ~#0d1117  - Page background (globally forced dark)
Card surface:     ~#141921  - Elevated card backgrounds
Border:           ~#1e2730  - Subtle borders
```

### Honest Residual (not yet purged as of 2026-06-21)
- `index.html` OG / `theme-color` meta tags still carry residual green
- `--mint` token alias in `tokens.css` still exists
- `EdgeOnboarding` and `SampleResultsDialog` still carry residual green styling

### Semantic Mappings
```css
--background: dark instrument surface
--foreground: near-white
--muted: slightly raised dark surface
--muted-foreground: mid-tone muted text
--primary: emerald #00D9B6
--ring: emerald #00D9B6
```

### Shadows (Apple-like subtle)
```css
--shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.05);
--shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.1), 0 2px 4px -1px hsl(0 0% 0% / 0.06);
--shadow-lg: 0 10px 15px -3px hsl(0 0% 0% / 0.1), 0 4px 6px -2px hsl(0 0% 0% / 0.05);
--shadow-xl: 0 20px 25px -5px hsl(0 0% 0% / 0.1), 0 10px 10px -5px hsl(0 0% 0% / 0.04);
```

---

## Typography

### Font Families
```
Primary: System font stack (San Francisco on Mac, Segoe UI on Windows)
Display: 'Gobold' - Headlines, hero text
Brand: Grotesk ('Inter', 'Helvetica Neue', 'Arial') - Brand typography (Ctrl, MINDMAKER)
```

### Scale
```
Hero:     text-5xl to text-6xl (48-60px)
H1:       text-3xl → text-4xl → text-5xl → text-6xl (responsive)
H2:       text-2xl → text-3xl → text-4xl
H3:       text-xl → text-2xl
Body:     text-base (16px) → text-lg → text-xl
Small:    text-sm (14px)
Tiny:     text-xs (12px)
```

### Line Heights
```
Headlines: leading-[1.1] (tight, modern)
Body: leading-relaxed (1.625)
Small: leading-normal (1.5)
```

### Letter Spacing
```
Brand text: 0.06em
Headlines: tracking-tight (-0.02em)
Body: default
```

### Usage Rules
- **Gobold:** Hero headlines only, sparingly
- **Inter:** All other text
- **Grotesk:** Brand typography (Ctrl, MINDMAKER) - use `.brand-typography-ctrl` utility
- **Line Height:** 1.6 for body, 1.2 for headlines

### Brand Typography Pattern

**Ctrl Text Styling:**
```tsx
<span className="brand-typography-ctrl">
  CTRL
</span>
```

**Specifications:**
- Font: Grotesk (Inter, Helvetica Neue, Arial)
- Size: 1.35rem (mobile), 1.575rem (sm), 1.8rem (md) - 20% larger than base
- Case: Uppercase
- Letter Spacing: 0.05em
- Line Height: 1

**Never hardcode brand typography** - always use `.brand-typography-ctrl` utility class.

---

## Spacing System

### Scale (Tailwind)
```
0.5  = 2px   (xs gaps)
1    = 4px   (tight spacing)
2    = 8px   (compact)
3    = 12px  (default gap)
4    = 16px  (comfortable)
6    = 24px  (section spacing)
8    = 32px  (large gaps)
12   = 48px  (section padding)
16   = 64px  (major sections)
20   = 80px  (hero padding)
```

### Padding Scale (Apple-like generous)
```
Cards: p-8 sm:p-12 md:p-16 lg:p-20 (generous, Apple-like)
Buttons: px-10 sm:px-12 (horizontal), h-14 sm:h-16 (vertical)
Sections: py-6 sm:py-8 md:py-12
Gaps: gap-4 sm:gap-6 lg:gap-8
```

### Border Radius
```
Cards: rounded-3xl (24px)
Buttons: rounded-2xl (16px)
Small elements: rounded-xl (12px)
```

### Utility Classes
```
section-padding:    py-12 md:py-20 (sections)
container-width:    max-w-7xl mx-auto px-4
touch-target:       min-h-[44px] (mobile buttons)
```

---

## Component Patterns

### Buttons

**Primary Button (Emerald)**
```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90 
                   border-0 rounded-2xl px-10 sm:px-12 h-14 sm:h-16
                   shadow-md hover:shadow-lg text-lg sm:text-xl font-semibold">
```

**Secondary Button (dark surface)**
```tsx
<Button className="bg-muted text-foreground hover:bg-muted/80 shadow-lg
                   hover:scale-105 transition-all rounded-2xl">
```

**Outline Button**
```tsx
<Button variant="outline" className="border-border/60 rounded-2xl
                                     hover:bg-muted/50 hover:border-border/80">
```

**Hero Button (Large CTA)**
```tsx
<Button className="bg-primary text-primary-foreground border-0 rounded-2xl
                   px-10 sm:px-12 h-14 sm:h-16 shadow-md hover:shadow-lg
                   text-lg sm:text-xl font-semibold">
```

**Critical:** All buttons must have `border-0` explicitly set (no default borders).

### Cards

**Base Card Style**
```css
background: dark ctrl-ds card surface (--card, NOT white)
border: 1px solid border/40 (subtle dark border)
border-radius: 24px (rounded-3xl)
shadow: subtle on-dark elevation (border + soft shadow)
padding: p-8 minimum (generous)
```

**Elevated Card** (featured content)
```tsx
<div className="bg-card border border-border/40 rounded-3xl shadow-lg p-6">
  {/* dark instrument surface, NOT white */}
</div>
```

**Minimal Card** (standard content)
```tsx
<div className="bg-card/80 border border-border/30 rounded-2xl p-4">
  {/* dark surface */}
</div>
```

**Glass Card** (Hero)
```css
background: white/95
backdrop-filter: blur(12px)
border: 1px solid white/30
shadow: 2xl
```

**Hover States:**
- Subtle background change: `hover:bg-muted/30`
- Shadow elevation: `hover:shadow-md`
- Transition: `transition-all duration-200`

### Modals/Dialogs
```tsx
<Dialog>
  <DialogContent className="sm:max-w-[520px]">
    // White bg, rounded-lg, shadow
  </DialogContent>
</Dialog>
```

---

## Animation System

### Keyframes
```css
fade-in-up: opacity 0→1, translateY 20px→0 (0.6s)
pulse: scale 1→1.05→1 (2s infinite)
```

### Motion Transitions
```typescript
fast: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
normal: { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
slow: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
spring: { type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }
```

### Motion Variants
- `fadeIn`: Opacity 0 → 1
- `slideUp`: Y: 24px → 0, opacity 0 → 1
- `scaleIn`: Scale: 0.96 → 1, opacity 0 → 1
- `pageTransition`: Full page transitions
- `cardEntrance`: Card-specific entrance

### Usage
```tsx
import { fadeInProps, slideUpProps } from '@/lib/motion';

<motion.div {...fadeInProps}>
  {/* Content */}
</motion.div>
```

### Animation Principles

1. **Smooth, Not Bouncy**
   - Damping: 35
   - Stiffness: 400
   - Mass: 0.8

2. **Fast, Not Slow**
   - Most animations: 200-350ms
   - Page transitions: 400ms
   - No animations over 500ms

3. **Subtle, Not Dramatic**
   - Small movements (24px max)
   - Gentle opacity changes
   - No scale > 1.05

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}
```

---

## Responsive Breakpoints

```
sm:  640px  (mobile landscape)
md:  768px  (tablet)
lg:  1024px (desktop)
xl:  1280px (large desktop)
2xl: 1536px (extra large)
```

### Mobile-First Approach
Base styles = mobile, use `md:`, `lg:` for larger screens

---

## Layout Patterns

### Hero Section
```tsx
<section className="h-[var(--mobile-vh)] flex items-center bg-ink text-white">
  <div className="container-width">
    <h1 className="text-5xl md:text-6xl font-bold">
```

### Content Section
```tsx
<section className="section-padding bg-background">
  <div className="container-width">
    <h2 className="text-3xl md:text-4xl font-bold mb-8">
```

### Grid Layouts
```tsx
<div className="grid md:grid-cols-3 gap-6">
  // Mobile: 1 col, Tablet+: 3 cols
</div>
```

### Video Background Pattern

**Standard Pattern:**
```tsx
<div className="relative min-h-[100dvh] flex flex-col">
  {/* Video at base layer, full opacity */}
  <video
    className="fixed inset-0 w-full h-full object-cover opacity-100 -z-20 pointer-events-none"
    autoPlay
    loop
    muted
    playsInline
    preload="metadata"
  >
    <source src="/video.mp4" type="video/mp4" />
  </video>
  
  {/* Semi-transparent black overlay - 50% opacity */}
  <div className="fixed inset-0 bg-black/50 -z-10 pointer-events-none" />
  
  {/* Content */}
  <main className="relative z-10">...</main>
</div>
```

**Subtle Video Background (Landing Page):**
```css
Opacity: 0.12 (12%)
Filter: grayscale(0.4) brightness(0.95) contrast(0.9)
Position: Fixed, full viewport
Z-index: -z-20
Overlay: bg-gradient-to-b from-black/5 via-transparent to-black/10
Additional: Subtle radial gradient with mint at 3% opacity
```

**Critical Rules:**
1. **Never use `bg-background` on root App component** - `App.tsx` root div must NOT have `bg-background` as it creates solid black layer blocking video
2. **Never use `bg-background` on parent container** - Component parent containers with video backgrounds must not have `bg-background`
3. **Video must be at `opacity-100`** - transparency controlled by overlay, not video element
4. **Z-index layering:**
   - Video: `-z-20` (base layer)
   - Overlay: `-z-10` (above video, below content)
   - Content: `z-10` or higher (top layer)
5. **Overlay opacity:** Use `bg-black/50` for 50% black overlay
6. **Root container pattern:** App.tsx should use `<div className="min-h-screen">` (no bg-background) to allow child components to control backgrounds

**Mobile-only video:**
```tsx
<video className="fixed inset-0 w-full h-full object-cover opacity-100 md:hidden -z-20 pointer-events-none" />
<div className="fixed inset-0 bg-black/50 md:hidden -z-10 pointer-events-none" />
```

### Decorative Underline Pattern

**When using SVG decorative underlines, never use CSS `underline` class:**
```tsx
{/* ❌ WRONG - Creates double underline */}
<span className="relative inline-block">
  <span className="underline">AI-era future</span>
  <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary">...</svg>
</span>

{/* ✅ CORRECT - Only SVG decorative underline */}
<span className="relative inline-block">
  <span>AI-era future</span>
  <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary">...</svg>
</span>
```

**Rule:** If using SVG decorative underlines, remove `underline` class to prevent double underlines.

---

## Icon System

**Library:** Lucide React  
**Size:** `h-5 w-5` standard, `h-6 w-6` large  
**Color:** Inherit from parent

```tsx
import { ArrowRight, CheckCircle } from "lucide-react"
<CheckCircle className="h-5 w-5 text-mint" />
```

---

## Form Elements

### Input Fields
```tsx
<Input 
  className="border-input bg-background"
  placeholder="Your email"
/>
```

### Labels
```tsx
<Label className="text-sm font-semibold">
```

### Radio Groups
```tsx
<RadioGroup>
  <RadioGroupItem value="option" />
</RadioGroup>
```

---

## Accessibility

### Focus States
```css
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

### ARIA Labels
```tsx
<button aria-label="Close dialog">
```

### Semantic HTML
Use `<main>`, `<section>`, `<nav>`, `<article>` appropriately

---

## Z-Index System

**Standard Layering (from bottom to top):**
```
-z-20: Video backgrounds (base layer)
-z-10: Overlays (semi-transparent backgrounds)
z-0:   Base content
z-10:  Main content
z-20:  Headers, navigation
z-50:  Modals, dropdowns, tooltips
```

**Rules:**
- Never use arbitrary z-index values (e.g., `z-[999]`)
- Follow the documented system above
- Video backgrounds always use `-z-20`
- Overlays always use `-z-10`
- Content starts at `z-0` or `z-10`

---

## Mobile Viewport System

### Overview

The mobile viewport system solves the 3-5% overflow issue where `100dvh` doesn't account for dynamic browser chrome (address bars, safe area insets). It provides accurate viewport height calculations that update on resize and orientation changes.

### Core Utility

**File:** `src/utils/mobileViewport.ts`

The utility calculates actual viewport height using:
1. `window.visualViewport` API (most accurate, accounts for keyboard/chrome)
2. Fallback to `window.innerHeight` (excludes chrome when hidden)

It sets a CSS custom property `--mobile-vh` that updates automatically on:
- Window resize
- Orientation change
- Visual viewport changes (keyboard, browser chrome)

### CSS Utilities

**Location:** `src/index.css`

```css
.mobile-vh {
  height: var(--mobile-vh, 100dvh);
}

.mobile-min-vh {
  min-height: var(--mobile-vh, 100dvh);
}

.mobile-max-vh {
  max-height: var(--mobile-vh, 100dvh);
}
```

### No-Scroll Pattern

**Structure:**
```tsx
<div className="h-[var(--mobile-vh)] overflow-hidden flex flex-col">
  {/* Fixed header */}
  <div className="flex-shrink-0">
    {/* Header content */}
  </div>
  
  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto">
    {/* Main content */}
  </div>
</div>
```

**Critical:** Every mobile page must use this pattern.

### Usage Patterns

#### ✅ CORRECT: Using Mobile Viewport Height

```tsx
// Full-height container (no scroll)
<div className="h-[var(--mobile-vh)] overflow-hidden flex flex-col">
  <header className="flex-shrink-0">Header</header>
  <main className="flex-1 overflow-y-auto">Scrollable content</main>
</div>

// Or use utility class
<div className="mobile-vh overflow-hidden">
  {/* Content */}
</div>
```

#### ✅ CORRECT: Scrollable Content Area

```tsx
<div className="h-[var(--mobile-vh)] overflow-hidden flex flex-col">
  <div className="flex-1 overflow-y-auto">
    {/* Scrollable content */}
  </div>
</div>
```

#### ✅ CORRECT: Safe Area Insets

```tsx
// Account for notches and home indicators
<div className="pt-safe-top pb-safe-bottom">
  {/* Content */}
</div>

// Or inline style for fixed positioning
<div style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
  {/* Fixed element */}
</div>
```

#### ❌ WRONG: Using 100dvh Directly

```tsx
// DON'T: Doesn't account for browser chrome
<div className="min-h-[100dvh]">
  {/* Content */}
</div>

// DON'T: Fixed height without viewport utility
<div className="h-screen">
  {/* Content */}
</div>
```

#### ❌ WRONG: Excessive Padding

```tsx
// DON'T: Large bottom padding causes overflow
<div className="pb-32">
  {/* Content */}
</div>

// DO: Use safe area utilities
<div className="pb-safe-bottom">
  {/* Content */}
</div>
```

### Safe Areas

**Bottom Safe Area:**
```css
.pb-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

**Usage:**
- Bottom navigation
- Scrollable content areas
- Floating buttons

### MobileLayout Component

**File:** `src/components/mobile/MobileLayout.tsx`

Wrapper component for consistent no-scroll behavior:

```tsx
import { MobileLayout } from '@/components/mobile/MobileLayout';

<MobileLayout>
  <YourContent />
</MobileLayout>
```

Automatically:
- Initializes viewport utility
- Sets `h-[var(--mobile-vh)]`
- Prevents overflow with `overflow-hidden`
- Provides flex container structure

### Initialization

The viewport utility is automatically initialized in `App.tsx`:

```tsx
useEffect(() => {
  const cleanup = initMobileViewport();
  return cleanup;
}, []);
```

**Note:** It's safe to call `initMobileViewport()` multiple times (idempotent).

### Anti-Patterns to Avoid

1. **❌ Using `100vh` or `100dvh` directly on mobile components**
   - ✅ Use `h-[var(--mobile-vh)]` or `.mobile-vh` utility

2. **❌ Large fixed bottom padding (`pb-32`, `pb-24`)**
   - ✅ Use `pb-safe-bottom` for safe area accounting

3. **❌ `min-h-screen` without overflow control**
   - ✅ Use `h-[var(--mobile-vh)] overflow-hidden` for no-scroll containers

4. **❌ Fixed positioning without safe area insets**
   - ✅ Use `env(safe-area-inset-bottom)` for bottom positioning

5. **❌ Content that exceeds viewport without internal scroll**
   - ✅ Use flex layout with `flex-1 overflow-y-auto` for scrollable areas

### Testing Checklist

When creating mobile components:

- [ ] Uses `h-[var(--mobile-vh)]` or `.mobile-vh` instead of `100dvh`
- [ ] Accounts for safe area insets with `pt-safe-top` / `pb-safe-bottom`
- [ ] No excessive padding that causes overflow
- [ ] Scrollable content uses `overflow-y-auto` on inner container
- [ ] Fixed elements use safe area insets in positioning
- [ ] Tested on iPhone SE (667px), iPhone 12 (844px), Android devices
- [ ] Verified no vertical scroll on any device

### Browser Chrome Behavior

**iOS Safari:**
- Address bar: ~44px when visible, 0px when hidden
- Safe area insets: Top (notch), Bottom (home indicator)

**Chrome Android:**
- Address bar: ~56px when visible, 0px when hidden
- Safe area insets: Varies by device

**Solution:** The viewport utility accounts for these dynamically.

---

## Root Container Rules

### App.tsx Root Container

**Critical Rule:** The root App component (`src/App.tsx`) must NOT have `bg-background`.

**❌ WRONG:**
```tsx
// App.tsx
<div className="min-h-screen bg-background">
```

**✅ CORRECT:**
```tsx
// App.tsx
<div className="min-h-screen">
  {/* No bg-background - allows child components to control backgrounds */}
```

**Why:** 
- `bg-background` creates solid black layer (`rgb(10, 10, 10)`)
- This blocks video backgrounds in child components
- Backgrounds should be set at component level, not root

**Enforcement:**
- ESLint rule prevents `bg-background` on App.tsx
- Build validation script checks for this
- Component tests verify video visibility

---

## Design Tokens Location

**File:** `src/index.css`  
**Config:** `tailwind.config.ts`

All colors, spacing, typography defined as CSS variables and Tailwind extensions.

**Never hardcode colors** - always use tokens:
- ✅ `bg-mint`, `text-ink`, `border-muted`
- ❌ `bg-[#7ef4c2]`, `text-[#0e1a2b]`

**Never hardcode brand typography** - always use utilities:
- ✅ `.brand-typography-ctrl`
- ❌ Inline styles or hardcoded font sizes

**Never use bg-background on root App component:**
- ✅ Component-level backgrounds
- ❌ `bg-background` on App.tsx root

---

**End of DESIGN_SYSTEM**
