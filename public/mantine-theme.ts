import { MantineTheme, createTheme } from '@mantine/core';

export const shekinahTheme: MantineTheme = createTheme({
  colors: {
    shekinah: [
      '#eff6ff',
      '#dbeafe',
      '#bfdbfe',
      '#93c5fd',
      '#60a5fa',
      '#3b82f6',
      '#2563eb',
      '#1d4ed8',
      '#1e40af',
      '#1e3a8a',
      '#172554',
    ],
    emerald: [
      '#d1fae5',
      '#a7f3d0',
      '#6ee7b7',
      '#34d399',
      '#10b981',
      '#059669',
      '#047857',
      '#065f46',
      '#064e3b',
      '#022c22',
    ]
  },
  primaryColor: 'shekinah',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2.5rem', fontWeight: '700', lineHeight: 1.2 },
      h2: { fontSize: '2rem', fontWeight: '600', lineHeight: 1.3 },
      h3: { fontSize: '1.5rem', fontWeight: '600', lineHeight: 1.4 },
    }
  },
  components: {
    Button: {
      defaultProps: {
        variant: 'gradient',
        gradient: { from: 'blue', to: 'cyan' }
      },
      styles: (theme) => ({
        root: {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows.md,
          },
          transition: 'all 0.2s ease',
        }
      })
    },
    Card: {
      styles: (theme) => ({
        root: {
          boxShadow: theme.shadows.sm,
          '&:hover': {
            boxShadow: theme.shadows.md,
          },
          transition: 'box-shadow 0.2s ease',
        }
      })
    },
    Modal: {
      styles: (theme) => ({
        content: {
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadows.xl,
        }
      })
    },
    Notification: {
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.md,
          boxShadow: theme.shadows.lg,
        }
      })
    },
    TextInput: {
      styles: (theme) => ({
        input: {
          '&:focus': {
            borderColor: theme.colors.shekinah[6],
          }
        }
      })
    },
    Textarea: {
      styles: (theme) => ({
        input: {
          '&:focus': {
            borderColor: theme.colors.shekinah[6],
          }
        }
      })
    }
  },
  defaultRadius: 'md',
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  shadows: {
    shekinah: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
  }
});

export const darkTheme = createTheme({
  ...shekinahTheme,
  colors: {
    ...shekinahTheme.colors,
    dark: [
      '#C1C2C5',
      '#A8A9AD',
      '#8C8D91',
      '#73757A',
      '#5A5B5E',
      '#424449',
      '#2B2D33',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  primaryColor: 'shekinah',
  backgroundColor: '#1A1B1E',
  color: '#C1C2C5',
});
