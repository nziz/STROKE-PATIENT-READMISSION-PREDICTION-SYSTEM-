// frontend/src/pages/ReportResults.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Button,
    Paper,
    CircularProgress,
    Divider,
    IconButton,
    Alert,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    GetApp as ExportIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import API from '../api';

const ReportResults = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progressValue, setProgressValue] = useState(0);
    const [exporting, setExporting] = useState(false);

    // Get data from location state (passed from the report form)
    const stateData = location.state;

    useEffect(() => {
        if (stateData && stateData.report_id) {
            // We have data from the form submission
            setReportData(stateData);
            animateMeter(stateData.risk_percentage || stateData.new_risk_score * 100 || 0);
        } else {
            // Fallback: try to fetch from API (if user navigates here directly)
            // We'll show an error instead.
            setLoading(false);
        }
    }, [stateData]);

    const animateMeter = (target) => {
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            setProgressValue(current);
        }, 20);
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
        if (category === 'High') return <WarningIcon sx={{ color: '#dc2626' }} />;
        if (category === 'Medium') return <WarningIcon sx={{ color: '#f59e0b' }} />;
        return <CheckCircleIcon sx={{ color: '#16a34a' }} />;
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'IMMEDIATE': return '#dc2626';
            case 'HIGH': return '#ea580c';
            case 'MEDIUM': return '#f59e0b';
            case 'LOW': return '#16a34a';
            default: return '#6b7280';
        }
    };

    const getPriorityBg = (priority) => {
        switch (priority) {
            case 'IMMEDIATE': return '#fef2f2';
            case 'HIGH': return '#fff7ed';
            case 'MEDIUM': return '#fffbeb';
            case 'LOW': return '#f0fdf4';
            default: return '#f9fafb';
        }
    };

    const handleExport = async () => {
        if (!reportData || !reportData.patient_id) return;
        setExporting(true);
        try {
            const response = await API.get(`patient/${reportData.patient_id}/export-pdf/`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `patient_${reportData.patient_id}_report.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export report.');
        } finally {
            setExporting(false);
        }
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    if (!stateData) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, flexDirection: 'column', alignItems: 'center' }}>
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    No report data found. Please submit a daily report first.
                </Alert>
                <Button variant="contained" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                </Button>
            </Box>
        );
    }

    const riskCategory = reportData.risk_category || 'Low';
    const riskPercentage = reportData.risk_percentage || (reportData.new_risk_score * 100) || 0;
    const riskColor = getRiskColor(riskCategory);
    const recommendations = reportData.recommendations || [];

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            {/* Header with Back Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <IconButton
                    onClick={handleGoBack}
                    sx={{
                        bgcolor: '#f3f4f6',
                        color: '#374151',
                        '&:hover': { bgcolor: '#e5e7eb' },
                    }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0d47a1' }}>
                    Daily Report Results
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ExportIcon />}
                    onClick={handleExport}
                    disabled={exporting}
                    sx={{
                        ml: 'auto',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        borderColor: '#d1d5db',
                        color: '#374151',
                        '&:hover': { borderColor: '#2563eb', color: '#2563eb' },
                    }}
                >
                    {exporting ? <CircularProgress size={20} /> : 'Export PDF'}
                </Button>
            </Box>

            {/* Risk Meter Card */}
            <Card
                sx={{
                    borderRadius: 3,
                    bgcolor: getRiskBgColor(riskCategory),
                    border: `1px solid ${riskColor}40`,
                    mb: 4,
                }}
            >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Readmission Risk Score
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <Box sx={{ width: 180, height: 180 }}>
                            <CircularProgressbar
                                value={progressValue}
                                text={`${Math.round(progressValue)}%`}
                                styles={buildStyles({
                                    pathColor: riskColor,
                                    textColor: riskColor,
                                    trailColor: '#e5e7eb',
                                    textSize: '22px',
                                    pathTransitionDuration: 0.8,
                                })}
                            />
                        </Box>
                        <Box sx={{ textAlign: 'left' }}>
                            <Chip
                                icon={getRiskIcon(riskCategory)}
                                label={`${riskCategory} RISK`}
                                sx={{
                                    bgcolor: getRiskBgColor(riskCategory),
                                    color: riskColor,
                                    fontWeight: 700,
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    p: 1,
                                }}
                            />
                            <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
                                Report ID: {reportData.report_id}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                {new Date().toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Recommendations Section */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon sx={{ color: '#2563eb' }} />
                        Clinical Recommendations
                    </Typography>

                    {recommendations.length === 0 ? (
                        <Typography sx={{ color: '#6b7280' }}>No recommendations available.</Typography>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {recommendations.map((rec, idx) => {
                                const priority = rec.priority || 'STANDARD';
                                const color = getPriorityColor(priority);
                                return (
                                    <Paper
                                        key={idx}
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            borderLeft: `4px solid ${color}`,
                                            bgcolor: getPriorityBg(priority),
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                                                    {rec.action}
                                                </Typography>
                                                {rec.details && (
                                                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
                                                        {rec.details}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Chip
                                                label={priority}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.6rem',
                                                    fontWeight: 600,
                                                    bgcolor: color + '20',
                                                    color: color,
                                                    borderRadius: 1,
                                                    height: 20,
                                                    flexShrink: 0,
                                                }}
                                            />
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Patient Summary */}
            {reportData.patient_name && (
                <Paper sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 3, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Patient Summary</Typography>
                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}><Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>Name</Typography></Grid>
                        <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827' }}>{reportData.patient_name}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>Report Date</Typography></Grid>
                        <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827' }}>{new Date().toLocaleDateString()}</Typography></Grid>
                    </Grid>
                </Paper>
            )}
        </Box>
    );
};

export default ReportResults;