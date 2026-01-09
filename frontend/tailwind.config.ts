import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // We can add specific brand overrides here if strictly needed, 
                // but broadly we will use standard Tailwind colors (zinc, indigo, etc)
            },
        },
    },
    plugins: [],
};
export default config;
