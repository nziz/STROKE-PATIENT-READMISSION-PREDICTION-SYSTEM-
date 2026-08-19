// frontend/src/components/Layout.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import { useAppTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import {
    Box, Drawer, AppBar, Toolbar, List, Typography, Divider,
    IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Badge,
} from '@mui/material';
import {
    Dashboard as DashboardIcon, People as PeopleIcon, Assignment as AssignmentIcon,
    Notifications as NotificationsIcon, Person as PersonIcon, Logout as LogoutIcon,
    Menu as MenuIcon, MedicalServices as MedicalIcon, PersonAdd as PersonAddIcon,
    CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { mode, tokens } = useAppTheme();
    const isDark = mode === 'dark';

    const [mobileOpen, setMobileOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const isMounted = useRef(true);

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = userData?.role || 'doctor';
    const userName = userData?.name || 'Dr. Octave';
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'DO';

    const allMenuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/', role: 'doctor' },
        { text: 'Patients', icon: <PeopleIcon />, path: '/patients', role: 'doctor' },
        { text: 'Register Patient', icon: <PersonAddIcon />, path: '/register', role: 'doctor' },
        { text: 'Appointments', icon: <CalendarTodayIcon />, path: '/doctor-appointments', role: 'doctor' },
        { text: 'Report Summary', icon: <AssignmentIcon />, path: '/reports-summary', role: 'doctor' },
        { text: 'My Health', icon: <DashboardIcon />, path: '/patient-dashboard', role: 'patient' },
        { text: 'My Appointments', icon: <CalendarTodayIcon />, path: '/appointments', role: 'patient' },
        { text: 'Daily Reports', icon: <AssignmentIcon />, path: '/reports', role: 'patient' },
        { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', role: 'doctor' },
        { text: 'Profile', icon: <PersonIcon />, path: '/profile', role: 'all' },
        { text: 'User Management', icon: <PeopleIcon />, path: '/user-management', role: 'doctor' },
    ];

    const menuItems = allMenuItems.filter(item => item.role === 'all' || item.role === userRole);

    // ============================================================
    // FETCH NOTIFICATION COUNT (with mounted check)
    // ============================================================
    const fetchNotificationCount = useCallback(async () => {
        // Only fetch if user is a doctor AND component is mounted
        if (userRole !== 'doctor' || !isMounted.current) return;

        try {
            const response = await API.get('notifications/');
            if (isMounted.current) {
                const unread = response.data?.notifications?.filter(n => !n.is_read) || [];
                setNotificationCount(unread.length);
            }
        } catch (error) {
            // Silently handle 403/other errors – no need to show anything
            if (isMounted.current) {
                setNotificationCount(0);
            }
        }
    }, [userRole]);

    // ============================================================
    // EFFECT: Set up notification polling
    // ============================================================
    useEffect(() => {
        isMounted.current = true;

        if (userRole === 'doctor') {
            // Initial fetch
            fetchNotificationCount();

            // Poll every 60 seconds
            const intervalId = setInterval(fetchNotificationCount, 60000);

            return () => {
                isMounted.current = false;
                clearInterval(intervalId);
            };
        }

        return () => {
            isMounted.current = false;
        };
    }, [userRole, fetchNotificationCount]);

    // ============================================================
    // HANDLERS
    // ============================================================
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleNotificationClick = () => navigate('/notifications');

    const handleLogout = async () => {
        try {
            await API.post('logout/');
        } catch (err) {
            console.error('Logout error:', err);
        }
        localStorage.removeItem('user');
        navigate('/login');
        // Remove window.location.reload() to prevent flash/loop
    };

    const isActive = (path) => location.pathname === path;

    // ============================================================
    // DRAWER CONTENT
    // ============================================================
    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
            {/* Logo */}
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1.2, display: 'flex' }}>
                    <MedicalIcon sx={{ fontSize: 26, color: '#fff' }} />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? 'primary.light' : '#0d47a1', lineHeight: 1.2, fontSize: '1.1rem' }}>
                        StrokeReadmit
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em' }}>
                        PREDICTION SYSTEM
                    </Typography>
                </Box>
            </Box>
            <Divider sx={{ mx: 2, borderColor: 'divider' }} />

            {/* User Profile Snippet */}
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', color: 'primary.main', width: 42, height: 42, fontWeight: 700, fontSize: '0.9rem' }}>
                    {userInitials}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {userName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        {userRole === 'doctor' ? 'Neurology Department' : 'Patient'}
                    </Typography>
                </Box>
            </Box>
            <Divider sx={{ mx: 2, borderColor: 'divider' }} />

            {/* Navigation */}
            <List sx={{ flex: 1, pt: 2, px: 2 }}>
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    const isNotifications = item.text === 'Notifications';
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.75 }}>
                            <ListItemButton
                                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                                sx={{
                                    borderRadius: 2,
                                    py: 1.1,
                                    px: 1.5,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    bgcolor: active ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'transparent',
                                    color: active ? 'primary.main' : 'text.secondary',
                                    '&:hover': { bgcolor: active ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'action.hover' },
                                    transition: 'all 0.15s ease',
                                    ...(active && {
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: '20%',
                                            bottom: '20%',
                                            width: 3,
                                            borderRadius: '0 4px 4px 0',
                                            bgcolor: 'primary.main',
                                        },
                                    }),
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: active ? 'primary.main' : 'text.disabled',
                                        minWidth: 38,
                                        transition: 'color 0.15s',
                                    }}
                                >
                                    {isNotifications && notificationCount > 0 ? (
                                        <Badge badgeContent={notificationCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 18, minWidth: 18 } }}>
                                            {item.icon}
                                        </Badge>
                                    ) : (
                                        item.icon
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    slotProps={{
                                        primary: {
                                            fontSize: '0.85rem',
                                            fontWeight: active ? 600 : 500,
                                            color: active ? 'primary.main' : 'text.primary',
                                        },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            <Divider sx={{ mx: 2, borderColor: 'divider' }} />

            {/* Logout */}
            <List sx={{ pb: 2, px: 2 }}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            borderRadius: 2,
                            py: 1.1,
                            px: 1.5,
                            color: 'error.main',
                            '&:hover': { bgcolor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2' },
                        }}
                    >
                        <ListItemIcon sx={{ color: 'error.main', minWidth: 38 }}>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary="Logout"
                            slotProps={{
                                primary: {
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                },
                            }}
                        />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    // ============================================================
    // MAIN RENDER
    // ============================================================
    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>
                    <IconButton onClick={handleDrawerToggle} sx={{ display: { sm: 'none' }, color: 'text.primary' }}>
                        <MenuIcon />
                    </IconButton>
                    <Box />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ThemeToggle showLabel={false} />
                        {userRole === 'doctor' && (
                            <IconButton onClick={handleNotificationClick} sx={{ color: 'text.secondary' }}>
                                <Badge badgeContent={notificationCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 18, minWidth: 18 } }}>
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        )}
                        <Avatar sx={{ width: 34, height: 34, bgcolor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', color: 'primary.main', fontSize: '0.8rem', fontWeight: 700 }}>
                            {userInitials}
                        </Avatar>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            boxShadow: 'none',
                            bgcolor: 'background.paper',
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            bgcolor: 'background.paper',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            boxShadow: 'none',
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3, md: 4 },
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: 8,
                    bgcolor: 'background.default',
                    minHeight: '100vh',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

export default Layout;