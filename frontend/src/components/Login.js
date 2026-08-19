// frontend/src/components/Login.js
import React, { useState, useEffect } from 'react';
import API from '../api';
import { loginUser } from '../api/auth';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    InputAdornment,
    IconButton,
    Divider,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    MedicalServices as MedicalIcon,
} from '@mui/icons-material';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCSRF = async () => {
            try {
                await API.get('csrf/');
                console.log('CSRF cookie set');
            } catch (err) {
                console.warn('CSRF fetch failed (cookie may already exist):', err.message);
            }
        };
        fetchCSRF();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const user = username.trim();
        const pass = password.trim();

        if (!user || !pass) {
            setError('Please enter both username and password.');
            setLoading(false);
            return;
        }

        try {
            const result = await loginUser(user, pass);
            if (result.success) {
                localStorage.setItem(
                    'user',
                    JSON.stringify({
                        username: result.username,
                        role: result.role,
                        patient_id: result.patient_id || null,
                        name: result.name,
                    })
                );
                const redirectPath = result.role === 'patient' ? '/patient-dashboard' : '/';
                window.location.href = redirectPath;
                return;
            } else {
                setError(result.error || 'Invalid credentials.');
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Backend login failed:', err);
            setError('An error occurred during login. Please try again.');
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    const textFieldSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: '#ffffff',
            '& fieldset': { borderColor: '#d1d5db' },
            '&:hover fieldset': { borderColor: '#9ca3af' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: 2 },
            '& input': { 
                color: '#111827',
                fontWeight: 500,
                fontSize: '0.95rem',
            },
            '& input::placeholder': { 
                color: '#9ca3af',
                opacity: 0.8,
            },
        },
        '& .MuiInputLabel-root': { 
            color: '#6b7280',
            fontWeight: 500,
            '&.Mui-focused': { color: '#2563eb' },
        },
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f9fafb',
                p: 2,
            }}
        >
            <Card
                elevation={0}
                sx={{
                    maxWidth: 440,
                    width: '100%',
                    borderRadius: 3,
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    bgcolor: '#ffffff',
                }}
            >
                <Box sx={{ bgcolor: '#2563eb', p: 4, textAlign: 'center', color: '#fff' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1.5,
                            mb: 1,
                        }}
                    >
                        <MedicalIcon sx={{ fontSize: 36 }} />
                        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
                            StrokeReadmit
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                        Stroke Patient Readmission Prediction System
                    </Typography>
                </Box>

                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                        Welcome Back
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 3, mt: 0.5, fontWeight: 500 }}>
                        Sign in to access your dashboard
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontWeight: 500 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            margin="normal"
                            required
                            placeholder="Enter your username"
                            sx={{ ...textFieldSx, mt: 0.5 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon sx={{ color: '#9ca3af', fontSize: 20, mr: 1 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                            placeholder="Enter your password"
                            sx={{ ...textFieldSx, mt: 2 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon sx={{ color: '#9ca3af', fontSize: 20, mr: 1 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={togglePasswordVisibility}
                                            edge="end"
                                            sx={{ color: '#9ca3af', '&:hover': { color: '#6b7280' }, mr: 0.5 }}
                                        >
                                            {showPassword ? (
                                                <VisibilityOffIcon sx={{ fontSize: 20 }} />
                                            ) : (
                                                <VisibilityIcon sx={{ fontSize: 20 }} />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{
                                mt: 3,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 600,
                                bgcolor: '#2563eb',
                                boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                                '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <Divider sx={{ my: 3, borderColor: '#f3f4f6' }}>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, px: 1 }}>
                            Secure Access
                        </Typography>
                    </Divider>
                    <Typography
                        variant="caption"
                        sx={{ display: 'block', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}
                    >
                        Contact your healthcare provider for credentials
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}

export default Login;