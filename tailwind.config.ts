import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xxs': '0.65rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // ESI Severity Levels
        esi: {
          1: "hsl(var(--esi-1))",
          "1-bg": "hsl(var(--esi-1-bg))",
          "1-border": "hsl(var(--esi-1-border))",
          2: "hsl(var(--esi-2))",
          "2-bg": "hsl(var(--esi-2-bg))",
          "2-border": "hsl(var(--esi-2-border))",
          3: "hsl(var(--esi-3))",
          "3-bg": "hsl(var(--esi-3-bg))",
          "3-border": "hsl(var(--esi-3-border))",
          4: "hsl(var(--esi-4))",
          "4-bg": "hsl(var(--esi-4-bg))",
          "4-border": "hsl(var(--esi-4-border))",
          5: "hsl(var(--esi-5))",
          "5-bg": "hsl(var(--esi-5-bg))",
          "5-border": "hsl(var(--esi-5-border))",
        },
        // Status Colors
        status: {
          pending: "hsl(var(--status-pending))",
          active: "hsl(var(--status-active))",
          completed: "hsl(var(--status-completed))",
          escalated: "hsl(var(--status-escalated))",
          overdue: "hsl(var(--status-overdue))",
        },
        // Confidence
        confidence: {
          high: "hsl(var(--confidence-high))",
          medium: "hsl(var(--confidence-medium))",
          low: "hsl(var(--confidence-low))",
        },
        // SBAR
        sbar: {
          situation: "hsl(var(--sbar-situation))",
          background: "hsl(var(--sbar-background))",
          assessment: "hsl(var(--sbar-assessment))",
          recommendation: "hsl(var(--sbar-recommendation))",
        },
        // Vitals
        vitals: {
          normal: "hsl(var(--vitals-normal))",
          warning: "hsl(var(--vitals-warning))",
          critical: "hsl(var(--vitals-critical))",
        },
        // Warning color for returning patients, etc.
        warning: "hsl(var(--vitals-warning))",
        // Emergency state
        emergency: {
          bg: "hsl(var(--emergency-bg))",
          card: "hsl(var(--emergency-card))",
          border: "hsl(var(--emergency-border))",
          accent: "hsl(var(--emergency-accent))",
          muted: "hsl(var(--emergency-muted))",
          text: "hsl(var(--emergency-text))",
        },
        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        'glow-primary': '0 0 20px hsl(var(--primary) / 0.25)',
        'glow-critical': '0 0 20px hsl(var(--esi-1) / 0.35)',
        'glow-warning': '0 0 20px hsl(var(--esi-2) / 0.25)',
        'card': '0 2px 8px hsl(0 0% 0% / 0.15)',
        'card-hover': '0 8px 24px hsl(0 0% 0% / 0.25)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-critical": {
          "0%, 100%": { 
            boxShadow: "0 0 0 0 hsl(var(--esi-1) / 0.4)",
            opacity: "1"
          },
          "50%": { 
            boxShadow: "0 0 0 8px hsl(var(--esi-1) / 0)",
            opacity: "0.85"
          },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 15px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 25px hsl(var(--primary) / 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-critical": "pulse-critical 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-up": "slide-in-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
