import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import ScheduleFollowupModal from './ScheduleFollowupModal';
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
    Paper,
    IconButton,
    Alert,
} from '@mui/material';
import {
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    LocalHospital as LocalHospitalIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    ArrowBack as ArrowBackIcon,
    Phone as PhoneIcon,
    GetApp as GetAppIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function PatientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [followupModalOpen, setFollowupModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const fetchPatientData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const [patientRes, reportsRes] = await Promise.all([
                API.get(`patient/${id}/`),
                API.get(`patient/${id}/reports/`),
            ]);
            setPatient(patientRes.data);
            setReports(reportsRes.data.reports || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching patient data:', err);
            setError('Patient not found. Please try again.');
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPatientData();
    }, [fetchPatientData]);

    // =========================================================================
    // RISK HELPERS
    // =========================================================================
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

    const getRiskLevel = (score) => {
        if (score >= 0.7) return 'High';
        if (score >= 0.4) return 'Medium';
        return 'Low';
    };

    // =========================================================================
    // EXPORT HELPERS
    // =========================================================================
    const downloadFile = async (url, filename) => {
        setIsExporting(true);
        try {
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
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCSV = () => {
        downloadFile(`/api/patient/${id}/export-csv/`, `patient_${id}_report.csv`);
    };

    const handleExportPDF = () => {
        downloadFile(`/api/patient/${id}/export-pdf/`, `patient_${id}_report.pdf`);
    };

    // =========================================================================
    // RENDER STATES
    // =========================================================================
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <Typography sx={{ color: '#6b7280', fontWeight: 500 }}>
                    Loading patient data...
                </Typography>
            </Box>
        );
    }

    if (error || !patient) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <Typography sx={{ color: '#dc2626', fontWeight: 500 }}>
                    {error || 'Patient not found'}
                </Typography>
            </Box>
        );
    }

    // --- SAFE RISK EXTRACTION ---
    const riskScore = patient.current_risk_score ?? 0;
    const riskCategory = patient.current_risk_category || getRiskLevel(riskScore);
    const riskPercentage = Math.round(riskScore * 100);
    const hasRiskData = patient.current_risk_score !== undefined && patient.current_risk_score !== null;

    // --- RECOMMENDATIONS ---
    const recommendations = patient.recommendations || [];

    // =========================================================================
    // MAIN RENDER
    // =========================================================================
    return (
        <Box>
            {/* ===== HEADER ===== */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                <IconButton
                    onClick={() => navigate(-1)}
                    sx={{
                        bgcolor: '#f3f4f6',
                        color: '#374151',
                        '&:hover': { bgcolor: '#e5e7eb' },
                    }}
                >
                    <ArrowBackIcon />
                </IconButton>

                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        Patient Profile
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.25, fontWeight: 500 }}>
                        {patient.hospital_id || `ID: ${patient.id}`} • Admitted:{' '}
                        {patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}
                    </Typography>
                </Box>

                {/* --- RISK BADGE IN HEADER (Cross-Page Consistency) --- */}
                {hasRiskData && (
                    <Chip
                        icon={getRiskIcon(riskCategory)}
                        label={`${riskCategory} Risk • ${riskPercentage}%`}
                        sx={{
                            ml: 'auto',
                            bgcolor: getRiskBgColor(riskCategory),
                            color: getRiskColor(riskCategory),
                            fontWeight: 700,
                            borderRadius: 2,
                            px: 1,
                            fontSize: '0.85rem',
                        }}
                    />
                )}

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<GetAppIcon sx={{ fontSize: 18 }} />}
                        onClick={handleExportCSV}
                        disabled={isExporting}
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
                        disabled={isExporting}
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
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<LocalHospitalIcon sx={{ fontSize: 18 }} />}
                        onClick={() => setFollowupModalOpen(true)}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#2563eb',
                            px: 2,
                            py: 1,
                            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Schedule Follow-up
                    </Button>
                </Box>
            </Box>

            {/* ===== MAIN CONTENT ===== */}
            <Grid container spacing={3}>
                {/* --- LEFT COLUMN: Patient Info --- */}
                <Grid item xs={12} md={4}>
                    {/* Patient Avatar Card */}
                    <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e5e7eb', mb: 3 }}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                                <Avatar
                                    sx={{
                                        width: 88,
                                        height: 88,
                                        bgcolor: getRiskBgColor(riskCategory),
                                        color: getRiskColor(riskCategory),
                                        fontSize: 32,
                                        fontWeight: 700,
                                        border: '3px solid #e5e7eb',
                                    }}
                                >
                                    {patient.first_name?.charAt(0) || 'P'}
                                    {patient.last_name?.charAt(0) || ''}
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mt: 1.5, fontSize: '1.1rem' }}>
                                    {patient.first_name} {patient.last_name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.25, fontWeight: 500 }}>
                                    {patient.age || 'N/A'} years • {patient.gender || 'N/A'}
                                </Typography>
                                <Chip
                                    icon={getRiskIcon(riskCategory)}
                                    label={riskCategory}
                                    size="small"
                                    sx={{
                                        mt: 1,
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
                                        <PersonIcon sx={{ fontSize: 18 }} />
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                        {patient.age || 'N/A'} years, {patient.gender || 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                        <CalendarIcon sx={{ fontSize: 18 }} />
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                        Admitted: {patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                        <LocalHospitalIcon sx={{ fontSize: 18 }} />
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                        NIHSS Score: {patient.nihss_score ?? 'N/A'}
                                    </Typography>
                                </Box>
                                {patient.phone_number && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                            <PhoneIcon sx={{ fontSize: 18 }} />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                            {patient.phone_number}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Clinical Data Card (CLEANED — removed bad features) */}
                    <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e5e7eb' }}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827', mb: 1.5, fontSize: '0.95rem' }}>
                                Clinical Data
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {[
                                    { label: 'Length of Stay', value: patient.length_of_stay_days ? `${patient.length_of_stay_days} days` : 'N/A' },
                                    { label: 'Discharge Destination', value: patient.discharge_destination || 'Not specified' },
                                    { label: 'NIHSS Score', value: patient.nihss_score ?? 'N/A' },
                                    { label: 'mRS Score', value: patient.mrs_score ?? 'N/A' },
                                ].map((item, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            py: 0.75,
                                            borderBottom: idx < 3 ? '1px solid #f3f4f6' : 'none',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                            {item.label}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                                            {item.value}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* --- RIGHT COLUMN: Risk & Reports --- */}
                <Grid item xs={12} md={8}>
                    {/* Risk Score Card */}
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            bgcolor: getRiskBgColor(riskCategory),
                            border: `1px solid ${getRiskColor(riskCategory)}30`,
                            mb: 3,
                        }}
                    >
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4 }}>
                                <Box sx={{ width: 160, height: 160, flexShrink: 0 }}>
                                    {hasRiskData ? (
                                        <CircularProgressbar
                                            value={riskPercentage}
                                            text={`${riskPercentage}%`}
                                            styles={buildStyles({
                                                pathColor: getRiskColor(riskCategory),
                                                textColor: getRiskColor(riskCategory),
                                                trailColor: '#e5e7eb',
                                                textSize: '20px',
                                                pathTransitionDuration: 0.8,
                                            })}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                border: '3px solid #e5e7eb',
                                                color: '#9ca3af',
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            No Risk Data
                                        </Box>
                                    )}
                                </Box>
                                <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: getRiskColor(riskCategory), fontSize: '1.25rem' }}>
                                        Readmission Risk
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5, mt: 0.5, fontWeight: 500 }}>
                                        Based on clinical data and {reports.length} daily reports
                                    </Typography>
                                    {hasRiskData && (
                                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                                            Last updated: {patient.last_prediction_date ? new Date(patient.last_prediction_date).toLocaleString() : 'N/A'}
                                        </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                                        <Chip
                                            label={`Risk: ${riskCategory}`}
                                            size="small"
                                            sx={{
                                                bgcolor: getRiskBgColor(riskCategory),
                                                color: getRiskColor(riskCategory),
                                                fontWeight: 600,
                                                borderRadius: 2,
                                            }}
                                        />
                                        <Chip
                                            label={`Reports: ${reports.length}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ borderRadius: 2, borderColor: '#d1d5db', color: '#374151', fontWeight: 500 }}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* ===== RECOMMENDATIONS SECTION (NEW) ===== */}
                    {recommendations.length > 0 && (
                        <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e5e7eb', mb: 3 }}>
                            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <InfoIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                                    Clinical Recommendations
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {recommendations.map((rec, idx) => {
                                        const priorityColor =
                                            rec.priority === 'IMMEDIATE' ? '#dc2626' :
                                            rec.priority === 'HIGH' ? '#ea580c' :
                                            rec.priority === 'MEDIUM' ? '#f59e0b' :
                                            rec.priority === 'LOW' ? '#16a34a' :
                                            '#6b7280';
                                        const priorityBg =
                                            rec.priority === 'IMMEDIATE' ? '#fef2f2' :
                                            rec.priority === 'HIGH' ? '#fff7ed' :
                                            rec.priority === 'MEDIUM' ? '#fffbeb' :
                                            rec.priority === 'LOW' ? '#f0fdf4' :
                                            '#f9fafb';
                                        return (
                                            <Paper
                                                key={idx}
                                                elevation={0}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    borderLeft: `4px solid ${priorityColor}`,
                                                    bgcolor: priorityBg,
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
                                                        label={rec.priority || 'STANDARD'}
                                                        size="small"
                                                        sx={{
                                                            fontSize: '0.6rem',
                                                            fontWeight: 600,
                                                            bgcolor: priorityColor + '20',
                                                            color: priorityColor,
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
                            </CardContent>
                        </Card>
                    )}

                    {/* Reports Timeline Card */}
                    <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e5e7eb' }}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem', mb: 2 }}>
                                Daily Reports Timeline
                            </Typography>
                            {reports.length === 0 ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography sx={{ color: '#6b7280', fontWeight: 500 }}>
                                        No reports submitted yet. Submit a report to track risk changes.
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    {reports.slice(0, 7).map((report, index) => {
                                        const symptoms = [];
                                        if (report.has_headache) symptoms.push('Headache');
                                        if (report.has_dizziness) symptoms.push('Dizziness');
                                        if (report.has_weakness) symptoms.push('Weakness');
                                        if (report.has_speech_difficulty) symptoms.push('Speech Difficulty');
                                        if (report.has_vision_changes) symptoms.push('Vision Changes');
                                        if (report.has_fever) symptoms.push('Fever');
                                        if (report.has_swallowing_difficulty) symptoms.push('Swallowing Difficulty');

                                        return (
                                            <Paper
                                                key={index}
                                                elevation={0}
                                                sx={{
                                                    p: 2.5,
                                                    mb: 1.5,
                                                    bgcolor: '#f9fafb',
                                                    borderRadius: 3,
                                                    border: '1px solid #e5e7eb',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        bgcolor: '#f3f4f6',
                                                        borderColor: '#bfdbfe',
                                                        boxShadow: '0 4px 12px rgba(37,99,235,0.06)',
                                                    },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#eff6ff', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600 }}>
                                                            {new Date(report.date).getDate()}
                                                        </Avatar>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                                                            {new Date(report.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                        <Chip
                                                            label={`WB: ${report.well_being_score ?? 'N/A'}/5`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ height: 24, fontSize: '0.7rem', borderRadius: 2, borderColor: '#d1d5db', color: '#374151', fontWeight: 500 }}
                                                        />
                                                        <Chip
                                                            label={report.took_medications ? 'Meds Taken' : 'Meds Missed'}
                                                            size="small"
                                                            sx={{
                                                                height: 24,
                                                                fontSize: '0.7rem',
                                                                borderRadius: 2,
                                                                bgcolor: report.took_medications ? '#f0fdf4' : '#fffbeb',
                                                                color: report.took_medications ? '#16a34a' : '#f59e0b',
                                                                fontWeight: 600,
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                                {symptoms.length > 0 && (
                                                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5 }}>
                                                        {symptoms.map((s) => (
                                                            <Chip
                                                                key={s}
                                                                label={s}
                                                                size="small"
                                                                sx={{
                                                                    height: 22,
                                                                    fontSize: '0.7rem',
                                                                    borderRadius: 2,
                                                                    bgcolor: '#fef2f2',
                                                                    color: '#dc2626',
                                                                    fontWeight: 600,
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
                                                )}
                                                {symptoms.length === 0 && (
                                                    <Typography variant="caption" sx={{ color: '#9ca3af', mt: 1, display: 'block', fontWeight: 500 }}>
                                                        No symptoms reported
                                                    </Typography>
                                                )}
                                                {report.notes && (
                                                    <Typography variant="caption" sx={{ color: '#6b7280', mt: 0.75, display: 'block', fontStyle: 'italic', fontWeight: 500 }}>
                                                        Note: {report.notes}
                                                    </Typography>
                                                )}
                                            </Paper>
                                        );
                                    })}
                                    {reports.length > 7 && (
                                        <Typography variant="body2" sx={{ color: '#6b7280', mt: 1.5, textAlign: 'center', fontWeight: 500 }}>
                                            + {reports.length - 7} more reports
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Schedule Follow-up Modal */}
            <ScheduleFollowupModal
                open={followupModalOpen}
                onClose={() => setFollowupModalOpen(false)}
                patientId={patient.id}
                patientName={`${patient.first_name} ${patient.last_name}`}
            />
        </Box>
    );
}

export default PatientDetail;