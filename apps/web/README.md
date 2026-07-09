# Base Admin Panel

A modern, highly-responsive, and feature-rich administration dashboard built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS v4**.

Designed with sleek dark/light mode integration, fluid animations, and a modular architecture, this project serves as a production-ready boilerplate for management panels.

---

## 🚀 Key Features

* **🔐 Secure Authentication:** Seamless login/logout flows with token persistency via Zustand middleware, custom axios interceptors, and auto-logout on `401 Unauthorized` responses.
* **📊 Analytics Dashboard:** Interactive data visualizations tracking platform registrations, ticket volumes, ticket status/priority breakdowns, discount performance, and support staff response times.
* **👥 Users Management:** Full CRUD operations on user accounts, supporting search, sorting, filtering, pagination, and multi-view switcher (grid or table).
* **🎫 Discounts & Coupons:** Create, edit, copy, and delete discount codes with percentage discounts, expiration timers, and real-time usage progress bars.
* **📢 Notifications History:** Compose and dispatch system-wide announcements with attachments and links, and track notification history (read/unread statuses).
* **💬 Feedbacks Review:** Centralized feedback dashboard to review and manage user submittals with responsive detail overlays.
* **👤 Profile & Security Settings:** Self-service profile editing (name changes) and password update forms with validation matching.
* **🎫 Tickets Management:** Centralized support desk allowing operators to handle customer inquiries, update ticket status, manage ticket types, and reply to message threads.
* **✨ Premium UX/UI:** Fluid transitions, animations, and micro-interactions powered by `framer-motion` and `iconsax-reactjs` on top of DaisyUI.

---

## 🛠️ Technology Stack

| Library | Role |
| :--- | :--- |
| **React 19** & **TypeScript** | Core Framework |
| **Vite 7** | Next-gen Bundler & Build Tool |
| **Tailwind CSS v4** & **DaisyUI v5** | Styling, Utility classes, Theme support |
| **Zustand 5** | Lightweight Global State Management |
| **TanStack React Query v5** | Server-State Management & Caching |
| **React Hook Form 7** & **Zod 4** | Form Management & Schema Validation |
| **Recharts 2** | Responsive SVG/HTML5 charts engine for React |
| **Axios** | HTTP Request client |
| **Framer Motion 12** | Smooth layout transitions & Micro-animations |

---

## 📂 Project Directory Structure

The project follows a **Feature-driven Folder Structure**, keeping all logical parts (API, hooks, components, pages) self-contained:

```text
src/
├── components/          # Reusable global UI components (date picker, pagination, etc.)
├── core/                # Core configurations (axios setup, theme constants, router config)
│   ├── api/             # Global ApiService wrappers
│   ├── config/          # Axios instance and react-query client
│   └── router/          # App routing tree and page lazy-loading
├── features/            # Feature-driven modules (Auth, Users, Discounts, Layout, etc.)
│   └── [feature_name]/
│       ├── api/         # Feature API requests
│       ├── components/  # Feature-specific UI components
│       ├── hooks/       # Custom react-query hooks
│       ├── pages/       # Page views
│       ├── routes/      # Feature sub-routes
│       ├── types/       # TypeScript declarations
│       └── validation/  # Zod validation schemas
├── hooks/               # Global custom React hooks
├── utils/               # Helper utilities (formatting dates, errors)
├── main.tsx             # Application entrypoint
└── index.css            # Stylesheets and Tailwind imports
```

---

## ⚙️ Configuration & Environment

Create a `.env` file in the root directory by copying the example file:
```bash
cp .env.example .env
```

Adjust the following variables inside `.env`:
* `VITE_API_BASE_URL`: Base API address of the backend service.
* `VITE_API_VERSION`: API version path (default: `v1`).
* `VITE_API_TIMEOUT`: Axios request timeout in milliseconds (default: `30000`).
* `VITE_USE_MOCK`: Toggles the Mock Service Worker (MSW) for offline testing/development. Set to `true` (default in dev) to mock endpoints in-memory, or `false` to connect directly to the real backend.

---


## 💻 Local Setup & Development

### 1. Install Dependencies
Ensure you have Node.js (v20+) installed:
```bash
npm install
```

### 2. Start Development Server
Runs the local Vite development environment with Hot Module Replacement (HMR):
```bash
npm run dev
```

### 3. Build for Production
Compiles and optimizes the static files for production inside the `dist` directory:
```bash
npm run build
```

### 4. Preview Build Locally
Starts a local server to preview the built application at `http://localhost:3000`:
```bash
npm run serve
```

### 5. Code Linting & Verification
Runs ESLint rules check to ensure code consistency and type safety:
```bash
npm run lint
```

---

## 🐳 Docker Deployment (Production-Ready)

The project includes an optimized multi-stage `Dockerfile` and a customized `nginx.conf` designed for light, fast, and secure static serving in production.

### Build the Docker Image
```bash
docker build -t base-admin-panel .
```

### Run the Docker Container
```bash
docker run -d -p 8080:80 --name admin-panel base-admin-panel
```
The panel will now be live and accessible at `http://localhost:8080`.

---

## 🤝 Contribution Guidelines

We welcome contributions to improve the Base Admin Panel!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`). Ensure that `npm run lint` passes with 0 errors before committing.
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
