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
      colors: {
        croqui: {
          sheet: "rgb(var(--croqui-sheet) / <alpha-value>)",
          ink: "rgb(var(--croqui-ink) / <alpha-value>)",
          soft: "rgb(var(--croqui-soft) / <alpha-value>)",
          rule: "rgb(var(--croqui-rule) / <alpha-value>)",
          faint: "rgb(var(--croqui-faint) / <alpha-value>)",
          red: "rgb(var(--croqui-red) / <alpha-value>)",
          "red-text": "rgb(var(--croqui-red-text) / <alpha-value>)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Acao primaria (platina/cromo). Separada de `primary`, que continua
        // sendo o azul informativo usado em ~112 icones e destaques.
        action: {
          DEFAULT: "hsl(var(--action))",
          foreground: "hsl(var(--action-foreground))",
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
        // Semantic colors for chat
        bot: {
          DEFAULT: "hsl(var(--bot))",
          foreground: "hsl(var(--bot-foreground))",
        },
        human: {
          DEFAULT: "hsl(var(--human))",
          foreground: "hsl(var(--human-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        posvenda: "hsl(var(--posvenda))",
        bubble: {
          agent: "hsl(var(--bubble-agent))",
          posvenda: "hsl(var(--bubble-posvenda))",
          human: "hsl(var(--bubble-human))",
          customer: "hsl(var(--bubble-customer))",
        },
        // Paleta de series dos graficos, validada para daltonismo e
        // contraste nos dois temas. Ler daqui evita re-render ao trocar tema.
        series: {
          1: "hsl(var(--series-1))",
          2: "hsl(var(--series-2))",
          3: "hsl(var(--series-3))",
          4: "hsl(var(--series-4))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 2px)",
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "calc(var(--radius) / 2)",
      },
      fontSize: {
        // Degrau que faltava: o painel usava 9, 10 e 11px avulsos para rotulo,
        // horario e contador. Tudo isso converge aqui — 11px e o piso legivel
        // no celular, e abaixo disso o texto vira decoracao.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      fontFamily: {
        sans: ["Barlow", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        croqui: ["Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        "croqui-num": ['"Barlow Semi Condensed"', "Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hairline: "var(--hairline)",
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
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
        // Aurora do login. So `transform`, e so nessa rota — nao existe
        // nenhuma animacao continua dentro do painel de trabalho.
        drift1: { "50%": { transform: "translate3d(16%, 10%, 0) scale(1.15)" } },
        drift2: { "50%": { transform: "translate3d(-14%, 14%, 0) scale(0.88)" } },
        drift3: { "50%": { transform: "translate3d(10%, -12%, 0) scale(1.12)" } },
        // O brilho da marca roda uma unica vez, no carregamento do login.
        markglint: {
          from: { filter: "brightness(1)" },
          "45%": { filter: "brightness(1.5)" },
          to: { filter: "brightness(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
