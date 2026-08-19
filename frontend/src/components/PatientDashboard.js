// frontend/src/components/PatientDashboard.js
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
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    CheckCircle,
    Warning,
    Assignment,
    Person,
    CalendarToday,
    LocalHospital,
    GetApp as GetAppIcon,
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

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const patientId = user.patient_id;

    console.log('PatientDashboard: patientId from localStorage =', patientId);

    useEffect(() => {
        if (!patientId) {
            setError('You are not logged in as a patient. Please log in again.');
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
            setError('Failed to load your data. Please try again.');
            setLoading(false);
        }
    };

    const fetchReminders = async () => {
        try {
            const res = await API.get('patient/reminders/');
            setReminders(res.data.reminders || []);
            console.log('Reminders fetched:', res.data.reminders);
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
            alert('Failed to dismiss reminder.');
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
        if (category === 'High') return <Warning sx={{ color: '#dc2626' }} />;
        if (category === 'Medium') return <Warning sx={{ color: '#f59e0b' }} />;
        return <CheckCircle sx={{ color: '#16a34a' }} />;
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
            console.error('Download failed:', error);
            alert('Failed to download file. Please try again.');
        }
    };

    const handleExportCSV = () => {
        if (patient) downloadFile(`patient/${patient.id}/export-csv/`, `my_reports.csv`);
    };
    const handleExportPDF = () => {
        if (patient) downloadFile(`patient/${patient.id}/export-pdf/`, `my_reports.pdf`);
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
                <Alert severity="error">{error}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/login')}>
                    Go to Login
                </Button>
            </Box>
        );
    }

    if (!patient) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">No patient data found.</Alert>
            </Box>
        );
    }

    const riskScore = patient.current_risk_score || 0;
    const riskCategory = patient.current_risk_category || 'Low';

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

    return (
        <Box>
            {/* Reminder Banners */}
            {reminders.map((reminder) => (
                <Alert
                    key={reminder.id}
                    severity="info"
                    icon={<Assignment />}
                    sx={{ mb: 2, borderRadius: 2 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => markReminderRead(reminder.id)}
                            sx={{ textTransform: 'none', fontWeight: 500 }}
                        >
                            Dismiss
                        </Button>
                    }
                >
                    <Typography variant="body2">
                        <strong>Reminder:</strong> {reminder.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {new Date(reminder.created_at).toLocaleString()}
                    </Typography>
                </Alert>
            ))}

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        My Health Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                        Welcome back, {patient.first_name} {patient.last_name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Chip
                        label={`Patient ID: ${patient.hospital_id}`}
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 500, borderColor: '#d1d5db', color: '#374151' }}
                    />
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
                        CSV
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<GetAppIcon sx={{ fontSize: 18 }} />}
                        onClick={handleExportPDF}
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
                        PDF
                    </Button>
                </Box>
            </Box>

            {/* Main Grid */}
            <Grid container spacing={3}>
                {/* Left card - Profile */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={cardHoverSx}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar sx={{ width: 80, height: 80, bgcolor: '#2563eb', fontSize: 32, mb: 1.5 }}>
                                    {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                                    {patient.first_name} {patient.last_name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                                    {patient.age} years • {patient.gender === 'M' ? 'Male' : 'Female'}
                                </Typography>
                                <Chip
                                    icon={getRiskIcon(riskCategory)}
                                    label={riskCategory}
                                    sx={{
                                        mt: 1.5,
                                        bgcolor: getRiskBgColor(riskCategory),
                                        color: getRiskColor(riskCategory),
                                        fontWeight: 600,
                                        borderRadius: 2,
                                    }}
                                />
                            </Box>
                            <Divider sx={{ my: 2.5, borderColor: '#f3f4f6' }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                        <Person sx={{ fontSize: 18 }} />
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                        ID: {patient.hospital_id}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                        <CalendarToday sx={{ fontSize: 18 }} />
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                        Admitted: {new Date(patient.admission_date).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                        <LocalHospital sx={{ fontSize: 18 }} />
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                        NIHSS: {patient.nihss_score || 'N/A'}
                                    </Typography>
                                </Box>
                            </Box>
                            <Button
                                variant="contained"
                                fullWidth
                                startIcon={<Assignment sx={{ fontSize: 18 }} />}
                                sx={{
                                    mt: 3,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    bgcolor: '#2563eb',
                                    py: 1,
                                    boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                                onClick={() => navigate('/reports', { state: { patientId: patient.id } })}
                            >
                                Submit Daily Report
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right column */}
                <Grid item xs={12} md={8}>
                    {/* Risk Score Card */}
                    <Card elevation={0} sx={{ ...cardHoverSx, mb: 3 }}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4 }}>
                                <Box sx={{ width: 140, height: 140, flexShrink: 0 }}>
                                    <CircularProgressbar
                                        value={riskScore * 100}
                                        text={`${Math.round(riskScore * 100)}%`}
                                        styles={buildStyles({
                                            pathColor: getRiskColor(riskCategory),
                                            textColor: getRiskColor(riskCategory),
                                            trailColor: '#e5e7eb',
                                            textSize: '18px',
                                            pathTransitionDuration: 0.5,
                                        })}
                                    />
                                </Box>
                                <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: getRiskColor(riskCategory), fontSize: '1.25rem' }}>
                                        Readmission Risk
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5, mt: 0.5 }}>
                                        Based on your clinical data and {reports.length} reports
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                                        <Chip
                                            label={`Risk: ${riskCategory}`}
                                            sx={{
                                                bgcolor: getRiskBgColor(riskCategory),
                                                color: getRiskColor(riskCategory),
                                                fontWeight: 600,
                                                borderRadius: 2,
                                            }}
                                        />
                                        <Chip
                                            label={`Reports: ${reports.length}`}
                                            variant="outlined"
                                            sx={{ borderRadius: 2, borderColor: '#d1d5db', color: '#374151', fontWeight: 500 }}
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1.5, fontWeight: 500 }}>
                                        Last updated: {patient.last_updated ? new Date(patient.last_updated).toLocaleString() : 'N/A'}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Recent Reports */}
                    <Card elevation={0} sx={cardHoverSx}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Assignment sx={{ color: '#6b7280', fontSize: 20 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
                                    Recent Reports
                                </Typography>
                            </Box>
                            {reports.length === 0 ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography sx={{ color: '#6b7280' }}>No reports yet. Submit your first daily report!</Typography>
                                </Box>
                            ) : (
                                <List sx={{ py: 0 }}>
                                    {reports.slice(0, 5).map((r) => (
                                        <ListItem
                                            key={r.id}
                                            sx={{
                                                px: 0,
                                                py: 1.5,
                                                borderBottom: '1px solid #f3f4f6',
                                                '&:last-child': { borderBottom: 'none' }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                                                        {new Date(r.date).toLocaleDateString()}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                                        NIHSS: {r.nihss_score || 'N/A'} • Notes: {r.notes || 'None'}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default PatientDashboard;