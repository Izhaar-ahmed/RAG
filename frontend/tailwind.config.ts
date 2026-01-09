import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds
                'bg-deepest': 'var(--bg-deepest)',
                'bg-primary': 'var(--bg-primary)',
                'bg-secondary': 'var(--bg-secondary)',
                'bg-tertiary': 'var(--bg-tertiary)',
                'bg-elevated': 'var(--bg-elevated)',
                'bg-hover': 'var(--bg-hover)',

                // Borders
                'border-subtle': 'var(--border-subtle)',
                'border-default': 'var(--border-default)',
                'border-strong': 'var(--border-strong)',

                // Accents
                'accent-indigo': 'var(--accent-indigo)',
                'accent-purple': 'var(--accent-purple)',
                'accent-cyan': 'var(--accent-cyan)',
                'accent-emerald': 'var(--accent-emerald)',
                'accent-rose': 'var(--accent-rose)',
                'accent-amber': 'var(--accent-amber)',
            },
            backgroundImage: {
                'gradient-premium': 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple), var(--accent-cyan))',
                'gradient-card': 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.05))',
            },
            boxShadow: {
                'glow-indigo': '0 0 20px var(--glow-indigo)',
                'glow-purple': '0 0 20px var(--glow-purple)',
                'glow-cyan': '0 0 20px var(--glow-cyan)',
                'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
        },
    },
    plugins: [],
};

export default config;
