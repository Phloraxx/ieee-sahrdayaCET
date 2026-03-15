<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/Phloraxx/Ieee/blob/6bc94e41dd156cfb25c4eaa1434fb0de8415f7ca/public/web.png" />
</div>

# IEEE Sahrdaya Student Branch Website

Official website of IEEE Sahrdaya Student Branch — event discovery, society showcase, and execom directory.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Backend**: Appwrite
- **Auth**: Google OAuth (via Appwrite)
- **Icons**: Lucide React
- **Fonts**: Press Start 2P (pixel), Inter (body)

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css         # Global styles
│   │   ├── events/             # Events discovery hub
│   │   ├── societies/          # Societies showcase
│   │   ├── full-execom/        # Full execom directory
│   │   └── auth/callback/      # Google OAuth callback
│   ├── components/             # Reusable UI components
│   ├── contexts/
│   │   └── AuthContext.tsx     # Auth state & team management
│   ├── lib/
│   │   ├── appwrite.ts         # Appwrite client
│   │   └── execomData.ts       # Execom photo mapping
│   └── types.ts                # TypeScript interfaces
├── public/                     # Static assets
│   ├── Events/                 # Event images
│   ├── Execom/                 # Member photos
│   └── Societies/              # Society images
└── scripts/                    # Appwrite setup & migration scripts
```

## Getting Started

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the environment variables and fill in your Appwrite project details:

```bash
cp .env.example .env.local
```

3. Start the development server:

```bash
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
NEXT_PUBLIC_APPWRITE_DATABASE_ID=
NEXT_PUBLIC_APPWRITE_SOCIETIES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_EXECOM_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_SOCIETY_IMAGES_BUCKET_ID=
```

## Build for Production

```bash
npm run build
npm start
```

## License

© 2026 IEEE Sahrdaya Student Branch
