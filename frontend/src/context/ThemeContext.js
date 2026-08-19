// frontend/src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export function useAppTheme() {
    return useContext(ThemeContext);
}

// ─── Custom color tokens ───
const tokens = {
    light: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        header: '#0d47a1',
        bg: '#f9fafb',
        cardBg: '#ffffff',
        cardBorder: '#e5e7eb',
        cardBorderHover: '#d1d5db',
        textPrimary: '#111827',
        textSecondary: '#374151',
        textMuted: '#6b7280',
        textCaption: '#9ca3af',
        divider: '#f3f4f6',
        inputBg: '#f9fafb',
        success: '#16a34a',
        warning: '#f59e0b',
        error: '#dc2626',
        info: '#2563eb',
        riskHigh: '#dc2626',
        riskMedium: '#f59e0b',
        riskLow: '#16a34a',
        riskHighBg: '#fef2f2',
        riskMediumBg: '#fffbeb',
        riskLowBg: '#f0fdf4',
        shadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
    },
    dark: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        header: '#60a5fa',
        bg: '#0f172a',
        cardBg: '#1e293b',
        cardBorder: '#334155',
        cardBorderHover: '#475569',
        textPrimary: '#f1f5f9',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        textCaption: '#64748b',
        divider: '#334155',
        inputBg: '#1e293b',
        success: '#22c55e',
        warning: '#fbbf24',
        error: '#ef4444',
        info: '#3b82f6',
        riskHigh: '#ef4444',
        riskMedium: '#fbbf24',
        riskLow: '#22c55e',
        riskHighBg: 'rgba(239,68,68,0.15)',
        riskMediumBg: 'rgba(251,191,36,0.15)',
        riskLowBg: 'rgba(34,197,94,0.15)',
        shadow: '0 12px 24px -8px rgba(0,0,0,0.4)',
    },
};

export function AppThemeProvider({ children }) {
    const [mode, setMode] = useState(() => {
        const saved = localStorage.getItem('theme_mode');
        return saved === 'dark' ? 'dark' : 'light';
    });

    useEffect(() => {
        localStorage.setItem('theme_mode', mode);
    }, [mode]);

    const toggleTheme = () => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const t = tokens[mode];

    const theme = useMemo(() => {
        return createTheme({
            palette: {
                mode,
                primary: {
                    main: t.primary,
                    dark: t.primaryHover,
                },
                success: { main: t.success },
                warning: { main: t.warning },
                error: { main: t.error },
                info: { main: t.info },
                background: {
                    default: t.bg,
                    paper: t.cardBg,
                },
                text: {
                    primary: t.textPrimary,
                    secondary: t.textSecondary,
                },
                divider: t.divider,
            },
            typography: {
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            },
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        body: {
                            backgroundColor: t.bg,
                            transition: 'background-color 0.3s ease',
                        },
                    },
                },
                MuiCard: {
                    styleOverrides: {
                        root: {
                            backgroundColor: t.cardBg,
                            border: `1px solid ${t.cardBorder}`,
                            borderRadius: 12,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-3px)',
                                boxShadow: t.shadow,
                                borderColor: t.cardBorderHover,
                            },
                        },
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            textTransform: 'none',
                            fontWeight: 500,
                        },
                    },
                },
                MuiOutlinedInput: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            backgroundColor: t.inputBg,
                            '& fieldset': {
                                borderColor: t.cardBorder,
                            },
                            '&:hover fieldset': {
                                borderColor: t.cardBorderHover,
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: t.primary,
                            },
                        },
                    },
                },
                MuiChip: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            fontWeight: 600,
                        },
                    },
                },
                MuiDialog: {
                    styleOverrides: {
                        paper: {
                            borderRadius: 12,
                            border: `1px solid ${t.cardBorder}`,
                            backgroundColor: t.cardBg,
                        },
                    },
                },
                MuiTableHead: {
                    styleOverrides: {
                        root: {
                            backgroundColor: mode === 'light' ? '#f9fafb' : '#1e293b',
                        },
                    },
                },
                MuiTableCell: {
                    styleOverrides: {
                        root: {
                            borderBottom: `1px solid ${t.divider}`,
                        },
                    },
                },
                MuiAlert: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                            fontWeight: 500,
                        },
                    },
                },
                MuiSwitch: {
                    styleOverrides: {
                        switchBase: {
                            '&.Mui-checked': {
                                color: t.primary,
                            },
                            '&.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: t.primary,
                            },
                        },
                    },
                },
            },
        });
    }, [mode, t]);

    const value = useMemo(() => ({ mode, toggleTheme, tokens: t }), [mode, t]);

    return (
        <ThemeContext.Provider value={value}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}
