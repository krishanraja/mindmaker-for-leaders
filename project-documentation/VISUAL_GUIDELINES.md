# Visual Guidelines

**Last Updated:** 2026-05-17

---

## Visual Principles

1. **Bold, Not Busy** - Strong elements, generous white space, one focal point per screen
2. **Functional, Not Decorative** - Every visual serves purpose, no gradients for decoration
3. **Professional, Not Corporate** - Clean but not sterile, executive-grade quality
4. **Modern, Not Trendy** - Timeless, not chasing fads, Apple-like refinement

---

## Layout System

### Grid Structure
```
Desktop: 12-column grid, 24px gutter
Tablet:  8-column grid, 16px gutter
Mobile:  4-column grid, 12px gutter
```

### Content Width
```
Max width: 1280px (7xl)
Hero card max width: max-w-2xl
Comfortable reading: 65-75 characters per line
Centered content: mx-auto
```

### Spacing Rhythm
```
Micro:    4px, 8px   (component internals)
Small:    12px, 16px (related elements)
Medium:   24px, 32px (section spacing)
Large:    48px, 64px (major sections)
XLarge:   80px+      (hero padding)
```

---

## Hero Sections

### Landing Page Hero Structure
```tsx
<section className="h-[var(--mobile-vh)] flex items-center">
  {/* Video background (subtle) */}
  {/* Centered white card */}
  <div className="container-width relative z-10">
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 sm:p-12 md:p-16 lg:p-20 rounded-3xl shadow-lg">
        <Logo />
        <h1>Large headline with <span>animated underline</span></h1>
        <p>Supporting copy</p>
        <CTAs />
        <TrustIndicators />
      </Card>
    </div>
  </div>
</section>
```

### Hero Card Specifications
- Max width: `max-w-2xl`
- Padding: `p-8 sm:p-12 md:p-16 lg:p-20`
- Background: White
- Border radius: `rounded-3xl`
- Shadow: `shadow-lg`

### Hero Elements
1. Logo: Top-left, minimal spacing
2. Headline: Large, bold, tight leading
3. Underline animation: SVG path, animated draw
4. Description: Large, readable, muted color
5. CTA Buttons: Primary + Secondary, large, rounded
6. Trust indicators: Small checkmarks, muted text

### Hero Animations
- Fade in on mount (staggered delays)
- Slide up for card
- SVG underline draw animation

### Visual Effects (Background)
- Particle/dot GIF background (20% opacity)
- Gradient overlays (dark to darker)
- Animated grid pattern
- Glowing orbs (mint, blurred, animated pulse)

---

## Video Background

### Specifications
```css
Opacity: 0.12 (12%)
Filter: grayscale(0.4) brightness(0.95) contrast(0.9)
Position: Fixed, full viewport
Z-index: -z-20
Overlay: bg-gradient-to-b from-black/5 via-transparent to-black/10
Additional: Subtle radial gradient with mint at 3% opacity
```

**Critical:** Video must be truly subtle - barely visible, not distracting.

### Implementation
```tsx
<video
  className="fixed inset-0 w-full h-full object-cover -z-20 pointer-events-none"
  style={{ opacity: 0.12, filter: 'grayscale(0.4) brightness(0.95) contrast(0.9)' }}
  autoPlay
  loop
  muted
  playsInline
  preload="metadata"
>
  <source src="/video.mp4" type="video/mp4" />
</video>

{/* Overlay */}
<div className="fixed inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10 -z-10 pointer-events-none" />
```

---

## Content Sections

### Standard Section
```tsx
<section className="section-padding bg-background">
  <div className="container-width">
    <h2 className="text-center mb-12">Section Title</h2>
    <Grid>{cards}</Grid>
  </div>
</section>
```

### Alternating Backgrounds
```
Section 1: bg-background (off-white)
Section 2: bg-muted (light grey)
Section 3: bg-background
Section 4: bg-ink (dark, with white text)
```

---

## Card Patterns

### Base Card Style
```css
background: white (--card)
border: 1px solid border/40 (subtle)
border-radius: 24px (rounded-3xl)
shadow: shadow-lg (subtle, Apple-like)
padding: p-8 sm:p-12 md:p-16 lg:p-20 (generous)
```

### Premium Card (Featured)
```css
background: white
border: 2px solid border
shadow: lg
padding: 24px
border-radius: 8px
```

**Use for:** Recommended products, highlighted content

### Minimal Card (Standard)
```css
background: card
border: 1px solid border
padding: 24px
border-radius: 8px
```

**Use for:** Standard content grid items

### Glass Card (Hero)
```css
background: white/95
backdrop-filter: blur(12px)
border: 1px solid white/30
shadow: 2xl
```

**Use for:** Hero CTAs, overlays on images

### Card Hover States
- Subtle background change: `hover:bg-muted/30`
- Shadow elevation: `hover:shadow-md`
- Transition: `transition-all duration-200`

---

## Button Styles

### Primary CTA (Ink)
```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90 
                   border-0 rounded-2xl px-10 sm:px-12 h-14 sm:h-16
                   shadow-md hover:shadow-lg text-lg sm:text-xl font-semibold">
```
**Use for:** Main conversion actions

### Secondary CTA (Mint)
```tsx
<Button className="bg-mint text-ink hover:bg-mint/90 
                   shadow-lg hover:shadow-xl hover:scale-105 transition-all">
```
**Use for:** Supporting actions

### Outline CTA
```tsx
<Button variant="outline" 
        className="border-border/60 rounded-2xl hover:bg-muted/50 hover:border-border/80">
```
**Use for:** Tertiary actions, "learn more"

### Button Requirements
- All variants must have `border-0` explicitly
- Smooth transitions (200ms)
- Proper hover states
- Accessible focus states

---

## Typography Hierarchy

### Page Hierarchy
```
H1 (Hero):     60px bold, Gobold, tight leading
H2 (Section):  36px bold, Inter, ink
H3 (Card):     24px semibold, Inter, ink
Body:          16px regular, Inter, foreground
Caption:       14px regular, Inter, muted-foreground
```

### Visual Weight
```
Headlines:  font-bold (700)
Subheads:   font-semibold (600)
Body:       font-normal (400)
Captions:   font-normal (400) with muted color
```

---

## Color Application

### Text Hierarchy
```
Primary text:    text-foreground (ink)
Secondary text:  text-muted-foreground (mid-grey)
Tertiary text:   text-muted-foreground/70
Headings:        text-foreground (ink)
Hero headings:   text-white with mint <span>
```

### Background Usage
```
Page background:     bg-background (off-white)
Card background:     bg-card (white)
Muted sections:      bg-muted (light grey)
Dark sections:       bg-ink
Accent areas:        bg-mint/10 (10% mint tint)
```

### Border Usage
```
Default:         border-border (light grey)
Subtle:          border-border/50
Emphasized:      border-mint
Dark mode:       border-border (adjusted in dark mode)
```

---

## Interactive States

### Hover Effects
```css
Buttons:    scale-105, shadow increase
Cards:      subtle lift (shadow)
Links:      underline, mint color
Icons:      translateX(4px) for arrows
```

### Focus States
```css
All interactive: ring-2 ring-mint ring-offset-2
Visible only:    focus-visible: modifier
```

### Active States
```css
Buttons:    scale-98 (slight press)
```

---

## Animation Guidelines

### Scroll Animations
```tsx
className="fade-in-up"
style={{animationDelay: `${index * 0.1}s`}}
```

**Stagger timing:** 0.1s per item  
**Max delay:** 0.6s (no more than 6 items)

### Micro-interactions
```css
Hover:      0.3s ease-out
Focus:      0.2s ease
Transitions: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

### Pulse Effects
```css
Glowing orbs:  3-4s duration
Hero accent:   2s duration
CTAs:          group-hover:animate-pulse (on icon)
```

### Animation Principles
1. **Smooth, Not Bouncy** - Damping: 35, Stiffness: 400, Mass: 0.8
2. **Fast, Not Slow** - Most animations: 200-350ms, Page transitions: 400ms
3. **Subtle, Not Dramatic** - Small movements (24px max), gentle opacity changes

---

## Imagery Guidelines

### Hero Images
- High resolution (2560px+ width)
- Dark overlays (40-60% opacity) for text legibility
- Positioned: center or focal point
- Never stretch or distort

### Icons
- Lucide React library
- 20px (h-5 w-5) standard
- 24px (h-6 w-6) for emphasis
- Mint color for positive actions
- Ink/foreground for neutral

### Logos
- CTRL icon: standalone mark
- Wordmark: full logo with text
- Krish headshot: circular crop, 192px diameter
- Always on appropriate contrast background

---

## Mobile Considerations

### Touch Targets
```css
Minimum: 44px × 44px (touch-target class)
Buttons: px-6 py-3 minimum
Icons:   Adequate padding around
```

### Responsive Patterns
```
Desktop:   3-4 columns
Tablet:    2 columns
Mobile:    1 column (stack)
```

### Font Scaling
```
Hero:     text-4xl → text-6xl (sm:md:lg)
H2:       text-2xl → text-4xl
Body:     text-base (consistent)
```

### Spacing Adjustments
```
Section padding: py-12 → py-20
Container:       px-4 → px-6
Gaps:            gap-4 → gap-6
```

### No-Scroll Mobile Experience
- Every page fits viewport
- Fixed headers
- Scrollable content areas only
- Proper viewport handling with `--mobile-vh`

---

## Accessibility Visual Requirements

### Color Contrast
- AA standard minimum (4.5:1 for body text)
- AAA preferred (7:1)
- Test: Ink on Off-White = 12.6:1 ✅
- Test: Mint on White = 1.9:1 ❌ (accent only, not text)

### Visual Hierarchy
- Clear heading levels (don't skip)
- Adequate spacing between sections
- Logical reading order

### Focus Indicators
- Visible on all interactive elements
- Mint ring (2px) with 2px offset
- Never remove focus styles

---

## Testing Requirements

### Visual Testing
- Screenshot every page on desktop (1920x1080)
- Screenshot every page on mobile (375x812)
- Compare against Apple design standards
- Verify spacing consistency

### Visual Audit Process
1. Screenshot every page on desktop (1920x1080)
2. Screenshot every page on mobile (375x812)
3. Critically analyze each screenshot as if you were Steve Jobs
4. Identify all visual issues
5. Fix issues
6. Repeat audit process
7. Complete at least 5 full audit cycles
8. Do not stop until visual quality is 10/10

### What to Look For
- Spacing consistency
- Typography hierarchy
- Color consistency
- Component alignment
- Animation smoothness
- Visual polish
- Apple-like refinement
- Executive-grade quality

---

**End of VISUAL_GUIDELINES**
