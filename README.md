# ASTRA

AI-first app and web builder foundation.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **App Blueprint**: Single source of truth for app structure
- **App Registry**: In-memory persistence for apps
- **Landing Page**: Create apps and view all your apps
- **App Preview**: Full-screen preview with desktop/mobile toggle

## Project Structure

- `core/blueprint/AppBlueprint.ts` - App structure definition
- `core/registry/AppRegistry.ts` - App persistence layer
- `app/page.tsx` - Landing page
- `app/apps/[id]/page.tsx` - App preview page

