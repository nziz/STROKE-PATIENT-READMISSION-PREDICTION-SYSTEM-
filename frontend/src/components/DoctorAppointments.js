// frontend/src/components/DoctorAppointments.js
import React, { useState, useEffect, useCallback } from 'react';
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
    Paper,
    Chip,
    Button,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    Pending,
    Refresh,
    Search,
} from '@mui/icons-material';

function DoctorAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [dialogAction, setDialogAction] = useState('');

    const applyFilters = useCallback(() => {
        let result = [...appointments];

        if (statusFilter !== 'all') {
            result = result.filter(a => a.status === statusFilter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.patient_name.toLowerCase().includes(term) ||
                a.title.toLowerCase().includes(term)
            );
        }

        result.sort((a, b) => {
            if (sortBy === 'date') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });

        setFiltered(result);
    }, [appointments, statusFilter, searchTerm, sortBy]);

    const fetchAppointments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await API.get('doctor/appointments/');
            setAppointments(response.data || []);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError('Failed to load appointments.');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const handleStatusUpdate = async (appointmentId, status) => {
        try {
            await API.put(`followup/${appointmentId}/status/`, { status });
            fetchAppointments();
            setDialogOpen(false);
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update appointment status.');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            scheduled: '#2563eb',
            completed: '#16a34a',
            cancelled: '#dc2626',
            rescheduled: '#f59e0b',
            missed: '#dc2626',
        };
        return colors[status] || '#6b7280';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle sx={{ color: '#16a34a', fontSize: 16 }} />;
            case 'cancelled': return <Cancel sx={{ color: '#dc2626', fontSize: 16 }} />;
            case 'missed': return <Cancel sx={{ color: '#dc2626', fontSize: 16 }} />;
            default: return <Pending sx={{ color: '#2563eb', fontSize: 16 }} />;
        }
    };

    const handleOpenDialog = (appointment, action) => {
        setSelectedAppointment(appointment);
        setDialogAction(action);
        setDialogOpen(true);
    };

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

    const textFieldSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: '#f9fafb',
            '& fieldset': { borderColor: '#e5e7eb' },
            '&:hover fieldset': { borderColor: '#d1d5db' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb' },
        },
        '& .MuiInputLabel-root': { color: '#6b7280' },
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
                        Appointments
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                        Manage all scheduled follow-up appointments for your patients.
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Refresh sx={{ fontSize: 18 }} />}
                    onClick={fetchAppointments}
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

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}>{error}</Alert>}

            {/* Filters */}
            <Card elevation={0} sx={{ ...cardHoverSx, mb: 3, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by patient or title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={textFieldSx}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: '#9ca3af', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#6b7280' }}>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                label="Status"
                                sx={{
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                                }}
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="scheduled">Scheduled</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                                <MenuItem value="missed">Missed</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
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
                                <MenuItem value="date">Date (Earliest)</MenuItem>
                                <MenuItem value="date-desc">Date (Latest)</MenuItem>
                                <MenuItem value="status">Status</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={fetchAppointments}
                            size="small"
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
                            Refresh
                        </Button>
                    </Grid>
                </Grid>
            </Card>

            {filtered.length === 0 ? (
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
                    <Typography variant="h6" sx={{ color: '#6b7280', fontWeight: 600, fontSize: '1.1rem' }}>
                        No appointments found.
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5, fontWeight: 500 }}>
                        {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your filters.'
                            : 'You can schedule follow-ups from the patient detail page.'}
                    </Typography>
                </Paper>
            ) : (
                <Card elevation={0} sx={cardHoverSx}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f9fafb' }}>
                                        <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                            Patient
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                            Title
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                            Date
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                            Time
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                            Status
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.map((apt) => (
                                        <TableRow key={apt.id} hover sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600 }}>
                                                {apt.patient_name}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                {apt.title}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                {new Date(apt.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                {apt.time.slice(0, 5)}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <Chip
                                                    icon={getStatusIcon(apt.status)}
                                                    label={apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getStatusColor(apt.status) + '20',
                                                        color: getStatusColor(apt.status),
                                                        fontWeight: 600,
                                                        borderRadius: 2,
                                                        fontSize: '0.75rem',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                {apt.status === 'scheduled' ? (
                                                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleOpenDialog(apt, 'completed')}
                                                            startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                                                            sx={{
                                                                borderRadius: 2,
                                                                textTransform: 'none',
                                                                fontWeight: 500,
                                                                borderColor: '#16a34a',
                                                                color: '#16a34a',
                                                                px: 1.5,
                                                                '&:hover': { bgcolor: '#f0fdf4', borderColor: '#16a34a' },
                                                            }}
                                                        >
                                                            Completed
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleOpenDialog(apt, 'missed')}
                                                            startIcon={<Cancel sx={{ fontSize: 16 }} />}
                                                            sx={{
                                                                borderRadius: 2,
                                                                textTransform: 'none',
                                                                fontWeight: 500,
                                                                borderColor: '#dc2626',
                                                                color: '#dc2626',
                                                                px: 1.5,
                                                                '&:hover': { bgcolor: '#fef2f2', borderColor: '#dc2626' },
                                                            }}
                                                        >
                                                            Missed
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleOpenDialog(apt, 'cancelled')}
                                                            startIcon={<Cancel sx={{ fontSize: 16 }} />}
                                                            sx={{
                                                                borderRadius: 2,
                                                                textTransform: 'none',
                                                                fontWeight: 500,
                                                                borderColor: '#f59e0b',
                                                                color: '#f59e0b',
                                                                px: 1.5,
                                                                '&:hover': { bgcolor: '#fffbeb', borderColor: '#f59e0b' },
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Box>
                                                ) : (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: apt.status === 'completed' ? '#16a34a' : '#dc2626',
                                                            fontWeight: 600,
                                                            textTransform: 'capitalize',
                                                        }}
                                                    >
                                                        {apt.status}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                        {dialogAction === 'completed' && 'Mark as Completed'}
                        {dialogAction === 'missed' && 'Mark as Missed'}
                        {dialogAction === 'cancelled' && 'Cancel Appointment'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
                    <Typography sx={{ color: '#374151', fontSize: '0.95rem' }}>
                        Are you sure you want to mark "{selectedAppointment?.title}" for {selectedAppointment?.patient_name} as {dialogAction}?
                    </Typography>
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
                        onClick={() => handleStatusUpdate(selectedAppointment?.id, dialogAction)}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: dialogAction === 'completed' ? '#16a34a' : '#dc2626',
                            boxShadow: dialogAction === 'completed'
                                ? '0 1px 3px rgba(22,163,74,0.3)'
                                : '0 1px 3px rgba(220,38,38,0.3)',
                            '&:hover': { bgcolor: dialogAction === 'completed' ? '#15803d' : '#b91c1c' },
                        }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default DoctorAppointments;