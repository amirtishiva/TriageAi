# TriageAI - Care Flow Navigator

A modern, high-performance healthcare application designed to streamline triage processes, patient management, and physician handoffs. Built with React, TypeScript, and Supabase.

## 🚀 Features

- **Patient Triage Queue**: Real-time visualization of patient status, vitals, and wait times.
- **Physician Handoffs**: Seamless shift transition tools with structured data transfer.
- **Care Flow Navigation**: Optimized workflows for medical staff.
- **Modern UI**: Polished, accessible interface using shadcn/ui and Tailwind CSS.
- **Data Integration**: Real-time data syncing via Supabase.

## 🛠 Tech Stack

- **Frontend Framework**: [React](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) based on Radix UI
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Routing**: [React Router](https://reactrouter.com/)
- **Backend/Database**: [Supabase](https://supabase.com/)
- **Testing**: [Vitest](https://vitest.dev/) & React Testing Library

## 📦 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or bun

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/triage-ai.git
    cd care-flow-navigator
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:8080` (or similar).

### Build for Production

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📂 Project Structure

```
care-flow-navigator/
├── docs/               # Project documentation
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and configurations
│   ├── pages/          # Application pages/routes
│   ├── test/           # Test files
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Entry point
├── supabase/           # Supabase migrations and config
└── package.json        # Project dependencies and scripts
```

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
