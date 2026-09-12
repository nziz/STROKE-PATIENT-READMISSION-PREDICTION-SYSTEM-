// frontend/src/components/Layout.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import { useAppTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import {
    Box, Drawer, AppBar, Toolbar, List, Typography, Divider,
    IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Badge, Tooltip, Button
} from '@mui/material';
import {
    Dashboard as DashboardIcon, People as PeopleIcon, Assignment as AssignmentIcon,
    Notifications as NotificationsIcon, Person as PersonIcon, Logout as LogoutIcon,
    Menu as MenuIcon, MenuOpen as MenuOpenIcon, MedicalServices as MedicalIcon, 
    PersonAdd as PersonAddIcon, CalendarToday as CalendarTodayIcon, Search as SearchIcon
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 88;

function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { mode } = useAppTheme();
    const isDark = mode === 'dark';

    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false); // NEW: Sidebar collapse state
    const [notificationCount, setNotificationCount] = useState(0);
    const isMounted = useRef(true);

    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    const userRole = userData?.role || 'doctor';
    const userName = userData?.name || 'Dr. Octave';
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'DO';

    const currentWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

        const allMenuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/', role: 'doctor' },
        { text: 'Search Directory', icon: <SearchIcon />, path: '/patients/search', role: 'doctor' },
        { text: 'Report Summary', icon: <AssignmentIcon />, path: '/reports-summary', role: 'doctor' },
        { text: 'Appointments', icon: <CalendarTodayIcon />, path: '/doctor-appointments', role: 'doctor' },
        { text: 'Register Patient', icon: <PersonAddIcon />, path: '/register', role: 'doctor' }, // ADDED BACK
        { text: 'User Management', icon: <PeopleIcon />, path: '/user-management', role: 'doctor' }, // ADDED BACK
        { text: 'My Health', icon: <DashboardIcon />, path: '/patient-dashboard', role: 'patient' },
        { text: 'Daily Reports', icon: <AssignmentIcon />, path: '/reports', role: 'patient' },
        { text: 'My Appointments', icon: <CalendarTodayIcon />, path: '/appointments', role: 'patient' },
        { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', role: 'doctor' },
        { text: 'Profile', icon: <PersonIcon />, path: '/profile', role: 'all' },
    ];

    const menuItems = allMenuItems.filter(item => item.role === 'all' || item.role === userRole);

    const fetchNotificationCount = useCallback(async () => {
        if (userRole !== 'doctor' || !isMounted.current) return;
        try {
            const response = await API.get('notifications/');
            if (isMounted.current) {
                const unread = response.data?.notifications?.filter(n => !n.is_read) || [];
                setNotificationCount(unread.length);
            }
        } catch (error) { if (isMounted.current) setNotificationCount(0); }
    }, [userRole]);

    useEffect(() => {
        isMounted.current = true;
        if (userRole === 'doctor') {
            fetchNotificationCount();
            const intervalId = setInterval(fetchNotificationCount, 60000);
            return () => { isMounted.current = false; clearInterval(intervalId); };
        }
        return () => { isMounted.current = false; };
    }, [userRole, fetchNotificationCount]);

    const handleLogout = async () => {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('tab_session');
        API.post('logout/').catch(err => console.error('Logout error:', err));
        window.location.href = '/login';
    };

    const isActive = (path) => location.pathname === path;

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', transition: 'width 0.3s ease' }}>
            {/* Logo & Toggle */}
            <Box sx={{ p: collapsed ? 1.5 : 3, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 2, minHeight: 80 }}>
                {!collapsed && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1, display: 'flex' }}>
                            <MedicalIcon sx={{ fontSize: 22, color: '#fff' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? 'primary.light' : '#0d47a1', fontSize: '1rem' }}>
                            StrokeReadmit
                        </Typography>
                    </Box>
                )}
                <IconButton onClick={() => setCollapsed(!collapsed)} sx={{ color: 'text.secondary' }}>
                    {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
                </IconButton>
            </Box>
            
            {!collapsed && <Divider sx={{ mx: 2, borderColor: 'divider' }} />}

            {/* User Snippet */}
            {!collapsed && (
                <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', color: 'primary.main', width: 40, height: 40, fontWeight: 700, fontSize: '0.9rem' }}>
                        {userInitials}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {userName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            {userRole === 'doctor' ? 'Neurology' : 'Patient'}
                        </Typography>
                    </Box>
                </Box>
            )}
            {!collapsed && <Divider sx={{ mx: 2, borderColor: 'divider' }} />}

            {/* Navigation */}
            <List sx={{ flex: 1, pt: 2, px: collapsed ? 1 : 2 }}>
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    const isNotifications = item.text === 'Notifications';
                    const buttonContent = (
                        <ListItemButton
                            key={item.text}
                            onClick={() => { navigate(item.path); setMobileOpen(false); }}
                            sx={{
                                borderRadius: 2, py: 1.2, px: collapsed ? 0 : 1.5,
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                bgcolor: active ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'transparent',
                                color: active ? 'primary.main' : 'text.secondary',
                                '&:hover': { bgcolor: active ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'action.hover' },
                                mb: 0.75,
                            }}
                        >
                            <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.disabled', minWidth: collapsed ? 'auto' : 38, justifyContent: 'center' }}>
                                {isNotifications && notificationCount > 0 ? (
                                    <Badge badgeContent={notificationCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 18, minWidth: 18 } }}>
                                        {item.icon}
                                    </Badge>
                                ) : (item.icon)}
                            </ListItemIcon>
                            {!collapsed && (
                                <ListItemText primary={item.text} slotProps={{ primary: { fontSize: '0.85rem', fontWeight: active ? 600 : 500, color: active ? 'primary.main' : 'text.primary' } }} />
                            )}
                        </ListItemButton>
                    );
                    return collapsed ? <Tooltip title={item.text} placement="right" key={item.text}>{buttonContent}</Tooltip> : buttonContent;
                })}
            </List>

            <Divider sx={{ mx: 2, borderColor: 'divider' }} />
            
            {/* Logout */}
            <Box sx={{ p: collapsed ? 1 : 2, mt: 'auto' }}>
                <Tooltip title={collapsed ? "Logout" : ""} placement="right">
                    <Button
                        variant={collapsed ? "text" : "outlined"}
                        color="error"
                        startIcon={!collapsed && <LogoutIcon />}
                        onClick={handleLogout}
                        fullWidth
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1.2, borderColor: isDark ? 'rgba(239,68,68,0.4)' : '#fecaca', justifyContent: collapsed ? 'center' : 'center' }}
                    >
                        {collapsed ? <LogoutIcon /> : 'Logout'}
                    </Button>
                </Tooltip>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" elevation={0} sx={{ width: { sm: `calc(100% - ${currentWidth}px)` }, ml: { sm: `${currentWidth}px` }, bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'width 0.3s ease, margin 0.3s ease' }}>
                <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>
                    <IconButton onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { sm: 'none' }, color: 'text.primary' }}><MenuIcon /></IconButton>
                    <Box />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ThemeToggle showLabel={false} />
                        {userRole === 'doctor' && (
                            <IconButton onClick={() => navigate('/notifications')} sx={{ color: 'text.secondary' }}>
                                <Badge badgeContent={notificationCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 18, minWidth: 18 } }}><NotificationsIcon /></Badge>
                            </IconButton>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: currentWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s ease' }}>
                <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper' } }}>
                    {drawer}
                </Drawer>
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: currentWidth, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider', boxShadow: 'none', overflowX: 'hidden', transition: 'width 0.3s ease' } }}>
                    {drawer}
                </Drawer>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, width: { sm: `calc(100% - ${currentWidth}px)` }, mt: 8, bgcolor: 'background.default', minHeight: '100vh', transition: 'width 0.3s ease' }}>
                {children}
            </Box>
        </Box>
    );
}

export default Layout;