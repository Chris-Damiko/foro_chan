# Design System: foro_chan

Referencia de diseño para Google Stitch y para el CSS de `public/`. El texto de la interfaz va en español.

## 1. Visual Theme & Atmosphere
An anonymous imageboard that feels like a cursed VHS tape found in an attic. Dense like a classic chan board (density 7/10), with a mostly predictable grid that is broken on purpose by small glitches (variance 5/10). Motion is subtle and constant (6/10): faint scanlines, film grain, a slow tracking-line drift and rare chromatic-aberration flickers on headings. The mood is a late-night creepypasta: dim, quiet, uneasy, never cartoonish. It looks like a camcorder on-screen display, not a horror movie poster.

## 2. Color Palette & Roles
- **Dead Signal** (#0C0C0D) — Page background. Never pure black.
- **Tape Shell** (#151516) — Post and panel surfaces.
- **Worn Edge** (#2A2A2C) — 1px borders and dividers between posts.
- **Ash Bone** (#D6D2C8) — Main text.
- **Static Gray** (#7D7A73) — Metadata: anonymous IDs, dates, post numbers.
- **Dried Blood** (#9B2A22) — The only accent. Used for links, `>>1234` quotes, active states, focus rings, the main button and case status "abierto".
- **Greentext Moss** (#7E9A5C) — Only for lines that start with `>` (chan greentext). Not an accent.
- **VHS Fringe** (cyan #3FA7A3 and red #B33A3A at 40% opacity) — Only as a 1–2px offset shadow in glitch effects. Never as fills or text colors.

## 3. Typography Rules
- **Display:** `VT323` — Camcorder on-screen display font for board names, thread titles and the logo. Uppercase for board names. Medium size, not huge.
- **Body:** `IBM Plex Sans` — Post text, 15–16px, line-height 1.6, max 70 characters per line.
- **Mono:** `IBM Plex Mono` — Post numbers (`No.1234`), anonymous IDs (`ID:a8f3k2q1`), timestamps, `>>1234` quotes, file info.
- **Banned:** Inter, Times New Roman, Georgia, decorative "blood drip" or horror-movie fonts.

## 4. Component Stylings
- **Post (reply):** Flat rectangle in Tape Shell, 1px Worn Edge border, square corners (2px max). Header line in mono: ID, date, post number. Optional image thumbnail floats left (max 250px), with file info above it in mono.
- **Thread (OP):** Same as a post, without the box, sitting directly on the page, with its title in VT323 and Dried Blood.
- **Catalog card:** Small thumbnail on top, title, reply count in mono, first 2–3 lines of text. Tight grid of many cards (5–6 per row on desktop).
- **Buttons:** Flat, square, Worn Edge border, Ash Bone text. Main button in Dried Blood. Pressed: moves 1px down. No glow.
- **Inputs (post form):** Label above, dark field, 1px border, focus ring in Dried Blood. Fields: title, message, image (with preview), sources (only in Casos). Error text below the field in Dried Blood.
- **Case status badge:** Small mono tag: `ABIERTO` (Dried Blood), `EN REVISIÓN` (Static Gray), `CERRADO` (Worn Edge, struck through).
- **Deleted post:** Body replaced with `[borrado]` in Static Gray italics.
- **Loaders:** Skeleton blocks with a slow static-noise shimmer. No round spinners.
- **Empty states:** A dead-channel "NO SIGNAL" screen with the hint "Sé el primero en abrir un hilo."

## 5. Layout Principles
- Max content width 1100px, aligned left with a narrow side column on desktop.
- Top bar: logo `foro_chan` in VT323 plus board links `[conf] [casos] [gen]` in mono, like a classic chan nav.
- Board page: board header (name, short description, rules link), then the "Nuevo hilo" form collapsed, then the list of threads, then pagination as `[1] [2] [3]`.
- Thread page: OP, then replies stacked with 8px gaps. Reply form at the bottom.
- Casos page: OP plus a side panel (desktop) or a block on top (mobile) with status, sources list and a status timeline.
- Below 768px: everything single column, thumbnails at 120px, tap targets at least 44px, no horizontal scroll.

## 6. Motion & Interaction
- Fixed full-screen overlay: scanlines (2px repeating lines at 4% opacity) plus animated grain. Only on a fixed pseudo-element, and it never blocks clicks.
- Thread titles flicker with a 1–2px chromatic offset for 150ms every few seconds, at random.
- Hovering a `>>1234` quote shows a preview of the quoted post.
- Page enter: a short "tracking" distortion (100–200ms), then content fades in with a small stagger.
- Animate only `transform`, `opacity` and `filter`. Respect `prefers-reduced-motion`: turn every effect off.

## 7. Anti-Patterns (Banned)
- No emojis.
- No pure black (#000000).
- No neon glows, no purple/blue AI gradients, no gradient text.
- No rounded "SaaS" cards, no big marketing hero, no "Get started" CTAs.
- No gore, blood splatter images or jump-scare pictures. The fear comes from atmosphere.
- No real names, faces or personal data in example content (anti-doxxing rule). Example posts are anonymous and generic.
- No AI copywriting ("Elevate", "Seamless", "Unleash").
- No filler UI like "Scroll to explore" or bouncing arrows.
