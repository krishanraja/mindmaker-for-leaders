import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
      screens: {
        'xs': '475px',
      },
      fontFamily: {
        // Option E is the product-wide canon. Legacy utility names remain as
        // compatibility aliases, but they now resolve to optical cuts of the
        // same Segoe Variable family instead of introducing another voice.
        sans: ['var(--font-ctrl-text)'],
        gobold: ['var(--font-ctrl-display)'],
        grotesk: ['var(--font-ctrl-display)'],
        display: ['var(--font-ctrl-display)'],
        mono: ['var(--font-ctrl-system)'],
      },
      colors: {
        // Core brand colors
        ink: "hsl(var(--ink))",
        mint: "hsl(var(--mint))",
        "off-white": "hsl(var(--off-white))",
        "light-grey": "hsl(var(--light-grey))",
        "mid-grey": "hsl(var(--mid-grey))",
        graphite: "hsl(var(--graphite))",
        
        // Semantic mappings
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "collapsible-down": {
          from: {
            height: "0",
            opacity: "0",
          },
          to: {
            height: "var(--radix-collapsible-content-height)",
            opacity: "1",
          },
        },
        "collapsible-up": {
          from: {
            height: "var(--radix-collapsible-content-height)",
            opacity: "1",
          },
          to: {
            height: "0",
            opacity: "0",
          },
        },
        // The "works with" wall under the hero. The track holds its list twice,
        // so travelling exactly half its width lands back on an identical frame
        // and the loop has no seam.
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        },
        "shimmer": {
          "0%, 90%, 100%": {
            "background-position": "calc(-100% - 100px) 0"
          },
          "30%, 60%": {
            "background-position": "calc(100% + 100px) 0"
          }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.3s ease-out",
        "collapsible-up": "collapsible-up 0.3s ease-out",
        "marquee": "marquee 38s linear infinite",
        "shimmer": "shimmer 8s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
