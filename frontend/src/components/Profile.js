// frontend/src/components/Profile.js
import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Avatar,
    Divider,
    Chip,
    Grid,
    Button,
    Tooltip,
} from '@mui/material';
import {
    Person as PersonIcon,
    Email as EmailIcon,
    Badge as BadgeIcon,
    CalendarToday as CalendarIcon,
    CameraAlt as CameraIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';

function Profile() {
    const user = {
        name: 'Dr. Octave',
        username: 'doctor',
        role: 'Neurologist',
        department: 'Neurology',
        email: 'doctor@hospital.rw',
        joined: '2026-07-01',
    };

    const fileInputRef = useRef(null);
    const [profileImage, setProfileImage] = useState(null);

    // Load saved image from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('profile_image');
        if (saved) setProfileImage(saved);
    }, []);

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be under 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            setProfileImage(base64);
            localStorage.setItem('profile_image', base64);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setProfileImage(null);
        localStorage.removeItem('profile_image');
    };

    const cardHoverSx = {
        borderRadius: 3,
        bgcolor: '#ffffff',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s ease',
        maxWidth: 600,
        '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
            borderColor: '#d1d5db',
        },
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                    Profile
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                    View and manage your account information
                </Typography>
            </Box>

            <Card elevation={0} sx={cardHoverSx}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    {/* Avatar + Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ position: 'relative' }}>
                            <Tooltip title="Click to upload photo">
                                <Avatar
                                    src={profileImage || undefined}
                                    sx={{
                                        width: 88,
                                        height: 88,
                                        bgcolor: '#2563eb',
                                        fontSize: 32,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: '3px solid #e5e7eb',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 0 0 4px rgba(37,99,235,0.2)',
                                            borderColor: '#bfdbfe',
                                        },
                                    }}
                                    onClick={handleImageClick}
                                >
                                    {!profileImage && user.name.charAt(0)}
                                </Avatar>
                            </Tooltip>
                            {/* Camera badge */}
                            <Box
                                onClick={handleImageClick}
                                sx={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    bgcolor: '#2563eb',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    border: '2px solid #fff',
                                    boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                <CameraIcon sx={{ fontSize: 14 }} />
                            </Box>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </Box>

                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.25rem' }}>
                                {user.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.25, fontWeight: 500 }}>
                                {user.role} • {user.department}
                            </Typography>
                            <Chip
                                label="Doctor"
                                size="small"
                                sx={{
                                    mt: 0.75,
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    border: '1px solid #bfdbfe',
                                }}
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2.5, borderColor: '#f3f4f6' }} />

                    {/* Info Grid */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                    <PersonIcon sx={{ fontSize: 18 }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                                        Username
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                                        {user.username}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                    <EmailIcon sx={{ fontSize: 18 }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                                        Email
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                                        {user.email}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                    <BadgeIcon sx={{ fontSize: 18 }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                                        Role
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                                        {user.role}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                    <CalendarIcon sx={{ fontSize: 18 }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, display: 'block' }}>
                                        Joined
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                                        {new Date(user.joined).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2.5, borderColor: '#f3f4f6' }} />

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CameraIcon sx={{ fontSize: 18 }} />}
                            onClick={handleImageClick}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                borderColor: '#d1d5db',
                                color: '#374151',
                                '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                            }}
                        >
                            {profileImage ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        {profileImage && (
                            <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
                                onClick={handleRemoveImage}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    borderColor: '#dc2626',
                                    color: '#dc2626',
                                    '&:hover': { bgcolor: '#fef2f2', borderColor: '#dc2626' },
                                }}
                            >
                                Remove Photo
                            </Button>
                        )}
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, ml: 'auto' }}>
                            Max file size: 2MB
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 2.5, borderColor: '#f3f4f6' }} />

                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>
                        Account settings and preferences will be available in the next version.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}

export default Profile;