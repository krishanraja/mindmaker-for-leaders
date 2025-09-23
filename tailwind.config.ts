import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				display: ['Outfit', 'system-ui', 'sans-serif'],
				heading: ['Outfit', 'system-ui', 'sans-serif'], 
				body: ['Inter', 'system-ui', 'sans-serif'],
				caption: ['Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
				// Standard colors that Tailwind utilities depend on
				white: "#ffffff",
				black: "#000000",
				transparent: "transparent",
				current: "currentColor",
				red: {
					50: "#fef2f2",
					500: "#ef4444",
					600: "#dc2626",
				},
				blue: {
					50: "#eff6ff",
					500: "#3b82f6",
					600: "#2563eb",
					700: "#1d4ed8",
				},
				purple: {
					50: "#faf5ff",
					500: "#a855f7",
					600: "#9333ea",
					700: "#7c3aed",
				},
				gray: {
					50: "#f9fafb",
					100: "#f3f4f6",
					200: "#e5e7eb",
					300: "#d1d5db",
					400: "#9ca3af",
					500: "#6b7280",
					600: "#4b5563",
					700: "#374151",
					800: "#1f2937",
					900: "#111827",
				},
				primary: {
					DEFAULT: "hsl(var(--primary))",
					100: "hsl(var(--primary-100))",
					200: "hsl(var(--primary-200))",
					400: "hsl(var(--primary-400))",
					600: "hsl(var(--primary-600))",
					foreground: "hsl(var(--primary-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					400: "hsl(var(--accent-400))",
					foreground: "hsl(var(--accent-foreground))",
				},
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				// Shadcn compatibility
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				DEFAULT: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
				"2xl": "1rem",
				"3xl": "1.5rem",
				lg: "var(--radius-lg)",
			},
			boxShadow: {
				sm: "var(--shadow-sm)",
				md: "var(--shadow-md)",
				lg: "var(--shadow-lg)",
				elegant: "var(--shadow-elegant)",
				glow: "var(--shadow-glow)",
			},
			spacing: {
				18: "4.5rem",
				88: "22rem",
				128: "32rem",
				// Mobile-optimized spacing
				"safe-4": "max(1rem, env(safe-area-inset-top))",
				"safe-5": "max(1.25rem, env(safe-area-inset-top))",
				"safe-6": "max(1.5rem, env(safe-area-inset-top))",
			},
			fontSize: {
				// Mobile-optimized typography scale
				'mobile-xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
				'mobile-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
				'mobile-base': ['0.875rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
				'mobile-lg': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
				'mobile-xl': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
				'mobile-2xl': ['1.25rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }],
				'mobile-3xl': ['1.5rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			boxShadow: {
				'lg': 'var(--shadow-lg)',
				'elegant': 'var(--shadow-elegant)',
				'purple': 'var(--shadow-purple)',
				'purple-lg': 'var(--shadow-purple-lg)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
