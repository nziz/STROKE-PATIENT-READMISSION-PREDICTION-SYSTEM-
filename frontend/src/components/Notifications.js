// frontend/src/components/Notifications.js
import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import {
    Box,
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Chip,
    Button,
    IconButton,
    Alert,
    CircularProgress,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Snackbar,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    NotificationsActive as NotificationsActiveIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    DoneAll as DoneAllIcon,
    Delete as DeleteIcon,
    Archive as ArchiveIcon,
    Unarchive as UnarchiveIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('unread');
    const [sort, setSort] = useState('-created_at');
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // ============================================================
    // FETCH NOTIFICATIONS (wrapped in useCallback)
    // ============================================================
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await API.get(`notifications/?status=${filter}&sort=${sort}`);
            setNotifications(response.data.notifications || []);
        } catch (err) {
            console.error('Fetch notifications error:', err);
            setError('Failed to load notifications. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [filter, sort]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ============================================================
    // MARK SINGLE AS READ
    // ============================================================
    const markAsRead = async (id) => {
        try {
            await API.post(`notification/${id}/read/`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setSnackbar({ open: true, message: 'Notification marked as read', severity: 'success' });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Failed to mark as read', severity: 'error' });
        }
    };

    // ============================================================
    // MARK ALL AS READ (with loading state)
    // ============================================================
    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.is_read && !n.is_archived);
        if (unread.length === 0) {
            setSnackbar({ open: true, message: 'No unread notifications to mark', severity: 'info' });
            return;
        }

        setActionLoading(true);
        try {
            // Use Promise.all for better performance
            await Promise.all(unread.map(n => API.post(`notification/${n.id}/read/`)));
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setSnackbar({ open: true, message: `${unread.length} notifications marked as read`, severity: 'success' });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Failed to mark all as read', severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // ============================================================
    // DELETE
    // ============================================================
    const deleteNotification = async (id) => {
        if (!window.confirm('Delete this notification?')) return;
        try {
            await API.post(`notification/${id}/delete/`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setSnackbar({ open: true, message: 'Notification deleted', severity: 'success' });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
        }
    };

    // ============================================================
    // ARCHIVE / UNARCHIVE
    // ============================================================
    const archiveNotification = async (id) => {
        try {
            await API.post(`notification/${id}/archive/`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_archived: true } : n)
            );
            setSnackbar({ open: true, message: 'Notification archived', severity: 'success' });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Failed to archive', severity: 'error' });
        }
    };

    const unarchiveNotification = async (id) => {
        try {
            await API.post(`notification/${id}/unarchive/`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_archived: false } : n)
            );
            setSnackbar({ open: true, message: 'Notification unarchived', severity: 'success' });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Failed to unarchive', severity: 'error' });
        }
    };

    // ============================================================
    // FILTER & SORT HANDLERS
    // ============================================================
    const handleFilterChange = (event, newFilter) => {
        if (newFilter !== null) setFilter(newFilter);
    };

    const handleSortChange = (event) => {
        setSort(event.target.value);
    };

    // ============================================================
    // HELPERS
    // ============================================================
    const getIcon = (msg) =>
        msg.includes('HIGH') || msg.includes('PANIC')
            ? <WarningIcon sx={{ color: '#dc2626' }} />
            : <NotificationsActiveIcon sx={{ color: '#2563eb' }} />;

    const getBg = (msg) =>
        msg.includes('HIGH') || msg.includes('PANIC') ? '#fef2f2' : '#eff6ff';

    const unreadCount = notifications.filter(n => !n.is_read && !n.is_archived).length;

    // ============================================================
    // STYLES
    // ============================================================
    const cardHoverSx = {
        borderRadius: 3,
        bgcolor: '#ffffff',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s ease',
        '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
            borderColor: '#d1d5db',
        },
    };

    const toggleBtnSx = {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.8rem',
        borderColor: '#e5e7eb',
        color: '#6b7280',
        '&.Mui-selected': {
            bgcolor: '#2563eb',
            color: '#ffffff',
            '&:hover': { bgcolor: '#1d4ed8' },
        },
        '&:hover': { bgcolor: '#f9fafb' },
    };

    // ============================================================
    // RENDER STATES
    // ============================================================
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ borderRadius: 2, fontWeight: 500 }} onClose={() => setError(null)}>
                {error}
            </Alert>
        );
    }

    // ============================================================
    // MAIN RENDER
    // ============================================================
    return (
        <Box>
            {/* HEADER */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        Notifications
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5, fontWeight: 500 }}>
                        {unreadCount} unread · {notifications.filter(n => n.is_archived).length} archived · {notifications.length} total
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <ToggleButtonGroup
                        value={filter}
                        exclusive
                        onChange={handleFilterChange}
                        size="small"
                        sx={{
                            '& .MuiToggleButtonGroup-grouped': {
                                borderRadius: 2,
                                border: '1px solid #e5e7eb',
                                mx: 0.25,
                            },
                        }}
                    >
                        <ToggleButton value="unread" sx={toggleBtnSx}>Unread</ToggleButton>
                        <ToggleButton value="read" sx={toggleBtnSx}>Read</ToggleButton>
                        <ToggleButton value="archived" sx={toggleBtnSx}>Archived</ToggleButton>
                        <ToggleButton value="all" sx={toggleBtnSx}>All</ToggleButton>
                    </ToggleButtonGroup>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ color: '#6b7280' }}>Sort</InputLabel>
                        <Select
                            value={sort}
                            onChange={handleSortChange}
                            label="Sort"
                            sx={{
                                borderRadius: 2,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                            }}
                        >
                            <MenuItem value="-created_at">Newest First</MenuItem>
                            <MenuItem value="created_at">Oldest First</MenuItem>
                        </Select>
                    </FormControl>

                    {unreadCount > 0 && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <DoneAllIcon sx={{ fontSize: 18 }} />}
                            onClick={markAllAsRead}
                            disabled={actionLoading}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                borderColor: '#d1d5db',
                                color: '#374151',
                                px: 2,
                                py: 1,
                                '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                            }}
                        >
                            Mark All Read
                        </Button>
                    )}

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<NotificationsIcon sx={{ fontSize: 18 }} />}
                        onClick={fetchNotifications}
                        disabled={loading}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            borderColor: '#d1d5db',
                            color: '#374151',
                            px: 2,
                            py: 1,
                            '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                        }}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* NOTIFICATIONS LIST */}
            {notifications.length === 0 ? (
                <Paper
                    elevation={0}
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '1px solid #e5e7eb',
                        bgcolor: '#ffffff',
                    }}
                >
                    <NotificationsIcon sx={{ fontSize: 56, color: '#d1d5db', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ color: '#6b7280', fontWeight: 600, fontSize: '1.1rem' }}>
                        No notifications
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5, fontWeight: 500 }}>
                        {filter === 'unread' ? 'You have no unread notifications.' : 'No notifications match your filters.'}
                    </Typography>
                </Paper>
            ) : (
                <Card elevation={0} sx={cardHoverSx}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <List sx={{ py: 0 }}>
                            {notifications.map((n, index) => (
                                <React.Fragment key={n.id}>
                                    {index > 0 && <Divider sx={{ borderColor: '#f3f4f6' }} />}
                                    <ListItem
                                        sx={{
                                            py: 2,
                                            px: 3,
                                            bgcolor: !n.is_read && !n.is_archived ? getBg(n.message) : 'transparent',
                                            transition: '0.2s',
                                            '&:hover': { bgcolor: '#f9fafb' },
                                            borderBottom: 'none',
                                            flexWrap: { xs: 'wrap', md: 'nowrap' },
                                        }}
                                        secondaryAction={
                                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                {!n.is_read && !n.is_archived && (
                                                    <Button
                                                        size="small"
                                                        variant="text"
                                                        onClick={() => markAsRead(n.id)}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontWeight: 500,
                                                            color: '#2563eb',
                                                            borderRadius: 2,
                                                            minWidth: 70,
                                                            '&:hover': { bgcolor: '#eff6ff' },
                                                        }}
                                                    >
                                                        Mark Read
                                                    </Button>
                                                )}
                                                {!n.is_archived ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => archiveNotification(n.id)}
                                                        sx={{ color: '#9ca3af', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                                                    >
                                                        <ArchiveIcon fontSize="small" />
                                                    </IconButton>
                                                ) : (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => unarchiveNotification(n.id)}
                                                        sx={{ color: '#9ca3af', '&:hover': { color: '#16a34a', bgcolor: '#f0fdf4' } }}
                                                    >
                                                        <UnarchiveIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                                <IconButton
                                                    size="small"
                                                    onClick={() => deleteNotification(n.id)}
                                                    sx={{ color: '#9ca3af', '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' } }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        }
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            {n.is_read
                                                ? <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 22 }} />
                                                : getIcon(n.message)
                                            }
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography variant="body1" sx={{ fontWeight: n.is_read ? 400 : 600, color: '#111827', fontSize: '0.95rem' }}>
                                                        {n.patient_name || 'Unknown Patient'}
                                                    </Typography>
                                                    {!n.is_read && !n.is_archived && (
                                                        <Chip
                                                            label="Unread"
                                                            size="small"
                                                            sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 600, borderRadius: 2, fontSize: '0.7rem' }}
                                                        />
                                                    )}
                                                    {n.is_archived && (
                                                        <Chip
                                                            label="Archived"
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ borderColor: '#d1d5db', color: '#6b7280', fontWeight: 500, borderRadius: 2, fontSize: '0.7rem' }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ mt: 0.5 }}>
                                                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                                        {n.message}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5, fontWeight: 500 }}>
                                                        {new Date(n.created_at).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
                action={
                    <IconButton size="small" color="inherit" onClick={() => setSnackbar({ ...snackbar, open: false })}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
                ContentProps={{
                    sx: {
                        borderRadius: 2,
                        bgcolor: snackbar.severity === 'error' ? '#dc2626' : snackbar.severity === 'info' ? '#2563eb' : '#16a34a',
                        fontWeight: 500,
                    }
                }}
            />
        </Box>
    );
}

export default Notifications;