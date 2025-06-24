Here is the **Markdown version** of the ShadCN UI Design System profile:

---

# ShadCN UI Design System

> A modern, accessible, and utility-first design system using Tailwind CSS with Radix UI components. This design profile outlines visual patterns and structural rules for use in design replication and component generation with tools like Copilot.

---

## ✅ Overview

* **Name**: ShadCN UI Design System
* **Version**: 1.0.0
* **Description**: A clean, component-driven system for modern web apps. Prioritizes accessibility, composition, and developer experience.
* **Philosophy**: Accessible, composable, consistent, and theme-ready with Tailwind + Radix UI.

---

## 🎨 Foundation

### Typography

* **Font**: `Inter, sans-serif`
* **Sizes**: `0.75rem` → `2.25rem`
* **Line Heights**: `1` → `1.75`
* **Font Weights**: 400, 500, 600, 700
* **Letter Spacing**: Tight (`-0.015em`), Normal, Wide (`0.015em`)

### Colors

```text
Base:
  - background: #ffffff
  - foreground: #000000

Accent:
  - primary: #6366f1
  - primaryForeground: #ffffff
  - secondary: #f4f4f5
  - secondaryForeground: #18181b

Muted:
  - background: #f9fafb
  - foreground: #6b7280

Destructive:
  - background: #ef4444
  - foreground: #ffffff

Border: #e4e4e7  
Input: #d4d4d8  
Ring: #c4b5fd
```

### Spacing

* `xs`: 0.25rem
* `sm`: 0.5rem
* `md`: 1rem
* `lg`: 1.5rem
* `xl`: 2rem

### Radii

* `sm`: 4px
* `md`: 8px
* `lg`: 12px
* `xl`: 16px
* `full`: 9999px

### Shadows

* `xs`: subtle 1px shadow
* `md`: 4px soft lift
* `lg`: 10px drop shadow

### Borders

* Widths: 1px, 2px
* Style: `solid`

---

## 🧩 Components

### Button

* **Variants**: default, outline, ghost, link, destructive
* **States**: hover, focus, disabled, active, loading
* **Sizes**: sm, md, lg, icon
* **Structure**: icon + label

### Input

* **Types**: text, email, password, search
* **States**: default, focus, error, disabled
* **Extras**: iconLeft, iconRight, label, helperText

### Card

* **Sections**: header, body, footer
* **Elevation**: none, sm, md
* **Radius**: medium

### Sheet

* **Placement**: left, right, top, bottom
* **Transition**: slide
* **Overlay**: true

### Dialog

* Modal + overlay
* Structure: title, description, actions

### Tooltip

* Delay: 200ms
* Placement: top, bottom, left, right

### Dropdown Menu

* Trigger: button
* Structure: item, separator, label, checkbox, radio

### Tabs

* Orientation: horizontal, vertical
* Structure: tabList, tabTrigger, tabContent

---

## 📐 Layout

### Container

* Max Width: 1280px
* Padding: 1rem
* Centered: yes

### Grid

* Columns: 12
* Gap: 1rem
* Responsive breakpoints:

  * `sm`: 640px
  * `md`: 768px
  * `lg`: 1024px
  * `xl`: 1280px

---

## 🎞 Motion

* **Easing**:

  * default: `ease-in-out`
  * accelerate: `ease-in`
  * decelerate: `ease-out`

* **Durations**:

  * fast: 150ms
  * normal: 300ms
  * slow: 500ms

* **Animations**: fade, slide, scale

---

## ♿ Accessibility

* Focus visible styling
* ARIA support
* Keyboard navigation enabled

---

## ⚙️ Usage

* **Framework**: React
* **Styling**: Tailwind CSS
* **Component Library**: Radix UI + custom primitives
* **Install**: `npx shadcn-ui@latest init`
* **Purpose**: Developer-friendly, consistent component setup for scalable UIs
