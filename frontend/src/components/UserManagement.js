// frontend/src/components/UserManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Tooltip,
    TextField,
    InputAdornment,
    Avatar,
    Grid,
} from '@mui/material';
import {
    Refresh,
    Edit,
    Delete as DeleteIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    GetApp as GetAppIcon,
    Person as PersonIcon,
    LocalHospital as DoctorIcon,
    People as PeopleIcon,
    Block,
} from '@mui/icons-material';

function UserManagement() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // New: Search, filter, sort
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await API.get('users/');
            setUsers(response.data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users. You may need doctor privileges.');
        }
        setLoading(false);
    };

    // ─── ROLE CHANGE ───
    const handleRoleChange = (user) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setDialogOpen(true);
    };

    const handleSaveRole = async () => {
        if (!selectedUser) return;
        try {
            await API.put(`users/${selectedUser.id}/update/`, { role: newRole });
            setDialogOpen(false);
            fetchUsers();
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Failed to update role.');
        }
    };

    // ─── BLOCK/UNBLOCK ───
    const handleToggleActive = async (user) => {
        try {
            await API.put(`users/${user.id}/update/`, {
                role: user.role,
                is_active: !user.is_active,
            });
            fetchUsers();
        } catch (err) {
            console.error('Error toggling user status:', err);
            alert('Failed to update user status.');
        }
    };

    // ─── DELETE USER ───
    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        try {
            await API.delete(`users/${userToDelete.id}/delete/`);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('Failed to delete user.');
        }
    };

    // ─── VIEW USER DETAILS ───
    const handleViewUser = (user) => {
        setSelectedUser(user);
        setViewDialogOpen(true);
    };

    // ─── NAVIGATE TO PATIENT DETAIL ───
    const handleViewPatient = (patientId) => {
        if (patientId) navigate(`/patient/${patientId}`);
    };

    // ─── EXPORT CSV ───
    const handleExportCSV = () => {
        const headers = ['Username', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Phone'];
        const rows = filteredUsers.map(u => [
            u.username,
            u.first_name,
            u.last_name,
            u.email || '',
            u.role,
            u.is_active ? 'Active' : 'Blocked',
            u.phone || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const getRoleColor = (role) => {
        const colors = { doctor: '#2563eb', patient: '#16a34a', admin: '#f59e0b' };
        return colors[role] || '#6b7280';
    };

    const getRoleBgColor = (role) => {
        const colors = { doctor: '#eff6ff', patient: '#f0fdf4', admin: '#fffbeb' };
        return colors[role] || '#f9fafb';
    };

    const getStatusColor = (isActive) => {
        return isActive ? '#16a34a' : '#dc2626';
    };

    const getStatusBgColor = (isActive) => {
        return isActive ? '#f0fdf4' : '#fef2f2';
    };

    const getInitials = (first, last) => {
        return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase() || '?';
    };

    // Filter & sort users
    const filteredUsers = useMemo(() => {
        let result = [...users];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u =>
                u.username.toLowerCase().includes(term) ||
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
                (u.email && u.email.toLowerCase().includes(term))
            );
        }

        if (roleFilter !== 'all') {
            result = result.filter(u => u.role === roleFilter);
        }

        result.sort((a, b) => {
            if (sortBy === 'name') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
            if (sortBy === 'role') return a.role.localeCompare(b.role);
            if (sortBy === 'status') return Number(b.is_active) - Number(a.is_active);
            return 0;
        });

        return result;
    }, [users, searchTerm, roleFilter, sortBy]);

    // Stats
    const stats = useMemo(() => ({
        total: users.length,
        active: users.filter(u => u.is_active).length,
        blocked: users.filter(u => !u.is_active).length,
        doctors: users.filter(u => u.role === 'doctor').length,
        patients: users.filter(u => u.role === 'patient').length,
    }), [users]);

    const statCards = [
        { title: 'Total Users', value: stats.total, icon: <PeopleIcon sx={{ fontSize: 22 }} />, color: '#2563eb', lightColor: '#eff6ff' },
        { title: 'Active', value: stats.active, icon: <CheckCircleIcon sx={{ fontSize: 22 }} />, color: '#16a34a', lightColor: '#f0fdf4' },
        { title: 'Blocked', value: stats.blocked, icon: <Block sx={{ fontSize: 22 }} />, color: '#dc2626', lightColor: '#fef2f2' },
        { title: 'Doctors', value: stats.doctors, icon: <DoctorIcon sx={{ fontSize: 22 }} />, color: '#2563eb', lightColor: '#eff6ff' },
        { title: 'Patients', value: stats.patients, icon: <PersonIcon sx={{ fontSize: 22 }} />, color: '#16a34a', lightColor: '#f0fdf4' },
    ];

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

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        User Management
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                        Manage all system users: change roles, block/unblock, or delete.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<GetAppIcon sx={{ fontSize: 18 }} />}
                        onClick={handleExportCSV}
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
                        Export CSV
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Refresh sx={{ fontSize: 18 }} />}
                        onClick={fetchUsers}
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

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}>{error}</Alert>}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {statCards.map((stat, index) => (
                    <Grid item xs={6} sm={4} md={2.4} key={index}>
                        <Card elevation={0} sx={cardHoverSx}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: '#6b7280',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                fontSize: '0.65rem',
                                            }}
                                        >
                                            {stat.title}
                                        </Typography>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 700,
                                                color: stat.color,
                                                lineHeight: 1.2,
                                                mt: 0.5,
                                                fontSize: '1.5rem',
                                            }}
                                        >
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            bgcolor: stat.lightColor,
                                            color: stat.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {stat.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filters */}
            <Card elevation={0} sx={{ ...cardHoverSx, mb: 3, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by name, username, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                                            <ClearIcon sx={{ color: '#9ca3af', fontSize: 18 }} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: '#f9fafb',
                                    '& fieldset': { borderColor: '#e5e7eb' },
                                    '&:hover fieldset': { borderColor: '#d1d5db' },
                                    '&.Mui-focused fieldset': { borderColor: '#2563eb' },
                                },
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#6b7280' }}>Role</InputLabel>
                            <Select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                label="Role"
                                sx={{
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                                }}
                            >
                                <MenuItem value="all">All Roles</MenuItem>
                                <MenuItem value="doctor">Doctor</MenuItem>
                                <MenuItem value="patient">Patient</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#6b7280' }}>Sort By</InputLabel>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                label="Sort By"
                                sx={{
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                                }}
                            >
                                <MenuItem value="name">Name</MenuItem>
                                <MenuItem value="role">Role</MenuItem>
                                <MenuItem value="status">Status</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={1}>
                        <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            onClick={() => { setSearchTerm(''); setRoleFilter('all'); setSortBy('name'); }}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                borderColor: '#d1d5db',
                                color: '#374151',
                                py: 1,
                                '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                            }}
                        >
                            Reset
                        </Button>
                    </Grid>
                </Grid>
            </Card>

            {/* Users Table */}
            <Card elevation={0} sx={cardHoverSx}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                            Showing {filteredUsers.length} of {users.length} users
                        </Typography>
                    </Box>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        User
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Email
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Role
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Status
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }} align="right">
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                            <Typography sx={{ color: '#6b7280', fontWeight: 500 }}>
                                                No users found matching your filters.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow
                                            key={user.id}
                                            hover
                                            sx={{
                                                opacity: user.is_active ? 1 : 0.6,
                                                bgcolor: user.is_active ? 'transparent' : '#fef2f2',
                                                '&:last-child td': { borderBottom: 'none' },
                                            }}
                                        >
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', py: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            bgcolor: getRoleBgColor(user.role),
                                                            color: getRoleColor(user.role),
                                                            fontWeight: 600,
                                                            fontSize: '0.85rem',
                                                        }}
                                                    >
                                                        {getInitials(user.first_name, user.last_name)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                                                            {user.first_name} {user.last_name}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>
                                                            @{user.username}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                {user.email || 'N/A'}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <Chip
                                                    label={user.role.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getRoleBgColor(user.role),
                                                        color: getRoleColor(user.role),
                                                        fontWeight: 600,
                                                        borderRadius: 2,
                                                        fontSize: '0.7rem',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <Chip
                                                    label={user.is_active ? 'Active' : 'Blocked'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getStatusBgColor(user.is_active),
                                                        color: getStatusColor(user.is_active),
                                                        fontWeight: 600,
                                                        borderRadius: 2,
                                                        fontSize: '0.7rem',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                    <Tooltip title="View Details">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewUser(user)}
                                                            sx={{ color: '#6b7280', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                                                        >
                                                            <ViewIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {user.role === 'patient' && user.patient_id && (
                                                        <Tooltip title="View Patient Record">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleViewPatient(user.patient_id)}
                                                                sx={{ color: '#6b7280', '&:hover': { color: '#16a34a', bgcolor: '#f0fdf4' } }}
                                                            >
                                                                <PersonIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Change Role">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleRoleChange(user)}
                                                            sx={{ color: '#6b7280', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={user.is_active ? 'Block User' : 'Unblock User'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleToggleActive(user)}
                                                            sx={{
                                                                color: user.is_active ? '#f59e0b' : '#16a34a',
                                                                '&:hover': {
                                                                    bgcolor: user.is_active ? '#fffbeb' : '#f0fdf4',
                                                                },
                                                            }}
                                                        >
                                                            {user.is_active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete User">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteClick(user)}
                                                            sx={{ color: '#6b7280', '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' } }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* ─── CHANGE ROLE DIALOG ─── */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                        Change Role
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
                    <Typography variant="body2" sx={{ mb: 2, color: '#374151', fontWeight: 500 }}>
                        Change role for user: <strong>{selectedUser?.username}</strong>
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel sx={{ color: '#6b7280' }}>Role</InputLabel>
                        <Select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            label="Role"
                            sx={{
                                borderRadius: 2,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                            }}
                        >
                            <MenuItem value="doctor">Doctor</MenuItem>
                            <MenuItem value="patient">Patient</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            borderColor: '#d1d5db',
                            color: '#374151',
                            '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveRole}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#2563eb',
                            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── DELETE CONFIRMATION DIALOG ─── */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, bgcolor: '#fef2f2', color: '#dc2626' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        Delete User
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
                    <Typography sx={{ color: '#374151', fontSize: '0.95rem', fontWeight: 500 }}>
                        Are you sure you want to delete <strong>{userToDelete?.username}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            borderColor: '#d1d5db',
                            color: '#374151',
                            '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#dc2626',
                            boxShadow: '0 1px 3px rgba(220,38,38,0.3)',
                            '&:hover': { bgcolor: '#b91c1c' },
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── VIEW USER DETAILS DIALOG ─── */}
            <Dialog
                open={viewDialogOpen}
                onClose={() => setViewDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                        User Details
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
                    {selectedUser && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            {[
                                { label: 'Username', value: selectedUser.username },
                                { label: 'Full Name', value: `${selectedUser.first_name} ${selectedUser.last_name}` },
                                { label: 'Email', value: selectedUser.email || 'N/A' },
                                { label: 'Role', value: selectedUser.role.toUpperCase() },
                                { label: 'Status', value: selectedUser.is_active ? 'Active' : 'Blocked' },
                                { label: 'Staff', value: selectedUser.is_staff ? 'Yes' : 'No' },
                                ...(selectedUser.patient_name ? [{ label: 'Patient Name', value: selectedUser.patient_name }] : []),
                                ...(selectedUser.phone ? [{ label: 'Phone', value: selectedUser.phone }] : []),
                            ].map((field, idx) => (
                                <Box key={idx}>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, display: 'block', mb: 0.25 }}>
                                        {field.label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                                        {field.value}
                                    </Typography>
                                </Box>
                            ))}
                            {selectedUser.role === 'patient' && selectedUser.patient_id && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PersonIcon sx={{ fontSize: 18 }} />}
                                    onClick={() => { setViewDialogOpen(false); handleViewPatient(selectedUser.patient_id); }}
                                    sx={{
                                        mt: 1,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        borderColor: '#16a34a',
                                        color: '#16a34a',
                                        '&:hover': { bgcolor: '#f0fdf4', borderColor: '#16a34a' },
                                    }}
                                >
                                    View Patient Record
                                </Button>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
                    <Button
                        onClick={() => setViewDialogOpen(false)}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#2563eb',
                            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default UserManagement;