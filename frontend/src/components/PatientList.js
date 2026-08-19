import React, { useState, useEffect } from 'react';
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
    Paper,
    Chip,
    LinearProgress,
    Button,
    Avatar,
    TextField,
    InputAdornment,
    Grid,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Clear as ClearIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';

function PatientList() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        filterPatients();
    }, [patients, searchTerm, riskFilter]);

    const fetchPatients = async () => {
        try {
            const response = await API.get('doctor/dashboard/');
            setPatients(response.data.patients || []);
            setFilteredPatients(response.data.patients || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching patients:', error);
            setLoading(false);
        }
    };

    const filterPatients = () => {
        let filtered = patients;
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.hospital_id?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (riskFilter !== 'all') {
            filtered = filtered.filter(p => p.risk_category === riskFilter);
        }
        setFilteredPatients(filtered);
    };

    const getRiskColor = (category) => {
        const colors = { High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' };
        return colors[category] || '#6b7280';
    };

    const getRiskBgColor = (category) => {
        const colors = { High: '#fef2f2', Medium: '#fffbeb', Low: '#f0fdf4' };
        return colors[category] || '#f9fafb';
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setRiskFilter('all');
    };

    const handleViewDetails = (patientId) => {
        navigate(`/patient/${patientId}`);
    };

    const handleDeleteClick = (patient) => {
        setSelectedPatient(patient);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedPatient) return;
        try {
            await API.delete(`patient/${selectedPatient.id}/delete/`);
            setSnackbar({
                open: true,
                message: `Patient ${selectedPatient.name} deleted successfully.`,
                severity: 'success'
            });
            fetchPatients();
        } catch (error) {
            console.error('Error deleting patient:', error);
            setSnackbar({
                open: true,
                message: 'Failed to delete patient. Please try again.',
                severity: 'error'
            });
        }
        setDeleteDialogOpen(false);
        setSelectedPatient(null);
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setSelectedPatient(null);
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

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <Typography sx={{ color: '#6b7280' }}>Loading patients...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        Patient List
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                        Manage and view all stroke patients
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    
                  
                </Box>
            </Box>

            {/* Filters */}
            <Card elevation={0} sx={{ ...cardHoverSx, mb: 3 }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Search by name or ID..."
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
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ color: '#6b7280' }}>Risk Category</InputLabel>
                                <Select
                                    value={riskFilter}
                                    onChange={(e) => setRiskFilter(e.target.value)}
                                    label="Risk Category"
                                    sx={{
                                        borderRadius: 2,
                                        bgcolor: '#f9fafb',
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                                    }}
                                >
                                    <MenuItem value="all">All Categories</MenuItem>
                                    <MenuItem value="High">High Risk</MenuItem>
                                    <MenuItem value="Medium">Medium Risk</MenuItem>
                                    <MenuItem value="Low">Low Risk</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={handleClearFilters}
                                startIcon={<ClearIcon sx={{ fontSize: 18 }} />}
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
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Patient Table */}
            <Card elevation={0} sx={cardHoverSx}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                            Showing {filteredPatients.length} of {patients.length} patients
                        </Typography>
                    </Box>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Patient
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Age
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Gender
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        NIHSS
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Risk Score
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Status
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', borderBottom: '1px solid #e5e7eb' }}>
                                        Action
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredPatients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                            <Typography sx={{ color: '#6b7280' }}>
                                                No patients found matching your filters
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <TableRow
                                            key={patient.id}
                                            hover
                                            sx={{ '&:last-child td': { borderBottom: 'none' } }}
                                        >
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', py: 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ width: 36, height: 36, bgcolor: getRiskBgColor(patient.risk_category), color: getRiskColor(patient.risk_category), fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {patient.name.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                                                            {patient.name}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                                            {patient.hospital_id}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                {patient.age}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                {patient.gender}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                {patient.nihss_score || 'N/A'}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: getRiskColor(patient.risk_category), minWidth: 36 }}>
                                                        {Math.round(patient.risk_score * 100)}%
                                                    </Typography>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={patient.risk_score * 100}
                                                        sx={{
                                                            width: 60,
                                                            height: 6,
                                                            borderRadius: 3,
                                                            bgcolor: getRiskBgColor(patient.risk_category),
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: getRiskColor(patient.risk_category),
                                                                borderRadius: 3,
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <Chip
                                                    label={patient.risk_category}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getRiskBgColor(patient.risk_category),
                                                        color: getRiskColor(patient.risk_category),
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                        borderRadius: 2,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleViewDetails(patient.id)}
                                                        startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                                                        sx={{
                                                            borderRadius: 2,
                                                            textTransform: 'none',
                                                            fontWeight: 500,
                                                            borderColor: '#2563eb',
                                                            color: '#2563eb',
                                                            px: 1.5,
                                                            '&:hover': {
                                                                bgcolor: '#eff6ff',
                                                                borderColor: '#2563eb',
                                                            },
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleDeleteClick(patient)}
                                                        startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                                                        sx={{
                                                            borderRadius: 2,
                                                            textTransform: 'none',
                                                            fontWeight: 500,
                                                            borderColor: '#dc2626',
                                                            color: '#dc2626',
                                                            px: 1.5,
                                                            '&:hover': {
                                                                bgcolor: '#fef2f2',
                                                                borderColor: '#dc2626',
                                                            },
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
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

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle id="delete-dialog-title" sx={{ bgcolor: '#fef2f2', color: '#dc2626', px: 3, pt: 2.5, pb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        Confirm Deletion
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
                    <DialogContentText id="delete-dialog-description" sx={{ color: '#374151', fontSize: '0.95rem' }}>
                        Are you sure you want to delete <strong>{selectedPatient?.name}</strong> (ID: {selectedPatient?.hospital_id})?
                        <br /><br />
                        This action <strong>cannot be undone</strong> and will permanently remove all data associated with this patient.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
                    <Button
                        onClick={handleDeleteCancel}
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
                        startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#dc2626',
                            boxShadow: '0 1px 3px rgba(220,38,38,0.3)',
                            '&:hover': { bgcolor: '#b91c1c' },
                        }}
                    >
                        Delete Permanently
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: 2, fontWeight: 500 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default PatientList;