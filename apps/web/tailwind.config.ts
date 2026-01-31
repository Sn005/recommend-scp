import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/shared/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // プライマリカラー（design-tokens.cssより）
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "#60A5FA", // blue-400
          dark: "#2563EB", // blue-600
        },
        // 背景色
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // オブジェクトクラスカラー
        scp: {
          safe: "#10B981", // emerald-500
          euclid: "#F59E0B", // amber-500
          keter: "#EF4444", // red-500
          thaumiel: "#8B5CF6", // violet-500
          neutralized: "#6B7280", // gray-500
        },
        // お気に入り
        favorite: {
          DEFAULT: "#EF4444", // red-500
          outline: "#6B7280", // gray-500
        },
        // Shadcn/UI互換
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
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
      fontFamily: {
        sans: ["Hiragino Kaku Gothic Pro", "ヒラギノ角ゴ Pro W3", "Meiryo", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "heart-pop": "heartPop 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        heartPop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.06)",
        "card-active": "0 1px 2px rgba(0, 0, 0, 0.04)",
        glass: "0 4px 24px rgba(0, 0, 0, 0.12)",
        "glass-button": "0 2px 8px rgba(0, 0, 0, 0.08)",
        drawer: "4px 0 30px rgba(0, 0, 0, 0.2)",
      },
      backdropBlur: {
        glass: "20px",
        "glass-button": "12px",
      },
      zIndex: {
        base: "0",
        dropdown: "10",
        sticky: "20",
        fixed: "30",
        "progress-bar": "40",
        nav: "50",
        "drawer-overlay": "100",
        drawer: "101",
        modal: "200",
        toast: "300",
      },
    },
  },
  plugins: [],
};

export default config;
