# 🧱 LotLogic Frontend

A modern frontend for visualizing zoning and lot data using Mapbox, built with **Next.js 15**, **Tailwind CSS 4**, **React 19**, and **TanStack Query**.

---

## 🚀 Features

- Interactive Mapbox map for zoning and lot visualization
- Clickable lots with detailed sidebar info (block, section, zoning, overlays, etc.)
- Dynamic coloring for zoning, overlays, and water lots
- Responsive, modern UI with custom font and brand button color
- Sidebar with tabbed details (Lot Details, Zoning Info)
- Zoom to selected lot
- Clean, accessible design

---

## 🛠️ Tech Stack

- **Next.js 15 (App Router)**
- **TailwindCSS 4** (with custom font and color)
- **Mapbox GL JS**
- **React 19**
- **TanStack React Query**
- **Zustand (State Management)**
- **Zod + React Hook Form (Validation & Forms)**
- **Lucide React (Icons)**

---

## 📦 Installation

Make sure you have `pnpm` installed.

```bash
pnpm install
```

---

## 🏃‍♂️ Running the Project

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌍 Mapbox Setup

You need a Mapbox access token. Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

---

## 🖼️ Main Component: ZoneMap

The core of the app is the `ZoneMap` component:
- Renders a Mapbox map with a custom vector tileset for blocks/lots
- Click a lot to open a sidebar with:
  - Identification, location, measurements, zoning info, and coordinates
  - Tabbed interface for details and zoning
  - "Zoom to Lot" button
- Custom coloring for zoning, overlays, and water
- Uses Lucide icons for UI

---

## 🎨 Customization

- **Font:** Uses [Source Serif Pro](https://fonts.google.com/specimen/Source+Serif+Pro) via Tailwind (`font-serifpro`)
- **Button Color:** Brand color `#2F5D62` via Tailwind (`bg-primary-btn`)
- **Map Style:** Mapbox Streets v12, with overlays for zoning and masking

---

## 📝 Scripts

- `pnpm dev` — Start development server
- `pnpm build` — Build for production
- `pnpm start` — Start production server
- `pnpm lint` — Lint code

---

## 📁 Project Structure

- `src/components/features/zoning/ZoneMap.tsx` — Main interactive map and sidebar
- `src/app/globals.css` — Global styles and font imports
- `tailwind.config.js` — Tailwind theme customization

---

## 📄 License

MIT
