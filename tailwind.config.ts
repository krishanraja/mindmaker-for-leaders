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
				display: ['Inter', 'system-ui', 'sans-serif'],
				heading: ['Inter', 'system-ui', 'sans-serif'], 
				body: ['Inter', 'system-ui', 'sans-serif'],
				caption: ['Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
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
					secondary: "hsl(var(--accent-secondary))",
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
				hero: {
					text: "hsl(var(--hero-text))",
					"text-muted": "hsl(var(--hero-text-muted))",
					"text-secondary": "hsl(var(--hero-text-secondary))",
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
				purple: "var(--shadow-purple)",
				'purple-lg': "var(--shadow-purple-lg)",
			},
			spacing: {
				18: "4.5rem",
				88: "22rem",
				128: "32rem",
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
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
