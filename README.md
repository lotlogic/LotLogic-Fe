# 🧱 LotLogic React Frontend

A modern React + Vite frontend for visualizing zoning and lot data using Mapbox, built with **React 19**, **Vite**, **Tailwind CSS 4**, and **TanStack Query**.

---

## 🚀 Features

- **Interactive Mapbox Map** - Visualize zoning and lot data with real-time interactions
- **Lot Selection & Details** - Click lots to view detailed information (block, section, zoning, overlays)
- **House Design Integration** - Browse and save house designs for selected lots
- **Dynamic Zoning Colors** - Visual zoning classification with custom color coding
- **Saved Properties** - Save favorite lots and house designs to localStorage
- **Responsive Design** - Modern UI with custom fonts and brand colors
- **Performance Optimized** - Code splitting and lazy loading for better performance

---

## 🛠️ Tech Stack

- **React 19** - Latest React with concurrent features
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **Mapbox GL JS** - Interactive maps and geospatial data
- **TanStack Query** - Data fetching and caching
- **Zustand** - Lightweight state management
- **React Hook Form + Zod** - Form validation
- **Lucide React** - Beautiful icons
- **Radix UI** - Accessible UI components

---

## 📦 Installation

```bash
# Navigate to the project directory
cd lotlogic-react

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌍 Environment Setup

Create a `.env` file in the project root:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

Get your Mapbox token from [Mapbox](https://account.mapbox.com/access-tokens/).

---

## 🏗️ Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview

```

---

## 🎯 Performance Optimizations

This project implements several performance optimizations to handle large bundle sizes:

### 1. **Code Splitting**
- Lazy loading of heavy components
- Dynamic imports for Mapbox GL JS
- Vendor chunk separation

### 2. **Bundle Optimization**
- Manual chunk configuration in `vite.config.ts`
- Separate vendor libraries (React, Mapbox, UI components)
- Optimized dependency pre-bundling

### 3. **Mapbox GL JS Optimization**
- Dynamic import to reduce initial bundle size
- CSS loaded only when needed
- Access token configuration

### 4. **Component Architecture**
- Modular component structure
- Efficient re-rendering with React.memo
- Optimized state management

---

## 📁 Project Structure

```
lotlogic-react/
├── src/
│   ├── components/
│   │   ├── features/
│   │   │   ├── map/           # Map-related components
│   │   │   ├── lots/          # Lot selection and details
│   │   │   ├── facades/       # House design components
│   │   │   └── zoning/        # Zoning layer components
│   │   ├── layouts/           # Layout components
│   │   └── ui/               # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and API
│   ├── types/                # TypeScript type definitions
│   ├── constants/            # App constants
│   └── styles/              # Global styles
├── public/                  # Static assets
└── dist/                   # Build output
```

---

## 🗺️ Core Components

### ZoneMap (`src/components/features/map/MapLayer.tsx`)
The main map component that:
- Renders interactive Mapbox map
- Handles lot selection and highlighting
- Manages map layers and controls
- Integrates with lot calculation API

### LotSidebar (`src/components/features/lots/LotSidebar.tsx`)
Displays detailed lot information:
- Lot identification and measurements
- Zoning and overlay information
- House design selection
- Quote request flow

### HouseDesignList (`src/components/features/facades/HouseDesignList.tsx`)
Shows available house designs:
- Filterable design gallery
- Save to favorites functionality
- Integration with lot selection

---

## 🎨 Customization

### Colors & Branding
- **Primary Color**: `#2F5D62` (brand green)
- **Font**: DM Sans (Google Fonts)
- **Map Style**: Mapbox Streets v12

### CSS Variables
```css
--color-primary: #2F5D62;
--font-dm-sans: 'DM Sans', sans-serif;
```

---

## 🔧 Development

### Adding New Features
1. Create components in appropriate feature folders
2. Add TypeScript types in `src/types/`
3. Update constants in `src/constants/`
4. Test with `npm run dev`

### Performance Monitoring
- Use browser dev tools to monitor bundle sizes
- Check Network tab for chunk loading
- Monitor memory usage in React DevTools

---

## 🐳 Docker Support

### Development
```bash
docker-compose --profile dev up
```

### Production
```bash
docker-compose --profile prod up
```

See `DOCKER.md` for detailed Docker instructions.

---

## 📊 Bundle Analysis

The build process creates optimized chunks:
- **vendor-react**: React and React DOM
- **vendor-mapbox**: Mapbox GL JS library
- **vendor-ui**: UI component libraries
- **vendor-utils**: Utility libraries
- **main**: Application code

### Bundle Size Targets
- Initial JS: < 500KB
- Total JS: < 2MB
- CSS: < 100KB

---

## 🚨 Troubleshooting

### Common Issues

**Map not loading:**
- Check `VITE_MAPBOX_TOKEN` in `.env`
- Verify Mapbox token is valid
- Check browser console for errors

**Large bundle size:**
- Run `npm run build` to see chunk analysis
- Check for duplicate dependencies
- Verify code splitting is working

**Performance issues:**
- Use React DevTools Profiler
- Check for unnecessary re-renders
- Monitor network requests

---

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📚 Handover Pack

Operational handover documentation for the frontend, backend, and public assessment flow lives in [`docs/ops/README.md`](docs/ops/README.md).

---

## 🔗 Related Projects

- **LotLogic Backend** - API services
- **LotLogic Next.js** - Original Next.js version
- **LotLogic Mobile** - React Native app

---

*Built with ❤️ using modern web technologies*
