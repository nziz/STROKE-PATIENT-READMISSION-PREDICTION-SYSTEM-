// frontend/src/pages/PatientSearch.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Grid,
    Chip,
    Checkbox,
    FormControlLabel,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Paper,
} from '@mui/material';
import {
    Search as SearchIcon,
    Visibility as ViewIcon,
    GetApp as ExportIcon,
    Download as BulkDownloadIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const PatientSearch = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [exporting, setExporting] = useState(false);

    const handleSearch = async () => {
        if (searchQuery.trim().length < 2) {
            setError('Please enter at least 2 characters to search.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await API.get(`patients/search/?q=${encodeURIComponent(searchQuery.trim())}`);
            setResults(response.data.patients || []);
            setSelectedIds([]);
        } catch (err) {
            console.error('Search failed:', err);
            setError('Failed to search patients. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(results.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleViewPatient = (id) => {
        navigate(`/patients/${id}`);
    };

    const handleExportIndividual = async (id, format = 'csv') => {
        try {
            const response = await API.get(`patient/${id}/export-${format}/`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `patient_${id}_report.${format}`);
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
        if (selectedIds.length === 0) {
            alert('Please select at least one patient to export.');
            return;
        }

        setExporting(true);
        try {
            const response = await API.post('patients/bulk-export/', {
                patient_ids: selectedIds,
            }, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bulk_patients_export.csv`);
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

    const getRiskColor = (category) => {
        const colors = { High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' };
        return colors[category] || '#6b7280';
    };

    const getRiskBgColor = (category) => {
        const colors = { High: '#fef2f2', Medium: '#fffbeb', Low: '#f0fdf4' };
        return colors[category] || '#f9fafb';
    };

    const getRiskIcon = (category) => {
        if (category === 'High') return <WarningIcon sx={{ color: '#dc2626', fontSize: 18 }} />;
        if (category === 'Medium') return <WarningIcon sx={{ color: '#f59e0b', fontSize: 18 }} />;
        return <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 18 }} />;
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', mb: 1 }}>
                Patient Search
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                Search for patients by name, phone number, or hospital ID.
            </Typography>

            {/* Search Bar */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        fullWidth
                        placeholder="Search by name, phone number, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                bgcolor: '#f9fafb',
                            },
                        }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: '#9ca3af', mr: 1 }} />,
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSearch}
                        disabled={loading}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#2563eb',
                            px: 4,
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleBulkExport}
                        disabled={selectedIds.length === 0 || exporting}
                        startIcon={<BulkDownloadIcon />}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            borderColor: '#d1d5db',
                            color: '#374151',
                            '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                        }}
                    >
                        {exporting ? <CircularProgress size={20} /> : `Export Selected (${selectedIds.length})`}
                    </Button>
                </Box>
            </Paper>

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Results */}
            {results.length === 0 && !loading && !error && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography sx={{ color: '#6b7280', fontWeight: 500 }}>
                        {searchQuery ? 'No patients found. Try a different search term.' : 'Enter a search term to find patients.'}
                    </Typography>
                </Box>
            )}

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
                <>
                    {/* Select All */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedIds.length === results.length && results.length > 0}
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < results.length}
                                    onChange={handleSelectAll}
                                    sx={{ '&.Mui-checked': { color: '#2563eb' } }}
                                />
                            }
                            label={`Select All (${results.length})`}
                        />
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {selectedIds.length} selected
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        {results.map((patient) => {
                            const isSelected = selectedIds.includes(patient.id);
                            const riskCategory = patient.risk_category || 'Low';
                            const riskColor = getRiskColor(riskCategory);

                            return (
                                <Grid item xs={12} md={6} lg={4} key={patient.id}>
                                    <Card
                                        sx={{
                                            borderRadius: 3,
                                            border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                            bgcolor: getRiskBgColor(riskCategory),
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-3px)',
                                                boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => handleSelectOne(patient.id)}
                                                        sx={{ p: 0, '&.Mui-checked': { color: '#2563eb' } }}
                                                    />
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
                                                        {patient.first_name} {patient.last_name}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    icon={getRiskIcon(riskCategory)}
                                                    label={riskCategory}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getRiskBgColor(riskCategory),
                                                        color: riskColor,
                                                        fontWeight: 600,
                                                        borderRadius: 2,
                                                        fontSize: '0.7rem',
                                                    }}
                                                />
                                            </Box>

                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 4.5 }}>
                                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                                    <strong>ID:</strong> {patient.hospital_id || patient.id}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                                    <strong>Phone:</strong> {patient.phone_number || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                                    <strong>Age:</strong> {patient.age} years
                                                </Typography>
                                                {patient.risk_score !== undefined && (
                                                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                                        <strong>Risk Score:</strong> {Math.round(patient.risk_score * 100)}%
                                                    </Typography>
                                                )}
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, mt: 2, ml: 4.5 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<ViewIcon />}
                                                    onClick={() => handleViewPatient(patient.id)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 500,
                                                        borderColor: '#d1d5db',
                                                        color: '#374151',
                                                        '&:hover': { borderColor: '#2563eb', color: '#2563eb' },
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                                <Tooltip title="Export CSV">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleExportIndividual(patient.id, 'csv')}
                                                        sx={{ color: '#6b7280', '&:hover': { color: '#2563eb' } }}
                                                    >
                                                        <ExportIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Export PDF">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleExportIndividual(patient.id, 'pdf')}
                                                        sx={{ color: '#6b7280', '&:hover': { color: '#2563eb' } }}
                                                    >
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