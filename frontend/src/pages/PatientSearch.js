// frontend/src/pages/PatientSearch.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box, Typography, TextField, Button, Card, CardContent, Grid, Chip, 
    Checkbox, FormControlLabel, CircularProgress, Alert, IconButton, 
    Tooltip, Paper, InputAdornment
} from '@mui/material';
import {
    Search as SearchIcon, Visibility as ViewIcon, GetApp as ExportIcon, 
    Download as BulkDownloadIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon,
    Clear as ClearIcon
} from '@mui/icons-material';

const PatientSearch = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true); // Start as true while loading all
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [hasSearched, setHasSearched] = useState(true); // Set to true to hide the empty state

    // 1. AUTO-LOAD ALL PATIENTS ON PAGE MOUNT
    useEffect(() => {
        fetchPatients('');
    }, []);

    const fetchPatients = async (query) => {
        setLoading(true);
        setError(null);
        try {
            let response;
            if (query && query.trim().length >= 2) {
                // If they typed something, search
                response = await API.get(`patients/search/?q=${encodeURIComponent(query.trim())}`);
            } else {
                // If empty, fetch ALL patients
                response = await API.get('patients/'); 
            }
            setResults(response.data.patients || []);
            setSelectedIds([]);
        } catch (err) {
            console.error('Fetch failed:', err);
            setError('Failed to load patients. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchPatients(searchQuery);
    };

    const handleClear = () => {
        setSearchQuery('');
        fetchPatients(''); // Reload all patients when cleared
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? results.map(p => p.id) : []);
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleViewPatient = (id) => {
        navigate(`/patient/${id}`); 
    };

    const handleExportIndividual = async (id, format = 'csv') => {
        try {
            const response = await API.get(`patient/${id}/export-${format}/`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Clinical_Report_${id}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export report.');
        }
    };

    const handleBulkExport = async () => {
        if (selectedIds.length === 0) return;
        setExporting(true);
        try {
            const response = await API.post('patients/bulk-export/', { patient_ids: selectedIds }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Bulk_Patients_Export.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Bulk export failed:', err);
            alert('Failed to export selected patients.');
        } finally {
            setExporting(false);
        }
    };

    const getRiskColor = (category) => ({ High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' }[category] || '#6b7280');
    const getRiskBgColor = (category) => ({ High: '#fef2f2', Medium: '#fffbeb', Low: '#f0fdf4' }[category] || '#f9fafb');
    const getRiskIcon = (category) => {
        if (category === 'High') return <WarningIcon sx={{ color: '#dc2626', fontSize: 18 }} />;
        if (category === 'Medium') return <WarningIcon sx={{ color: '#f59e0b', fontSize: 18 }} />;
        return <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 18 }} />;
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                    Patient Directory Search
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                    All patient reports are loaded below. Search to filter, or select patients to export bulk reports.
                </Typography>
            </Box>

            {/* Search Bar */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        placeholder="Filter by Name, ID, or Phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' },
                        }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af' }} /></InputAdornment>,
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleClear}><ClearIcon sx={{ fontSize: 18, color: '#9ca3af' }} /></IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSearch}
                        disabled={loading}
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#0d47a1', px: 4,
                            '&:hover': { bgcolor: '#0a3a80' }, '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' }
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleBulkExport}
                        disabled={selectedIds.length === 0 || exporting}
                        startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <BulkDownloadIcon />}
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 500, borderColor: '#d1d5db', color: '#374151',
                            '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' }, '&:disabled': { borderColor: '#f3f4f6', color: '#d1d5db' }
                        }}
                    >
                        Export Selected ({selectedIds.length})
                    </Button>
                </Box>
            </Paper>

            {/* Error Alert */}
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* NO RESULTS STATE */}
            {!loading && results.length === 0 && !error && (
                <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#fffbeb', borderRadius: 3, border: '1px solid #fde68a' }}>
                    <Typography variant="h6" sx={{ color: '#d97706', fontWeight: 500 }}>
                        No patients found matching "{searchQuery}"
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#b45309', mt: 1 }}>
                        Please check the spelling or clear the search to see all patients.
                    </Typography>
                </Box>
            )}

            {/* Loading State */}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>}

            {/* RESULTS GRID */}
            {results.length > 0 && (
                <>
                    {/* Select All Bar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, px: 1 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedIds.length === results.length && results.length > 0}
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < results.length}
                                    onChange={handleSelectAll}
                                    sx={{ '&.Mui-checked': { color: '#0d47a1' }, color: '#9ca3af' }}
                                />
                            }
                            label={<Typography sx={{ fontWeight: 500, color: '#4b5563' }}>Select All ({results.length})</Typography>}
                        />
                    </Box>

                    <Grid container spacing={2.5}>
                        {results.map((patient) => {
                            const isSelected = selectedIds.includes(patient.id);
                            const riskCategory = patient.risk_category || 'Low';
                            const riskColor = getRiskColor(riskCategory);

                            return (
                                <Grid item xs={12} md={6} lg={4} key={patient.id}>
                                    <Card
                                        sx={{
                                            borderRadius: 3, height: '100%',
                                            border: isSelected ? '2px solid #0d47a1' : '1px solid #e5e7eb',
                                            bgcolor: '#ffffff',
                                            transition: 'all 0.2s ease',
                                            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px -8px rgba(0,0,0,0.08)', borderColor: '#cbd5e1' },
                                        }}
                                    >
                                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => handleSelectOne(patient.id)}
                                                        sx={{ p: 0, '&.Mui-checked': { color: '#0d47a1' } }}
                                                    />
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                                                        {patient.first_name} {patient.last_name}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    icon={getRiskIcon(riskCategory)}
                                                    label={riskCategory}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getRiskBgColor(riskCategory), color: riskColor,
                                                        fontWeight: 600, borderRadius: 2, fontSize: '0.7rem', border: `1px solid ${riskColor}20`
                                                    }}
                                                />
                                            </Box>

                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, ml: 4.5, mb: 2 }}>
                                                <Typography variant="body2" sx={{ color: '#4b5563' }}>
                                                    <strong style={{ color: '#9ca3af', fontWeight: 500 }}>ID:</strong> {patient.hospital_id || patient.id}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#4b5563' }}>
                                                    <strong style={{ color: '#9ca3af', fontWeight: 500 }}>Phone:</strong> {patient.phone_number || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#4b5563' }}>
                                                    <strong style={{ color: '#9ca3af', fontWeight: 500 }}>Age:</strong> {patient.age} years
                                                </Typography>
                                                {patient.risk_score !== undefined && (
                                                    <Typography variant="body2" sx={{ color: riskColor, fontWeight: 600 }}>
                                                        Risk Score: {Math.round(patient.risk_score * 100)}%
                                                    </Typography>
                                                )}
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, mt: 'auto', ml: 4.5 }}>
                                                <Button
                                                    size="small" variant="contained" startIcon={<ViewIcon />}
                                                    onClick={() => handleViewPatient(patient.id)}
                                                    sx={{
                                                        flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600,
                                                        bgcolor: '#0d47a1', '&:hover': { bgcolor: '#0a3a80' }
                                                    }}
                                                >
                                                    View Profile
                                                </Button>
                                                <Tooltip title="Export CSV">
                                                    <IconButton size="small" onClick={() => handleExportIndividual(patient.id, 'csv')} sx={{ color: '#6b7280', border: '1px solid #e5e7eb', '&:hover': { color: '#0d47a1', borderColor: '#0d47a1' } }}>
                                                        <ExportIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Export PDF">
                                                    <IconButton size="small" onClick={() => handleExportIndividual(patient.id, 'pdf')} sx={{ color: '#6b7280', border: '1px solid #e5e7eb', '&:hover': { color: '#dc2626', borderColor: '#dc2626' } }}>
                                                        <ExportIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </>
            )}
        </Box>
    );
};

export default PatientSearch;