// frontend/src/components/PatientDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box, Card, CardContent, Typography, Grid, Chip, Button, Avatar, Divider,
    CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
    CheckCircle, Warning, Assignment, CalendarToday,
    LocalHospital, FileDownload
} from '@mui/icons-material';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function PatientDashboard() {
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [reports, setReports] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const patientId = user.patient_id;

    useEffect(() => {
        if (!patientId) {
            setError('Session expired or invalid. Please log in again.');
            setLoading(false);
            return;
        }
        fetchPatientData();
        fetchReminders();
    }, [patientId]);

    const fetchPatientData = async () => {
        try {
            const [patientRes, reportsRes] = await Promise.all([
                API.get(`patient/${patientId}/`),
                API.get(`patient/${patientId}/reports/`),
            ]);
            setPatient(patientRes.data);
            setReports(reportsRes.data.reports || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching patient data:', err);
            setError('Failed to load clinical data. Please try again.');
            setLoading(false);
        }
    };

    const fetchReminders = async () => {
        try {
            const res = await API.get('patient/reminders/');
            setReminders(res.data.reminders || []);
        } catch (err) {
            console.error('Error fetching reminders:', err);
        }
    };

    const markReminderRead = async (reminderId) => {
        try {
            await API.post(`patient/reminder/${reminderId}/read/`);
            setReminders(reminders.filter(r => r.id !== reminderId));
        } catch (err) {
            console.error('Error marking reminder read:', err);
        }
    };

    const getRiskColor = (category) => ({ High: '#b91c1c', Medium: '#d97706', Low: '#15803d' }[category] || '#475569');
    
    const getRiskIcon = (category) => {
        if (category === 'High') return <Warning sx={{ color: '#b91c1c', fontSize: 18 }} />;
        if (category === 'Medium') return <Warning sx={{ color: '#d97706', fontSize: 18 }} />;
        return <CheckCircle sx={{ color: '#15803d', fontSize: 18 }} />;
    };

    const downloadFile = async (endpoint, filename) => {
        try {
            const baseURL = API.defaults.baseURL || 'http://127.0.0.1:8000/api/';
            const url = `${baseURL}${endpoint}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            alert('Failed to download clinical report.');
        }
    };

    const handleExportCSV = () => patient && downloadFile(`patient/${patient.id}/export-csv/`, `clinical_history_${patient.hospital_id}.csv`);
    const handleExportPDF = () => patient && downloadFile(`patient/${patient.id}/export-pdf/`, `clinical_report_${patient.hospital_id}.pdf`);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: '#0d47a1' }} /></Box>;
    
    if (error) return (
        <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
            <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
            <Button variant="contained" sx={{ mt: 3, bgcolor: '#0f172a' }} onClick={() => navigate('/login')}>Return to Login</Button>
        </Box>
    );

    if (!patient) return null;

    const riskScore = patient.risk_score ?? patient.current_risk_score ?? 0;
    const riskCategory = patient.risk_category || patient.current_risk_category || 'Low';

    const clinicalCardSx = {
        borderRadius: 2,
        bgcolor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    };

    return (
        <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
            {/* Clinical Alerts */}
            {reminders.map((reminder) => (
                <Alert
                    key={reminder.id}
                    severity="warning"
                    icon={<Assignment sx={{ color: '#d97706' }} />}
                    sx={{ mb: 2, borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fde68a', '& .MuiAlert-message': { color: '#92400e' } }}
                    action={
                        <Button color="inherit" size="small" onClick={() => markReminderRead(reminder.id)} sx={{ textTransform: 'none', fontWeight: 600, color: '#92400e' }}>
                            Acknowledge
                        </Button>
                    }
                >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Clinical Reminder:</Typography>
                    <Typography variant="body2">{reminder.message}</Typography>
                </Alert>
            ))}

            {/* Portal Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                        Clinical Care Dashboard
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#475569', mt: 0.5 }}>
                        Welcome back, {patient.first_name}. Review your health metrics and submit daily updates.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button variant="outlined" size="small" startIcon={<FileDownload sx={{ fontSize: 16 }} />} onClick={handleExportCSV} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#334155', '&:hover': { bgcolor: '#f1f5f9' } }}>CSV</Button>
                    <Button variant="outlined" size="small" startIcon={<FileDownload sx={{ fontSize: 16 }} />} onClick={handleExportPDF} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#334155', '&:hover': { bgcolor: '#f1f5f9' } }}>PDF</Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* LEFT COLUMN: Patient Chart */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={clinicalCardSx}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: '#0f172a', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                                    {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                                        {patient.first_name} {patient.last_name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                                        {patient.age} yrs • {patient.gender === 'M' ? 'Male' : 'Female'} • ID: {patient.hospital_id}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            <Divider sx={{ borderColor: '#f1f5f9', mb: 2.5 }} />
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CalendarToday sx={{ color: '#64748b', fontSize: 18 }} />
                                    <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                                        Admitted: {new Date(patient.admission_date).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <LocalHospital sx={{ color: '#64748b', fontSize: 18 }} />
                                    <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>
                                        Baseline NIHSS: {patient.nihss_score || 'N/A'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Button
                                variant="contained" fullWidth startIcon={<Assignment sx={{ fontSize: 18 }} />}
                                sx={{ mt: 4, borderRadius: 1.5, textTransform: 'none', fontWeight: 700, bgcolor: '#0d47a1', py: 1.2, '&:hover': { bgcolor: '#0a3a80' } }}
                                onClick={() => navigate('/reports', { state: { patientId: patient.id } })}
                            >
                                Submit Daily Report
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* RIGHT COLUMN: Risk & History */}
                <Grid item xs={12} md={8}>
                    {/* Risk Assessment */}
                    <Card elevation={0} sx={{ ...clinicalCardSx, mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.75rem' }}>
                                Readmission Probability Index
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4, mt: 2 }}>
                                <Box sx={{ width: 130, height: 130, flexShrink: 0 }}>
                                    <CircularProgressbar
                                        value={riskScore * 100} text={`${Math.round(riskScore * 100)}%`}
                                        styles={buildStyles({ pathColor: getRiskColor(riskCategory), textColor: '#0f172a', trailColor: '#f1f5f9', textSize: '24px', fontWeight: 'bold' })}
                                    />
                                </Box>
                                <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, mb: 1 }}>
                                        {getRiskIcon(riskCategory)}
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {riskCategory} Risk Category
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#475569', mb: 2, lineHeight: 1.6 }}>
                                        Calculated using baseline NIHSS, symptom trends, and medication adherence.
                                    </Typography>
                                    <Chip label={`${reports.length} Total Reports Logged`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600, borderRadius: 1 }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* ENTERPRISE DATA TABLE (Handles infinite reports cleanly) */}
                    <Card elevation={0} sx={clinicalCardSx}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                                    Clinical History Log
                                </Typography>
                            </Box>
                            
                            {reports.length === 0 ? (
                                <Box sx={{ py: 6, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                                    <Typography sx={{ color: '#64748b', fontWeight: 500 }}>No clinical reports logged yet.</Typography>
                                </Box>
                            ) : (
                                <TableContainer sx={{ maxHeight: 320 }}>
                                    <Table stickyHeader size="small" aria-label="clinical history">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Adherence</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Well-being</TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: '#64748b', bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase' }}>Notes</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {reports.map((r) => (
                                                <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                                    <TableCell sx={{ py: 1.5, color: '#0f172a', fontWeight: 600, fontSize: '0.85rem' }}>
                                                        {new Date(r.date || r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1.5 }}>
                                                        <Chip 
                                                            label={r.took_medications ? 'Taken' : 'Missed'} 
                                                            size="small" 
                                                            sx={{ 
                                                                fontWeight: 700, height: 22, fontSize: '0.7rem',
                                                                bgcolor: r.took_medications ? '#dcfce7' : '#fee2e2', 
                                                                color: r.took_medications ? '#166534' : '#991b1b'
                                                            }} 
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1.5, fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                                                        {r.well_being_score}/5
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1.5, color: '#64748b', fontSize: '0.8rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {r.notes || '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default PatientDashboard;