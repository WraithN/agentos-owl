import tailwindAnimate from 'tailwindcss-animate';
import containerQuery from '@tailwindcss/container-queries';
import intersect from 'tailwindcss-intersect';

export default {
    darkMode: ['class'],
    content: [
        './index.html',
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        '../../packages/chat/src/**/*.{ts,tsx}',
        '../../packages/core/src/**/*.{ts,tsx}',
        '../../packages/knowledge/src/**/*.{ts,tsx}',
        '../../packages/tools/src/**/*.{ts,tsx}',
        '../../packages/workflow/src/**/*.{ts,tsx}',
        './node_modules/streamdown/dist/**/*.js'
    ],
    safelist: ['border', 'border-border'],
    prefix: '',
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: { '2xl': '1400px' }
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                success: 'hsl(var(--success))',
                warning: 'hsl(var(--warning))',
                info: 'hsl(var(--info))',
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    background: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                },
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                }
            },
            fontFamily: {
                sans: ['Inter', 'Noto Sans SC', 'Noto Sans CJK SC', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Noto Sans SC', 'monospace'],
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            backgroundImage: {
                'gradient-aurora': 'linear-gradient(135deg, #00f2c3 0%, #38bdf8 50%, #7c3aed 100%)',
                'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                'gradient-space': 'radial-gradient(ellipse at top, #042f2e 0%, #020617 60%)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'fade-in': {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                'slide-in-left': {
                    from: { opacity: '0', transform: 'translateX(-20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' }
                },
                'slide-in-right': {
                    from: { opacity: '0', transform: 'translateX(20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' }
                },
                'aurora-flow': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                'breath-glow': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.35)' },
                    '50%': { boxShadow: '0 0 0 10px rgba(245, 158, 11, 0)' },
                },
                'bounce-dot': {
                    '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.5' },
                    '40%': { transform: 'scale(1)', opacity: '1' },
                },
                'thinking-bounce': {
                    '0%, 80%, 100%': { transform: 'translateY(0)' },
                    '40%': { transform: 'translateY(-5px)' },
                },
                'agent-glow': {
                    '0%, 100%': { transform: 'scale(1.01)', opacity: '0.15' },
                    '50%': { transform: 'scale(1.05)', opacity: '0.4' },
                },
                'agent-border-glow': {
                    '0%, 100%': { boxShadow: '0 0 4px rgba(34, 197, 94, 0.25)' },
                    '50%': { boxShadow: '0 0 12px rgba(34, 197, 94, 0.55)' },
                },
                'message-glow': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.15)' },
                    '50%': { boxShadow: '0 0 20px 2px rgba(34, 197, 94, 0.3)' },
                },
                'agent-dot-pulse': {
                    '0%, 100%': { boxShadow: '0 0 4px rgba(34, 197, 94, 0.6)' },
                    '50%': { boxShadow: '0 0 10px rgba(34, 197, 94, 0.9)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16,1,0.3,1)',
                'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)',
                'aurora-flow': 'aurora-flow 15s ease infinite',
                'breath-glow': 'breath-glow 2.5s ease-in-out infinite',
                'bounce-dot-1': 'bounce-dot 1.4s infinite ease-in-out',
                'bounce-dot-2': 'bounce-dot 1.4s infinite ease-in-out 0.2s',
                'bounce-dot-3': 'bounce-dot 1.4s infinite ease-in-out 0.4s',
                'thinking-1': 'thinking-bounce 1.2s infinite ease-in-out',
                'thinking-2': 'thinking-bounce 1.2s infinite ease-in-out 0.15s',
                'thinking-3': 'thinking-bounce 1.2s infinite ease-in-out 0.3s',
                'agent-glow': 'agent-glow 2s ease-in-out infinite',
                'agent-border-glow': 'agent-border-glow 2s ease-in-out infinite',
                'message-glow': 'message-glow 2.5s ease-in-out infinite',
                'agent-dot-pulse': 'agent-dot-pulse 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
            }
        }
    },
    plugins: [
        tailwindAnimate,
        containerQuery,
        intersect,
        function ({addUtilities}) {
            addUtilities({
                '.border-t-solid': {'border-top-style': 'solid'},
                '.border-r-solid': {'border-right-style': 'solid'},
                '.border-b-solid': {'border-bottom-style': 'solid'},
                '.border-l-solid': {'border-left-style': 'solid'},
            }, ['responsive']);
        },
    ],
};


