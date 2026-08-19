// frontend/src/components/PatientAppointments.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    Paper,
    Divider,
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
} from '@mui/material';
import {
    CalendarToday,
    AccessTime,
    CheckCircle,
    Cancel,
    Pending,
    Search,
    Refresh,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

function PatientAppointments() {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const patientId = user.patient_id;

    const [followups, setFollowups] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [searchTerm, setSearchTerm] = useState('');

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    useEffect(() => {
        if (!patientId) {
            setError('Patient ID not found. Please log in again.');
            setLoading(false);
            return;
        }
        fetchFollowups();
    }, [patientId]);

    useEffect(() => {
        applyFilters();
    }, [followups, statusFilter, sortBy, searchTerm]);

    const fetchFollowups = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await API.get(`patient/${patientId}/followups/`);
            setFollowups(response.data.followups || []);
        } catch (err) {
            console.error('Error fetching follow-ups:', err);
            setError('Failed to load your appointments.');
        }
        setLoading(false);
    };

    const applyFilters = () => {
        let result = [...followups];

        if (statusFilter !== 'all') {
            result = result.filter(f => f.status === statusFilter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(f =>
                f.title.toLowerCase().includes(term) ||
                (f.doctor_name && f.doctor_name.toLowerCase().includes(term)) ||
                (f.doctor && f.doctor.toLowerCase().includes(term))
            );
        }

        result.sort((a, b) => {
            if (sortBy === 'date') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });

        setFiltered(result);
    };

    const handleCancel = async (id) => {
        try {
            await API.put(`followup/${id}/status/`, { status: 'cancelled' });
            fetchFollowups();
            setDeleteDialogOpen(false);
        } catch (err) {
            console.error('Error cancelling appointment:', err);
            alert('Failed to cancel appointment.');
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

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ borderRadius: 2, fontWeight: 500 }}>{error}</Alert>
                <Button
                    variant="outlined"
                    sx={{
                        mt: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        borderColor: '#d1d5db',
                        color: '#374151',
                        '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                    }}
                    onClick={() => navigate('/login')}
                >
                    Go to Login
                </Button>
            </Box>
        );
    }

    if (!patientId) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ borderRadius: 2, fontWeight: 500 }}>You are not logged in as a patient.</Alert>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        My Appointments
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                        View and manage your scheduled follow-up appointments
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
                    onClick={() => navigate('/patient-dashboard')}
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
                    Back to Dashboard
                </Button>
            </Box>

            {/* Filters */}
            <Card elevation={0} sx={{ ...cardHoverSx, mb: 3, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by title or doctor..."
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
                            startIcon={<Refresh sx={{ fontSize: 18 }} />}
                            onClick={fetchFollowups}
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
                    <CalendarToday sx={{ fontSize: 56, color: '#d1d5db', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ color: '#6b7280', fontWeight: 600, fontSize: '1.1rem' }}>
                        No Appointments Found
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5, fontWeight: 500 }}>
                        {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your filters.'
                            : 'Your doctor will schedule follow-ups here when needed.'}
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {filtered.map((appointment) => (
                        <Grid item xs={12} md={6} key={appointment.id}>
                            <Card elevation={0} sx={cardHoverSx}>
                                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                                                {appointment.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.25, fontWeight: 500 }}>
                                                Dr. {appointment.doctor_name || appointment.doctor || 'Unknown'}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            icon={getStatusIcon(appointment.status)}
                                            label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                            size="small"
                                            sx={{
                                                bgcolor: getStatusColor(appointment.status) + '20',
                                                color: getStatusColor(appointment.status),
                                                fontWeight: 600,
                                                borderRadius: 2,
                                                fontSize: '0.75rem',
                                            }}
                                        />
                                    </Box>
                                    <Divider sx={{ my: 2, borderColor: '#f3f4f6' }} />
                                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                                <CalendarToday sx={{ fontSize: 16 }} />
                                            </Box>
                                            <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                                {new Date(appointment.date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                                <AccessTime sx={{ fontSize: 16 }} />
                                            </Box>
                                            <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                                {appointment.time.slice(0, 5)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {appointment.notes && (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #f3f4f6' }}>
                                            <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                                {appointment.notes}
                                            </Typography>
                                        </Box>
                                    )}
                                    {appointment.status === 'scheduled' && (
                                        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Cancel sx={{ fontSize: 16 }} />}
                                                onClick={() => {
                                                    setSelectedAppointment(appointment);
                                                    setDeleteDialogOpen(true);
                                                }}
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
                                                Cancel
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Cancel Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                        Cancel Appointment
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
                    <Typography sx={{ color: '#374151', fontSize: '0.95rem', fontWeight: 500 }}>
                        Are you sure you want to cancel the appointment "{selectedAppointment?.title}" on{' '}
                        {selectedAppointment ? new Date(selectedAppointment.date).toLocaleDateString() : ''}?
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
                        No, Keep
                    </Button>
                    <Button
                        onClick={() => handleCancel(selectedAppointment?.id)}
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
                        Yes, Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default PatientAppointments;