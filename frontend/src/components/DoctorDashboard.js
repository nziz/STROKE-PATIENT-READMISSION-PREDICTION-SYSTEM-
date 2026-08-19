import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import {
    People as PeopleIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as AssignmentIcon,
    Add as AddIcon,
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

function DoctorDashboard() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await API.get('doctor/dashboard/');
            setPatients(response.data.patients || []);
            setStats({
                total: response.data.total_patients || 0,
                high: response.data.high_risk_count || 0,
                medium: response.data.medium_risk_count || 0,
                low: response.data.low_risk_count || 0,
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (category) => {
        const colors = { High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' };
        return colors[category] || '#6b7280';
    };

    const statCards = [
        {
            title: 'Total Patients',
            value: stats.total,
            icon: <PeopleIcon sx={{ fontSize: 24 }} />,
            color: '#2563eb',
            lightColor: '#eff6ff',
        },
        {
            title: 'High Risk',
            value: stats.high,
            icon: <WarningIcon sx={{ fontSize: 24 }} />,
            color: '#dc2626',
            lightColor: '#fef2f2',
        },
        {
            title: 'Medium Risk',
            value: stats.medium,
            icon: <TrendingUpIcon sx={{ fontSize: 24 }} />,
            color: '#f59e0b',
            lightColor: '#fffbeb',
        },
        {
            title: 'Low Risk',
            value: stats.low,
            icon: <CheckCircleIcon sx={{ fontSize: 24 }} />,
            color: '#16a34a',
            lightColor: '#f0fdf4',
        },
    ];

    const barData = patients.map((p) => ({
        name: p.name.length > 10 ? p.name.substring(0, 10) + '…' : p.name,
        risk: Math.round(p.risk_score * 100),
    }));

    const pieData = [
        { name: 'High Risk', value: stats.high, color: '#dc2626' },
        { name: 'Medium Risk', value: stats.medium, color: '#f59e0b' },
        { name: 'Low Risk', value: stats.low, color: '#16a34a' },
    ].filter((d) => d.value > 0);

    const trendData = [
        { day: 'Mon', risk: 0.35 },
        { day: 'Tue', risk: 0.42 },
        { day: 'Wed', risk: 0.38 },
        { day: 'Thu', risk: 0.55 },
        { day: 'Fri', risk: 0.48 },
        { day: 'Sat', risk: 0.52 },
        { day: 'Sun', risk: 0.45 },
    ];

    // Custom tooltip for cleaner look
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                        {label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600, mt: 0.5 }}>
                        {payload[0].name}: {payload[0].value}%
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                <Typography color="text.secondary">Loading dashboard…</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                        Real-time stroke patient readmission risk overview
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AssignmentIcon sx={{ fontSize: 18 }} />}
                        onClick={() => navigate('/patients')}
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
                        View All Patients
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                        onClick={() => navigate('/register')}
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
                        Register Patient
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {statCards.map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                bgcolor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
                                    borderColor: '#d1d5db',
                                },
                            }}
                        >
                            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: '#6b7280',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                fontSize: '0.7rem',
                                            }}
                                        >
                                            {stat.title}
                                        </Typography>
                                        <Typography
                                            variant="h3"
                                            sx={{
                                                fontWeight: 700,
                                                color: stat.color,
                                                lineHeight: 1.2,
                                                mt: 1,
                                                fontSize: '2.25rem',
                                            }}
                                        >
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 2.5,
                                            bgcolor: stat.lightColor,
                                            color: stat.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {stat.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Charts — Equal 3-column grid */}
            <Grid container spacing={3}>
                {/* Bar Chart */}
                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            bgcolor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            height: '100%',
                        }}
                    >
                        <CardContent sx={{ p: 3, height: 380, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <BarChartIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
                                    Risk Distribution by Patient
                                </Typography>
                            </Box>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#9ca3af"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#9ca3af"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                                    <Bar
                                        dataKey="risk"
                                        fill="#2563eb"
                                        name="Risk Score"
                                        radius={[6, 6, 0, 0]}
                                        barSize={patients.length === 1 ? 60 : 32}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Donut Chart */}
                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            bgcolor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            height: '100%',
                        }}
                    >
                        <CardContent sx={{ p: 3, height: 380, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <PieChartIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
                                    Risk Breakdown
                                </Typography>
                            </Box>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => (
                                            <span style={{ color: '#374151', fontSize: '0.8rem', fontWeight: 500 }}>
                                                {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Line Chart */}
                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            bgcolor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            height: '100%',
                        }}
                    >
                        <CardContent sx={{ p: 3, height: 380, '&:last-child': { pb: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <ShowChartIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
                                    Risk Trend
                                </Typography>
                            </Box>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        stroke="#9ca3af"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#9ca3af"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 1]}
                                        tickFormatter={(v) => `${Math.round(v * 100)}%`}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload?.length) {
                                                return (
                                                    <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                                        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                                                            {label}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600, mt: 0.5 }}>
                                                            Avg Risk: {Math.round(payload[0].value * 100)}%
                                                        </Typography>
                                                    </Box>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="risk"
                                        stroke="#2563eb"
                                        strokeWidth={2.5}
                                        dot={{ fill: '#2563eb', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name="Avg Risk"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default DoctorDashboard;