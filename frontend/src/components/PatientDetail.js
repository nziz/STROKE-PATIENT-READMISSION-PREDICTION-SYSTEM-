// frontend/src/components/PatientDetail.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import ScheduleFollowupModal from './ScheduleFollowupModal';
import {
    Box, Card, CardContent, Typography, Grid, Chip, Button, Avatar, 
    Divider, Paper, IconButton, Tooltip, Tabs, Tab
} from '@mui/material';
import {
    Person as PersonIcon, CalendarToday as CalendarIcon, LocalHospital as LocalHospitalIcon,
    CheckCircle as CheckCircleIcon, Warning as WarningIcon, ArrowBack as ArrowBackIcon,
    Phone as PhoneIcon, GetApp as GetAppIcon, Info as InfoIcon, Assignment as AssignmentIcon,
    Download as DownloadIcon
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
    const [tabValue, setTabValue] = useState(0); // NEW: Tab State

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

    const getRiskColor = (category) => ({ High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' }[category] || '#6b7280');
    const getRiskBgColor = (category) => ({ High: '#fef2f2', Medium: '#fffbeb', Low: '#f0fdf4' }[category] || '#f9fafb');
    const getRiskIcon = (category) => {
        if (category === 'High') return <WarningIcon sx={{ color: '#dc2626' }} />;
        if (category === 'Medium') return <WarningIcon sx={{ color: '#f59e0b' }} />;
        return <CheckCircleIcon sx={{ color: '#16a34a' }} />;
    };
    const getRiskLevel = (score) => (score >= 0.7 ? 'High' : score >= 0.4 ? 'Medium' : 'Low');

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

    const handleExportCSV = () => downloadFile(`/api/patient/${id}/export-csv/`, `Clinical_Data_${id}.csv`);
    const handleExportPDF = () => downloadFile(`/api/patient/${id}/export-pdf/`, `Clinical_Report_${id}.pdf`);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Typography sx={{ color: '#6b7280', fontWeight: 500 }}>Loading clinical profile...</Typography>
            </Box>
        );
    }

    if (error || !patient) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Typography sx={{ color: '#dc2626', fontWeight: 500 }}>{error || 'Patient not found'}</Typography>
            </Box>
        );
    }

    const riskScore = patient.risk_score ?? patient.current_risk_score ?? 0;
    const riskCategory = patient.risk_category || patient.current_risk_category || getRiskLevel(riskScore);
    const riskPercentage = Math.round(riskScore * 100);
    const hasRiskData = (patient.risk_score !== undefined && patient.risk_score !== null) || 
                        (patient.current_risk_score !== undefined && patient.current_risk_score !== null);
    const recommendations = patient.recommendations || [];
    const severeSymptoms = ['Weakness', 'Speech Difficulty', 'Vision Changes', 'Swallowing Difficulty'];

    return (
        <Box>
            {/* ===== HEADER ===== */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                <Tooltip title="Back to Directory">
                    <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: '#f3f4f6', color: '#374151', '&:hover': { bgcolor: '#e5e7eb' } }}>
                        <ArrowBackIcon />
                    </IconButton>
                </Tooltip>
                
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0d47a1', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                        Clinical Profile
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.25, fontWeight: 500 }}>
                        {patient.first_name} {patient.last_name} • {patient.hospital_id || `ID: ${patient.id}`}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Tooltip title="Export Raw CSV Data">
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />} onClick={handleExportCSV} disabled={isExporting}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#475569', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
                            CSV
                        </Button>
                    </Tooltip>
                    <Tooltip title="Export Medical PDF Report">
                        <Button variant="outlined" size="small" startIcon={<GetAppIcon sx={{ fontSize: 16 }} />} onClick={handleExportPDF} disabled={isExporting}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#475569', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' } }}>
                            PDF Report
                        </Button>
                    </Tooltip>
                    <Button variant="contained" size="small" startIcon={<CalendarIcon sx={{ fontSize: 16 }} />} onClick={() => setFollowupModalOpen(true)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#0d47a1', px: 2.5, boxShadow: '0 2px 4px rgba(13,71,161,0.2)', '&:hover': { bgcolor: '#0a3a80' } }}>
                        Schedule Follow-up
                    </Button>
                </Box>
            </Box>

            {/* ===== MAIN CONTENT ===== */}
            <Grid container spacing={3}>
                {/* --- LEFT COLUMN: Patient Info --- */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e5e7eb', mb: 3, overflow: 'hidden' }}>
                        <Box sx={{ bgcolor: '#f8fafc', p: 2.5, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 56, height: 56, bgcolor: getRiskBgColor(riskCategory), color: getRiskColor(riskCategory), fontSize: 22, fontWeight: 700, border: '2px solid #ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                {patient.first_name?.charAt(0) || 'P'}{patient.last_name?.charAt(0) || ''}
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                                    {patient.first_name} {patient.last_name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                    {patient.age || 'N/A'} years • {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            <Box sx={{ p: 2.5 }}>
                                <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', fontSize: '0.7rem' }}>Contact & Admission</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <PhoneIcon sx={{ fontSize: 18, color: '#64748b' }} />
                                        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>{patient.phone_number || 'No phone on file'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <CalendarIcon sx={{ fontSize: 18, color: '#64748b' }} />
                                        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500 }}>Admitted: {patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                            <Divider />
                            <Box sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
                                <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', fontSize: '0.7rem' }}>Clinical Baseline</Typography>
                                <Grid container spacing={2} sx={{ mt: 1.5 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>NIHSS Score</Typography>
                                        <Typography variant="body1" sx={{ color: '#0f172a', fontWeight: 700 }}>{patient.nihss_score ?? 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>Length of Stay</Typography>
                                        <Typography variant="body1" sx={{ color: '#0f172a', fontWeight: 700 }}>{patient.length_of_stay_days ? `${patient.length_of_stay_days}d` : 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>Discharge Destination</Typography>
                                        <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600, textTransform: 'capitalize' }}>{patient.discharge_destination || 'Not specified'}</Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* --- RIGHT COLUMN: Tabbed View --- */}
                <Grid item xs={12} md={8}>
                    <Card elevation={0} sx={{ borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        {/* TABS HEADER */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
                            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem', px: 3 } }}>
                                <Tab label="Clinical Overview" />
                                <Tab label={`Monitoring History (${reports.length})`} />
                            </Tabs>
                        </Box>

                        {/* TAB 1: OVERVIEW (Risk & Recommendations) */}
                        {tabValue === 0 && (
                            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                {/* Risk Meter */}
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4, mb: 4, p: 2, bgcolor: getRiskBgColor(riskCategory), borderRadius: 3, border: `1px solid ${getRiskColor(riskCategory)}30` }}>
                                    <Box sx={{ width: 140, height: 140, flexShrink: 0 }}>
                                        {hasRiskData ? (
                                            <CircularProgressbar
                                                value={riskPercentage}
                                                text={`${riskPercentage}%`}
                                                styles={buildStyles({ pathColor: getRiskColor(riskCategory), textColor: getRiskColor(riskCategory), trailColor: '#e5e7eb', textSize: '22px', pathTransitionDuration: 0.8 })}
                                            />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '3px solid #e5e7eb', color: '#9ca3af', fontWeight: 600, fontSize: '0.9rem' }}>No Data</Box>
                                        )}
                                    </Box>
                                    <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: getRiskColor(riskCategory), fontSize: '1.3rem' }}>Readmission Risk</Typography>
                                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5, mt: 0.5, fontWeight: 500 }}>Based on clinical baseline and daily reports</Typography>
                                        <Chip icon={getRiskIcon(riskCategory)} label={`${riskCategory} Risk`} size="small" sx={{ bgcolor: '#ffffff', color: getRiskColor(riskCategory), fontWeight: 700, borderRadius: 2, border: `1px solid ${getRiskColor(riskCategory)}40` }} />
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 3 }} />

                                {/* Recommendations */}
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', fontSize: '1rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <InfoIcon sx={{ color: '#2563eb', fontSize: 20 }} /> Active Clinical Recommendations
                                </Typography>
                                {recommendations.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {recommendations.map((rec, idx) => {
                                            const pColor = rec.priority === 'IMMEDIATE' ? '#dc2626' : rec.priority === 'HIGH' ? '#ea580c' : rec.priority === 'MEDIUM' ? '#f59e0b' : rec.priority === 'LOW' ? '#16a34a' : '#6b7280';
                                            const pBg = rec.priority === 'IMMEDIATE' ? '#fef2f2' : rec.priority === 'HIGH' ? '#fff7ed' : rec.priority === 'MEDIUM' ? '#fffbeb' : rec.priority === 'LOW' ? '#f0fdf4' : '#f9fafb';
                                            return (
                                                <Paper key={idx} elevation={0} sx={{ p: 2, borderRadius: 2, borderLeft: `4px solid ${pColor}`, bgcolor: pBg }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827' }}>{rec.action}</Typography>
                                                            {rec.details && <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', mt: 0.5 }}>{rec.details}</Typography>}
                                                        </Box>
                                                        <Chip label={rec.priority || 'STANDARD'} size="small" sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: pColor + '20', color: pColor, borderRadius: 1, height: 22, flexShrink: 0 }} />
                                                    </Box>
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px dashed #bbf7d0' }}>
                                        <CheckCircleIcon sx={{ color: '#16a34a', mb: 1 }} />
                                        <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600 }}>Standard Protocol</Typography>
                                        <Typography variant="caption" sx={{ color: '#4b5563' }}>No acute interventions required. Continue standard monitoring.</Typography>
                                    </Box>
                                )}
                            </CardContent>
                        )}

                        {/* TAB 2: HISTORY (Timeline) */}
                        {tabValue === 1 && (
                            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', fontSize: '1rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AssignmentIcon sx={{ color: '#0d47a1', fontSize: 20 }} /> Daily Monitoring Timeline
                                </Typography>
                                {reports.length === 0 ? (
                                    <Box sx={{ py: 6, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                                        <Typography sx={{ color: '#64748b', fontWeight: 500 }}>No daily reports submitted yet.</Typography>
                                    </Box>
                                ) : (
                                    <Box>
                                        {reports.map((report, index) => {
                                            const symptoms = [];
                                            if (report.has_headache) symptoms.push('Headache');
                                            if (report.has_dizziness) symptoms.push('Dizziness');
                                            if (report.has_weakness) symptoms.push('Weakness');
                                            if (report.has_speech_difficulty) symptoms.push('Speech Difficulty');
                                            if (report.has_vision_changes) symptoms.push('Vision Changes');
                                            if (report.has_fever) symptoms.push('Fever');
                                            if (report.has_swallowing_difficulty) symptoms.push('Swallowing Difficulty');

                                            return (
                                                <Paper key={index} elevation={0} sx={{ p: 2.5, mb: 1.5, bgcolor: '#f9fafb', borderRadius: 3, border: '1px solid #e5e7eb' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Avatar sx={{ width: 36, height: 36, bgcolor: '#eff6ff', color: '#2563eb', fontSize: '0.85rem', fontWeight: 700 }}>
                                                                {new Date(report.date).getDate()}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827' }}>
                                                                    {new Date(report.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                                                                    Well-being: {report.well_being_score ?? 'N/A'}/5
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                        <Chip
                                                            label={report.took_medications ? 'Meds Taken' : 'Meds Missed'}
                                                            size="small"
                                                            sx={{
                                                                height: 26, fontSize: '0.75rem', borderRadius: 2, fontWeight: 700,
                                                                bgcolor: report.took_medications ? '#f0fdf4' : '#fef2f2',
                                                                color: report.took_medications ? '#16a34a' : '#dc2626',
                                                                border: `1px solid ${report.took_medications ? '#bbf7d0' : '#fecaca'}`
                                                            }}
                                                        />
                                                    </Box>
                                                    
                                                    {symptoms.length > 0 && (
                                                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 2 }}>
                                                            {symptoms.map((s) => {
                                                                const isSevere = severeSymptoms.includes(s);
                                                                return (
                                                                    <Chip key={s} label={s} size="small"
                                                                        sx={{
                                                                            height: 24, fontSize: '0.7rem', borderRadius: 2, fontWeight: 600,
                                                                            bgcolor: isSevere ? '#fef2f2' : '#fffbeb',
                                                                            color: isSevere ? '#dc2626' : '#d97706',
                                                                            border: `1px solid ${isSevere ? '#fecaca' : '#fde68a'}`
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </Box>
                                                    )}
                                                    {symptoms.length === 0 && (
                                                        <Typography variant="caption" sx={{ color: '#16a34a', mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                                            <CheckCircleIcon sx={{ fontSize: 14 }} /> No symptoms reported
                                                        </Typography>
                                                    )}
                                                    {report.notes && (
                                                        <Typography variant="caption" sx={{ color: '#475569', mt: 1.5, display: 'block', fontStyle: 'italic', bgcolor: '#ffffff', p: 1.5, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                                                            "{report.notes}"
                                                        </Typography>
                                                    )}
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                )}
                            </CardContent>
                        )}
                    </Card>
                </Grid>
            </Grid>

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