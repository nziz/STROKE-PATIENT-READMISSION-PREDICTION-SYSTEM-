// frontend/src/components/ThemeToggle.js
import React from 'react';
import { IconButton, Tooltip, Box, Typography } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import { useAppTheme } from '../context/ThemeContext';

function ThemeToggle({ showLabel = false }) {
    const { mode, toggleTheme } = useAppTheme();
    const isDark = mode === 'dark';

    return (
        <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    borderRadius: 2,
                    px: showLabel ? 1.5 : 0.5,
                    py: 0.5,
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={toggleTheme}
            >
                <IconButton
                    size="small"
                    sx={{
                        color: isDark ? '#fbbf24' : '#f59e0b',
                        transition: 'transform 0.3s ease, color 0.3s ease',
                        transform: isDark ? 'rotate(-20deg)' : 'rotate(0deg)',
                    }}
                >
                    {isDark ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
                </IconButton>
                {showLabel && (
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                        {isDark ? 'Dark' : 'Light'}
                    </Typography>
                )}
            </Box>
        </Tooltip>
    );
}

export default ThemeToggle;
