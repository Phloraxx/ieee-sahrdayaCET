<div align="center">

<img width="1200" height="475" alt="IEEE Sahrdaya Event Management System" src="https://github.com/Phloraxx/Ieee/blob/6bc94e41dd156cfb25c4eaa1434fb0de8415f7ca/public/web.png" />

# IEEE Sahrdaya Event Management System

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Appwrite](https://img.shields.io/badge/Appwrite-22.x-F02E65?style=flat-square&logo=appwrite)](https://appwrite.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)]()

**Complete event management platform for IEEE Sahrdaya Student Branch**

[🌐 Live Site](https://ieeesahrdaya.com) • [📖 Documentation](#-documentation) • [🚀 Quick Start](#-quick-start)

</div>

---

## 📋 Overview

The IEEE Sahrdaya Event Management System is a comprehensive platform for managing technical events, workshops, hackathons, and symposiums organized by the IEEE Sahrdaya Student Branch and its 14 technical societies.

### 🎯 Key Capabilities

| Feature | Description |
|---------|-------------|
| **Event Discovery** | Browse upcoming events with filters by society, date, and type |
| **Online Registration** | Custom form builder for event-specific registration fields |
| **Digital Tickets** | QR code-based tickets delivered via email |
| **Check-in Scanner** | Real-time QR scanning with mobile-friendly interface |
| **Payment Integration** | UPI payment support with manual verification |
| **Email Automation** | Confirmations, reminders, and custom bulk emails |
| **Analytics Dashboard** | Registration stats, demographics, and revenue tracking |
| **Multi-Society Support** | 14 societies with independent management |

---

## 🖼️ Screenshots

> **📍 Home Page**: Modern landing page with event highlights and society showcase
>
> **📍 Events Page**: Browse all upcoming events with filtering and search
>
> **📍 Registration Flow**: Custom form with validation and payment integration
>
> **📍 Digital Ticket**: QR code ticket for event check-in
>
> **📍 Admin Dashboard**: Event management, registrations, and analytics
>
> **📍 Check-in Scanner**: Mobile QR scanner for event entry

*Screenshots to be added*

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Appwrite** account ([cloud.appwrite.io](https://cloud.appwrite.io))

### Installation

```bash
# Clone the repository
git clone https://github.com/ieee-sahrdaya/website.git
cd website

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Configure environment variables (see docs/SETUP_GUIDE.md)
# Then run setup scripts:

npm run test:connection     # Verify Appwrite connection
npm run setup:appwrite      # Create base collections
npm run setup:event-system  # Create event system collections

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🏗️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Animations |
| **Lucide React** | Icon library |

### Backend

| Technology | Purpose |
|------------|---------|
| **Appwrite** | Database, Auth, Teams |
| **Next.js API Routes** | Serverless functions |
| **Nodemailer** | Email delivery |
| **Zod** | Schema validation |
| **node-appwrite** | Server SDK |

### Additional Libraries

| Library | Purpose |
|---------|---------|
| **qrcode** | QR code generation |
| **papaparse** | CSV export |
| **jspdf** | PDF generation |
| **@dnd-kit** | Drag-and-drop form builder |
| **recharts** | Analytics charts |

---

## 📁 Project Structure

```
ieee-sahrdaya/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/                # Admin dashboard pages
│   │   │   ├── events/           # Event management
│   │   │   ├── checkins/         # Check-in scanner
│   │   │   └── dashboard/        # Analytics
│   │   ├── api/                  # API routes
│   │   │   ├── admin/            # Admin endpoints
│   │   │   ├── events/           # Public event endpoints
│   │   │   ├── registrations/    # Registration endpoints
│   │   │   └── emails/           # Email endpoints
│   │   ├── events/               # Events page
│   │   ├── societies/            # Societies showcase
│   │   └── full-execom/          # Execom directory
│   │
│   ├── components/               # React components
│   │   ├── admin/                # Admin-specific components
│   │   └── ...                   # Shared components
│   │
│   ├── contexts/                 # React contexts (Auth)
│   │
│   ├── lib/                      # Utilities
│   │   ├── api/                  # API helpers
│   │   ├── appwrite.ts           # Appwrite client
│   │   ├── emailService.ts       # Email sending
│   │   └── validation/           # Zod schemas
│   │
│   └── types/                    # TypeScript types
│
├── scripts/                      # Setup scripts
├── public/                       # Static assets
└── docs/                         # Documentation
```

---

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# Database Collections
NEXT_PUBLIC_APPWRITE_DATABASE_ID=ieee_sahrdaya_db
NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID=events
NEXT_PUBLIC_APPWRITE_EVENT_REGISTRATIONS_COLLECTION_ID=event_registrations
# ... (see .env.local.example for full list)

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=IEEE Sahrdaya <events@ieeesahrdaya.com>

# Application
NEXT_PUBLIC_BASE_URL=https://ieeesahrdaya.com
```

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed configuration instructions.

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run setup:appwrite` | Create base Appwrite collections |
| `npm run setup:event-system` | Create event system collections |
| `npm run test:connection` | Test Appwrite connection |

---

## 📖 Documentation

### For Different Users

| Document | Audience | Description |
|----------|----------|-------------|
| [Setup Guide](docs/SETUP_GUIDE.md) | DevOps | Complete setup from scratch |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Developers | Architecture, code style, contributing |
| [API Documentation](docs/API_DOCUMENTATION.md) | Developers | Complete API reference |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Society Chairs | Managing events and registrations |
| [User Guide](docs/USER_GUIDE.md) | Students | Registering for events |

### Quick Links

- **New Developer?** Start with the [Developer Guide](docs/DEVELOPER_GUIDE.md)
- **Setting up fresh?** Follow the [Setup Guide](docs/SETUP_GUIDE.md)
- **Building integrations?** Check the [API Documentation](docs/API_DOCUMENTATION.md)
- **Society chair?** Read the [Admin Guide](docs/ADMIN_GUIDE.md)

---

## 🔐 Authentication & Authorization

### User Roles

| Role | Access |
|------|--------|
| **Guest** | View events, societies |
| **Student** | Register for events, view tickets |
| **Society Chair** | Manage society events, registrations, check-ins |
| **Super Admin** | Full access to all societies and settings |

### Society Chair Access

Chairs are managed through Appwrite Teams:
- Team ID format: `chair_<society_slug>` (e.g., `chair_cs`, `chair_ras`)
- Add chairs via Appwrite Console → Auth → Teams

---

## 🌐 Deployment

### Vercel (Recommended)

1. Import repository to Vercel
2. Configure environment variables
3. Deploy

```bash
# Verify deployment
npm run build  # Ensure build succeeds locally
```

### Manual Deployment

```bash
npm run build
npm start
```

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md#production-deployment) for detailed deployment instructions.

---

## 🤝 Contributing

We welcome contributions from the IEEE Sahrdaya community!

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(events): add bulk registration export
fix(auth): handle expired session gracefully
docs(api): document check-in endpoints
```

See [Developer Guide](docs/DEVELOPER_GUIDE.md#contributing) for detailed guidelines.

---

## 🏆 Team

### Development Team

The IEEE Sahrdaya Event Management System is built and maintained by the IEEE Sahrdaya Student Branch technical team.

### Societies

This platform serves 14 IEEE technical societies:

| Society | Slug |
|---------|------|
| Computer Society | `cs` |
| Robotics & Automation Society | `ras` |
| Women in Engineering | `wie` |
| Industry Applications Society | `ias` |
| Power & Energy Society | `pes` |
| SIGHT | `sight` |
| Engineering in Medicine & Biology | `embs` |
| Signal Processing Society | `sps` |
| Circuits and Systems Society | `cas` |
| Communication Society | `css` |
| Education Society | `edsoc` |
| Industrial Electronics Society | `ies` |
| Nuclear & Plasma Sciences Society | `npss` |
| Photonics Society | `ps` |

---

## 📄 License

© 2024-2026 IEEE Sahrdaya Student Branch. All rights reserved.

This is proprietary software. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

<div align="center">

**Built with ❤️ by IEEE Sahrdaya Student Branch**

[Website](https://ieeesahrdaya.com) • [Instagram](https://instagram.com/ieeesahrdaya) • [LinkedIn](https://linkedin.com/company/ieee-sahrdaya)

</div>
