# Design System - AiMarco

## Direction

**Personality:** Warmth & Approachability
**Foundation:** Warm (neutral whites and soft grays)
**Depth:** Subtle shadows + borders
**Context:** Mobile-first scheduling app for beauty professionals and their clients

## Tokens

### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 24, 32, 48

### Colors
--foreground: #212529
--secondary: #495057
--muted: #6C757D
--faint: #DEE2E6
--background: #F8F9FA
--surface: #FFFFFF
--accent: #007AFF
--accent-light: #B0D4FF
--success: #10B981
--success-light: #D1FAE5
--danger: #EF4444
--danger-light: #FCA5A5
--neutral: #6B7280
--border: rgba(0, 0, 0, 0.08)

### Radius
Scale: 6px, 8px, 10px, 12px (soft, friendly)
Default card: 10px
Button: 8px
Badge: 4px
Input: 8px

### Typography
Font: system-ui (native, fast)
Scale: 12, 13, 15, 16 (base), 18, 22, 26, 28
Weights: 400, 500, 600, 700

## Patterns

### Primary Button
- Height: 52px
- Padding: 16px
- Radius: 10px
- Font: 17px, bold
- Background: --accent
- Disabled: --accent-light

### Secondary Button (nav)
- Height: 36px
- Padding: 8px 16px
- Radius: 8px
- Border: 1px solid --accent
- Font: 16px, 600

### Card
- Border: 1px solid --faint
- Padding: 16px
- Radius: 10px
- Background: --surface
- No shadow (border-only for crispness on mobile)

### Input
- Height: 52px
- Padding: 14px
- Radius: 8px
- Border: 1px solid --faint
- Font: 16px, 400
- Background: --surface

### Badge
- Padding: 2px 8px
- Radius: 4px
- Font: 12px, 600

### Date Row (booking list item)
- Padding: 16px
- Radius: 10px
- Border: 1px solid --faint
- Background: --surface
- Arrow: --faint

### Slot Button
- Padding: 12px 20px
- Radius: 8px
- Border: 1px solid --accent
- Font: 16px, 600

## Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Warmth over Precision | Consumer app, not admin dashboard | 2026-03-22 |
| system-ui font | Native feel, no bundle overhead | 2026-03-22 |
| Border-only cards | Crisp on mobile, no shadow blur | 2026-03-22 |
| #007AFF accent | iOS-native blue, familiar to users | 2026-03-22 |
| 52px button height | Comfortable tap target on mobile | 2026-03-22 |
