import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import App from './App.tsx'
import { APP_CONTENT } from './constants/content.ts'
import { getCurrentBrand } from './lib/api/lotApi.ts'

function setFavicon(url: string) {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

async function bootstrap() {
  try {
    const currentBrand = await getCurrentBrand();

    if (currentBrand?.logoUrl) {
      setFavicon(currentBrand.logoUrl);
    }
    document.title = currentBrand?.name ?? "Lotlogic";

    APP_CONTENT.app.name = currentBrand?.name ?? APP_CONTENT.app.name;
    APP_CONTENT.brand.logo = currentBrand?.logoUrl ?? APP_CONTENT.brand.logo;
    APP_CONTENT.brand.favicon = currentBrand?.logoUrl ?? APP_CONTENT.brand.favicon;
    APP_CONTENT.brand.title = currentBrand?.title ?? APP_CONTENT.brand.title;
    APP_CONTENT.header.title = currentBrand?.name ?? APP_CONTENT.header.title;
    
    APP_CONTENT.colors.primary = currentBrand?.primaryColor ?? APP_CONTENT.colors.primary;
    APP_CONTENT.colors.secondary = currentBrand?.secondaryColor ?? APP_CONTENT.colors.secondary;
    APP_CONTENT.colors.text.primary = currentBrand?.textPrimaryColor ?? APP_CONTENT.colors.text.primary;
    APP_CONTENT.colors.text.secondary = currentBrand?.textSecondaryColor ?? APP_CONTENT.colors.text.secondary;
    APP_CONTENT.colors.background.primary = currentBrand?.bgPrimaryColor ?? APP_CONTENT.colors.background.primary;
    APP_CONTENT.colors.background.secondary = currentBrand?.bgSecondaryColor ?? APP_CONTENT.colors.background.secondary;
    
    APP_CONTENT.typography.fontFamily.primary = currentBrand?.fontFamilyPrimary ?? APP_CONTENT.typography.fontFamily.primary;
    APP_CONTENT.typography.fontFamily.secondary = currentBrand?.fontFamilySecondary ?? APP_CONTENT.typography.fontFamily.secondary;
  } catch (err) {
    console.error("Brand init failed", err);
  }

  const container = document.getElementById("root")!;
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
