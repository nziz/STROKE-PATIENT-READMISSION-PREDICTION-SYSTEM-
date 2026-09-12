// frontend/src/components/PatientReportSummary.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box, Card, Typography, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Chip, Button, IconButton, Paper, CircularProgress, 
    Alert, FormControl, InputLabel, Select, MenuItem, Pagination, Collapse,
    TextField, InputAdornment
} from '@mui/material';
import {
    Refresh, Person, Send as SendIcon, KeyboardArrowDown, KeyboardArrowUp,
    CheckCircle, Cancel, Search as SearchIcon, Clear as ClearIcon, 
    Assignment as AssignmentIcon
} from '@mui/icons-material';

function PatientReportSummary() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ risk_category: '', compliance: '' });
    const [pagination, setPagination] = useState({ count: 0, page: 1, page_size: 10 });
    const [expanded, setExpanded] = useState({});
    
    // State tracking if a search has been performed
    const [hasSearched, setHasSearched] = useState(false); 
    const [sendingBulk, setSendingBulk] = useState(false);

    const fetchSummary = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                ...filters,
                page: page,
                page_size: 10
            });
            if (searchQuery.trim()) {
                params.append('q', searchQuery.trim());
            }
            
            const response = await API.get(`patient-report-summary/?${params}`);
            setPatients(response.data.results || []);
            setPagination({
                count: response.data.count,
                page: page,
                page_size: 10,
            });
            setHasSearched(true);
        } catch (err) {
            console.error('Error fetching summary:', err);
            setError('Failed to load patient data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        fetchSummary(1);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setPatients([]);
        setHasSearched(false);
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handlePageChange = (event, value) => {
        fetchSummary(value);
    };

    const toggleExpand = (patientId) => {
        setExpanded({ ...expanded, [patientId]: !expanded[patientId] });
    };

    const sendReminder = async (patientId, patientName) => {
        try {
            await API.post(`patient/${patientId}/send-reminder/`, {
                message: `Please submit your daily report today, ${patientName}.`
            });
            alert(`Reminder sent to ${patientName}`);
        } catch (err) {
            alert('Failed to send reminder.');
        }
    };

    const sendBulkReminders = async () => {
        setSendingBulk(true);
        try {
            const response = await API.post('reminders/send-missed-reports/');
            alert(response.data.message || `Reminders sent to ${response.data.sent_count} patients.`);
            if(hasSearched) fetchSummary(pagination.page);
        } catch (err) {
            alert('Failed to send bulk reminders.');
        } finally {
            setSendingBulk(false);
        }
    };

    const getRiskColor = (category) => ({ High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' }[category] || '#6b7280');
    const getRiskBgColor = (category) => ({ High: '#fef2f2', Medium: '#fffbeb', Low: '#f0fdf4' }[category] || '#f9fafb');

    const getSymptomsList = (report) => {
        const symptoms = [];
        if (report.has_headache) symptoms.push('Headache');
        if (report.has_dizziness) symptoms.push('Dizziness');
        if (report.has_weakness) symptoms.push('Weakness');
        if (report.has_speech_difficulty) symptoms.push('Speech');
        if (report.has_vision_changes) symptoms.push('Vision');
        if (report.has_fever) symptoms.push('Fever');
        if (report.has_swallowing_difficulty) symptoms.push('Swallowing');
        return symptoms;
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        Patient Report Summary
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                        Search for patients to view their compliance and clinical status.
                    </Typography>
                </Box>
                
                <Button
                    variant="contained"
                    startIcon={sendingBulk ? <CircularProgress size={16} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
                    onClick={sendBulkReminders}
                    disabled={sendingBulk}
                    sx={{
                        borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#dc2626', 
                        boxShadow: '0 2px 4px rgba(220,38,38,0.2)', px: 2.5, py: 1, '&:hover': { bgcolor: '#b91c1c' },
                    }}
                >
                    Remind All Non-Compliant
                </Button>
            </Box>

            {/* Search & Filters Bar */}
            <Paper component="form" onSubmit={handleSearch} elevation={0} sx={{ p: 2, mb: 4, borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        placeholder="Search by Name, Hospital ID, or Phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ flex: 1, minWidth: 250, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f9fafb' } }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af' }} /></InputAdornment>,
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={handleClearSearch}><ClearIcon sx={{ fontSize: 18, color: '#9ca3af' }} /></IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    <FormControl sx={{ minWidth: 150 }} size="small">
                        <InputLabel sx={{ color: '#6b7280' }}>Risk</InputLabel>
                        <Select name="risk_category" value={filters.risk_category} onChange={handleFilterChange} label="Risk"
                            sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}>
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="High">High</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 150 }} size="small">
                        <InputLabel sx={{ color: '#6b7280' }}>Compliance</InputLabel>
                        <Select name="compliance" value={filters.compliance} onChange={handleFilterChange} label="Compliance"
                            sx={{ borderRadius: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}>
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="submitted">Submitted Today</MenuItem>
                            <MenuItem value="missing">Missing Today</MenuItem>
                        </Select>
                    </FormControl>
                    <Button type="submit" variant="contained" disabled={loading} onClick={handleSearch}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#0d47a1', px: 4, '&:hover': { bgcolor: '#0a3a80' } }}>
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
                    </Button>
                </Box>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            {/* EMPTY STATE (Before Search) */}
            {!hasSearched && !loading && (
                <Box sx={{ textAlign: 'center', py: 12, bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
                    <AssignmentIcon sx={{ fontSize: 70, color: '#cbd5e1', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#475569', fontWeight: 600 }}>
                        Search Patient Directory
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1, maxWidth: 400, mx: 'auto' }}>
                        Enter a patient's name, ID, or phone number above and click search to view their clinical summary and daily compliance.
                    </Typography>
                </Box>
            )}

            {/* NO RESULTS STATE */}
            {hasSearched && !loading && patients.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#fffbeb', borderRadius: 3, border: '1px solid #fde68a' }}>
                    <Typography variant="h6" sx={{ color: '#d97706', fontWeight: 500 }}>
                        No patients found matching your criteria
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#b45309', mt: 1 }}>
                        Try adjusting your search term or clearing the filters.
                    </Typography>
                </Box>
            )}

            {/* RESULTS TABLE */}
            {hasSearched && patients.length > 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden', bgcolor: '#ffffff' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', width: '30%', borderBottom: '1px solid #e5e7eb' }}>Patient</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', width: '15%', borderBottom: '1px solid #e5e7eb' }}>Risk</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', width: '20%', borderBottom: '1px solid #e5e7eb' }}>Last Report</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', width: '15%', borderBottom: '1px solid #e5e7eb' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', width: '20%', borderBottom: '1px solid #e5e7eb' }} align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {patients.map((patient) => {
                                    const isExpanded = expanded[patient.patient_id];
                                    return (
                                        <React.Fragment key={patient.patient_id}>
                                            <TableRow hover sx={{ '&:last-child td': { borderBottom: '1px solid #f3f4f6' } }}>
                                                <TableCell sx={{ borderBottom: '1px solid #f3f4f6', py: 1.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <IconButton size="small" onClick={() => toggleExpand(patient.patient_id)} sx={{ color: '#6b7280' }}>
                                                            {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                                        </IconButton>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>{patient.patient_name}</Typography>
                                                        <Chip label={patient.hospital_id} size="small" variant="outlined" sx={{ ml: 1, borderColor: '#d1d5db', color: '#6b7280', fontWeight: 500, borderRadius: 2 }} />
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <Chip label={patient.risk_category} size="small" sx={{ bgcolor: getRiskBgColor(patient.risk_category), color: getRiskColor(patient.risk_category), fontWeight: 600, borderRadius: 2 }} />
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                                                    {patient.latest_report ? new Date(patient.latest_report.date).toLocaleDateString() : '—'}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    {patient.has_report_today ? (
                                                        <Chip icon={<CheckCircle sx={{ fontSize: 14, color: '#16a34a' }} />} label="Submitted" size="small" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 600, borderRadius: 2 }} />
                                                    ) : (
                                                        <Chip icon={<Cancel sx={{ fontSize: 14, color: '#dc2626' }} />} label="Missing" size="small" sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 600, borderRadius: 2 }} />
                                                    )}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                        <Button size="small" variant="outlined" startIcon={<Person sx={{ fontSize: 16 }} />} onClick={() => navigate(`/patient/${patient.patient_id}`)}
                                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, borderColor: '#2563eb', color: '#2563eb', '&:hover': { bgcolor: '#eff6ff' } }}>
                                                            View
                                                        </Button>
                                                        {!patient.has_report_today && (
                                                            <Button size="small" variant="contained" startIcon={<SendIcon sx={{ fontSize: 16 }} />} onClick={() => sendReminder(patient.patient_id, patient.patient_name)}
                                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}>
                                                                Remind
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={5} sx={{ py: 0, bgcolor: '#f9fafb' }}>
                                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                        <Box sx={{ p: 2, pl: 4 }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1.5, fontSize: '0.9rem' }}>Recent Reports</Typography>
                                                            {patient.recent_reports.length === 0 ? (
                                                                <Typography variant="body2" sx={{ color: '#6b7280' }}>No reports.</Typography>
                                                            ) : (
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                    {patient.recent_reports.map((r, idx) => {
                                                                        const symptoms = getSymptomsList(r);
                                                                        return (
                                                                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 0.75, borderBottom: '1px solid #e5e7eb', '&:last-child': { borderBottom: 'none' } }}>
                                                                                <Typography variant="body2" sx={{ minWidth: 100, fontWeight: 600, color: '#111827' }}>{new Date(r.date).toLocaleDateString()}</Typography>
                                                                                <Chip label={`WB: ${r.well_being_score}/5`} size="small" variant="outlined" sx={{ borderColor: '#d1d5db', color: '#374151', fontWeight: 500, borderRadius: 2 }} />
                                                                                <Chip label={r.took_medications ? 'Meds Taken' : 'Meds Missed'} size="small"
                                                                                    sx={{ bgcolor: r.took_medications ? '#f0fdf4' : '#fef2f2', color: r.took_medications ? '#16a34a' : '#dc2626', fontWeight: 600, borderRadius: 2, fontSize: '0.75rem' }} />
                                                                                {symptoms.length > 0 ? symptoms.map(s => (
                                                                                    <Chip key={s} label={s} size="small" sx={{ bgcolor: '#fffbeb', color: '#f59e0b', fontWeight: 600, borderRadius: 2, fontSize: '0.75rem' }} />
                                                                                )) : (
                                                                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>No symptoms</Typography>
                                                                                )}
                                                                            </Box>
                                                                        );
                                                                    })}
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, borderTop: '1px solid #f3f4f6' }}>
                        <Pagination count={Math.ceil(pagination.count / pagination.page_size)} page={pagination.page} onChange={handlePageChange} color="primary" size="small" />
                    </Box>
                </Paper>
            )}
        </Box>
    );
}

export default PatientReportSummary;