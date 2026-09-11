import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        brand: { DEFAULT: "#4F46E5", light: "#818cf8", dark: "#3730a3" },
        wa: "#25D366",
        ig: "#E1306C",
        fb: "#1877F2",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
          300: "hsl(var(--primary-300))",
          400: "hsl(var(--primary-400))",
          500: "hsl(var(--primary-500))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
          800: "hsl(var(--primary-800))",
          900: "hsl(var(--primary-900))",
          DEFAULT: "hsl(var(--primary-600))",
          foreground: "hsl(var(--neutral-50))",
        },
        neutral: {
          50: "hsl(var(--neutral-50))",
          100: "hsl(var(--neutral-100))",
          200: "hsl(var(--neutral-200))",
          300: "hsl(var(--neutral-300))",
          400: "hsl(var(--neutral-400))",
          500: "hsl(var(--neutral-500))",
          600: "hsl(var(--neutral-600))",
          700: "hsl(var(--neutral-700))",
          800: "hsl(var(--neutral-800))",
          900: "hsl(var(--neutral-900))",
          DEFAULT: "hsl(var(--neutral-100))",
          foreground: "hsl(var(--neutral-900))",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { from: { backgroundPosition: "0 0" }, to: { backgroundPosition: "-200% 0" } },
        "border-beam": { "100%": { "offset-distance": "100%" } },
        meteor: { "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" }, "70%": { opacity: "1" }, "100%": { transform: "rotate(215deg) translateX(-500px)", opacity: "0" } },
        grid: { "0%": { transform: "translateY(-50%)" }, "100%": { transform: "translateY(0)" } },
        "marquee-x": { from: { transform: "translateX(0)" }, to: { transform: "translateX(calc(-100% - var(--gap)))" } },
        "marquee-y": { from: { transform: "translateY(0)" }, to: { transform: "translateY(calc(-100% - var(--gap)))" } },
        "spin-around": { "0%": { transform: "translateZ(0) rotate(0)" }, "15%, 35%": { transform: "translateZ(0) rotate(90deg)" }, "65%, 85%": { transform: "translateZ(0) rotate(270deg)" }, "100%": { transform: "translateZ(0) rotate(360deg)" } },
        slide: { to: { transform: "translate(calc(100cqw - 100%), 0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease",
        shimmer: "shimmer 8s infinite",
        "border-beam": "border-beam calc(var(--duration,10)*1s) infinite linear",
        meteor: "meteor var(--duration) var(--delay) ease-in-out infinite",
        grid: "grid 15s linear infinite",
        "marquee-x": "marquee-x var(--duration,30s) linear infinite",
        "marquee-y": "marquee-y var(--duration,30s) linear infinite",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        slide: "slide var(--speed) ease-in-out infinite alternate",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
