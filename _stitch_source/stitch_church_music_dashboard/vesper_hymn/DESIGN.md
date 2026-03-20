# Design System Document: Centro Cristiano Palmas

This design system is a high-end, bespoke framework engineered for church music management. It rejects the "utility-first" template aesthetic in favor of a sophisticated, editorial experience. By utilizing deep tonal layering, expansive whitespace, and authoritative typography, we create an environment that feels both technologically advanced and spiritually grounded.

---

## 1. Creative North Star: "The Digital Curator"

The "Digital Curator" philosophy treats music management not as a database task, but as an act of preparation. We move away from rigid, boxed-in grids toward **Fluid Editorial Layouts**.

- **Intentional Asymmetry:** Avoid perfectly centered blocks. Use the `24 (6rem)` spacing token to create wide, "breathing" margins that allow content to feel curated.
- **Layered Solemnity:** We replace harsh dividers with "Physicality." Elements should feel like sheets of fine vellum paper or frosted glass stacked upon one another, using color shifts rather than lines to denote change.

---

## 2. Color & Atmospheric Depth

Our palette is anchored in `primary: #002446`. This is not just a blue; it is an "Academic Navy" that signals trust and tradition.

### The "No-Line" Rule

**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment.

- **Boundary Definition:** Use background shifts. A sidebar should be `surface_container_low`, sitting on a `surface` background.
- **The Signature Gradient:** For primary CTAs or Song Header backgrounds, use a subtle linear gradient from `primary` to `primary_container`. This adds a "soul" to the UI that flat hex codes lack.

### Surface Hierarchy & Nesting

Treat the interface as a series of nested elevations using the `surface-container` tiers:

1.  **Base Layer:** `surface` (#f7f9fc)
2.  **Sectioning Layer:** `surface_container_low` (#f2f4f7)
3.  **Content Cards:** `surface_container_lowest` (#ffffff) for maximum "pop" and legibility.
4.  **Interactive Overlays:** Use `surface_bright` with a 12px `backdrop-blur` for a glassmorphism effect on floating menus.

---

## 3. Typography: The Modern Hymnal

We utilize a dual-sans-serif approach to balance high-end editorial feel with extreme functional clarity.

- **Display & Headlines (Manrope):** Chosen for its geometric purity and modern authority.
  - _Usage:_ Use `display-lg` for dashboard welcomes and `headline-md` for song titles. The wide tracking of Manrope provides an "expensive" feel.
- **Body & Labels (Inter):** The gold standard for screen readability.
  - _Usage:_ All metadata (Key, BPM, Last Played) must use `label-md`.
- **Hierarchy Note:** Use `on_surface_variant` (#43474e) for secondary metadata to create a clear "read-order" against the `on_surface` (#191c1e) primary titles.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often "dirty." We use **Ambient Depth**.

- **The Layering Principle:** To lift a Song Card, do not use a border. Place the `surface_container_lowest` card on a `surface_container` background.
- **Ambient Shadows:** For floating elements (like a drag-and-drop song in motion), use a shadow with a `24px` blur at 6% opacity, tinted with `primary`.
- **The "Ghost Border" Fallback:** If a divider is essential for accessibility, use `outline_variant` at **15% opacity**. It should be felt, not seen.
- **Glassmorphism:** Use `primary_container` at 80% opacity with a `20px` blur for "Now Playing" or "Sequence Builder" footers to let the music library peek through beneath.

---

## 5. Components

### Song Cards (The "Sheet Music" Card)

- **Background:** `surface_container_lowest`.
- **Corner Radius:** `lg (0.5rem)`.
- **Layout:** No borders. Use a `1.5 (0.375rem)` vertical accent bar of `surface_tint` on the far left to denote the "Active" state.
- **Content:** Song Title in `title-lg`, Key/BPM in `label-md` using `secondary`.

### Upload Zones (The "Altar")

- **Style:** Instead of dashed lines, use a `surface_container_high` background with a `md (0.375rem)` corner radius.
- **Interaction:** On drag-over, transition the background to `secondary_container` with a subtle `primary` inner glow.

### Sequence Builder (Drag-and-Drop)

- **The "Ghost" State:** When an item is picked up, the original slot should stay visible using `surface_dim` with a "Ghost Border."
- **Handle:** Use a simple 6-dot icon in `outline_variant`.

### Primary Buttons

- **Style:** `primary` fill, `on_primary` text.
- **Shape:** `full (9999px)` for "Action" buttons (e.g., "Add Song"); `md (0.375rem)` for "System" buttons (e.g., "Save").
- **Micro-interaction:** On hover, shift to `primary_container` with a `2px` vertical lift.

---

## 6. Do’s and Don’ts

### Do:

- **Do** use `20 (5rem)` or `24 (6rem)` padding for page headers to create a sense of calm.
- **Do** use `tertiary_container` for highlight states (e.g., a "New" tag on a song) to provide a warm, sophisticated contrast to the blues.
- **Do** use `surface_container_highest` for "Selected" states in a list.

### Don’t:

- **Don’t** use black (#000000). Always use `on_surface` (#191c1e).
- **Don’t** use `1px` lines to separate list items. Use a `1 (0.25rem)` or `2 (0.5rem)` vertical gap.
- **Don’t** use high-saturation reds for errors. Use the muted `error` (#ba1a1a) and `error_container` for a more "respectful" correction.

---

## 7. Contextual Component: The Setlist Flow

Because this is for music management, create a **"Flow Connector"** component. Between song cards in a sequence, use a thin vertical line of `outline_variant` (20% opacity) with a `label-sm` indicator showing the "Transition Type" (e.g., "Crossfade" or "Vamp"). This maintains the editorial, "plotted" feel of a worship service.
