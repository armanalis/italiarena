import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * The theme colors are whole oklch() values in CSS variables, so Tailwind 3
 * cannot add opacity to them by itself: without this, bg-primary/10 and
 * border-border/60 produced no CSS at all. oklab, not oklch: Chrome drops the
 * hue when mixing in oklch, and grey turns red.
 */
const themeColor = (name: string) =>
  `color-mix(in oklab, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: themeColor("background"),
        foreground: themeColor("foreground"),
        card: {
          DEFAULT: themeColor("card"),
          foreground: themeColor("card-foreground"),
        },
        popover: {
          DEFAULT: themeColor("popover"),
          foreground: themeColor("popover-foreground"),
        },
        primary: {
          DEFAULT: themeColor("primary"),
          foreground: themeColor("primary-foreground"),
        },
        secondary: {
          DEFAULT: themeColor("secondary"),
          foreground: themeColor("secondary-foreground"),
        },
        muted: {
          DEFAULT: themeColor("muted"),
          foreground: themeColor("muted-foreground"),
        },
        accent: {
          DEFAULT: themeColor("accent"),
          foreground: themeColor("accent-foreground"),
        },
        destructive: {
          DEFAULT: themeColor("destructive"),
          foreground: themeColor("destructive-foreground"),
        },
        border: themeColor("border"),
        input: themeColor("input"),
        ring: themeColor("ring"),
        chart: {
          "1": themeColor("chart-1"),
          "2": themeColor("chart-2"),
          "3": themeColor("chart-3"),
          "4": themeColor("chart-4"),
          "5": themeColor("chart-5"),
        },
        sidebar: {
          DEFAULT: themeColor("sidebar"),
          foreground: themeColor("sidebar-foreground"),
          primary: themeColor("sidebar-primary"),
          "primary-foreground": themeColor("sidebar-primary-foreground"),
          accent: themeColor("sidebar-accent"),
          "accent-foreground": themeColor("sidebar-accent-foreground"),
          border: themeColor("sidebar-border"),
          ring: themeColor("sidebar-ring"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Tailwind 4 names the shadcn components use.
      ringWidth: { 3: "3px" },
      boxShadow: { xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
      backdropBlur: { xs: "4px" },
    },
  },
  plugins: [
    tailwindcssAnimate,
    plugin(({ addUtilities, addVariant }) => {
      // Tailwind 4 variants; Radix marks open and closed with data-state.
      addVariant("data-open", '&[data-state="open"]');
      addVariant("data-closed", '&[data-state="closed"]');
      addVariant("supports-backdrop-filter", "@supports (backdrop-filter: blur(0))");
      addUtilities({ ".outline-hidden": { outline: "2px solid transparent", "outline-offset": "2px" } });
    }),
  ],
};

export default config;
