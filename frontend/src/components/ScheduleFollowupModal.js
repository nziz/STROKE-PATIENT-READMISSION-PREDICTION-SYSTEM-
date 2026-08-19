// frontend/src/components/ScheduleFollowupModal.js
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';
import API from '../api';

function ScheduleFollowupModal({ open, onClose, patientId, patientName }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [title, setTitle] = useState('Follow-up Appointment');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async () => {
        if (!date || !time) {
            setError('Please select both date and time.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await API.post(`patient/${patientId}/followup/`, {
                date,
                time,
                title,
                notes,
            });
            setSuccess(response.data.message);
            setTimeout(() => {
                onClose();
                window.location.reload(); // Refresh to show new notification
            }, 1500);
        } catch (err) {
            console.error('Error scheduling follow-up:', err);
            setError('Failed to schedule follow-up. Please try again.');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                📅 Schedule Follow-up
                <Typography variant="caption" display="block" color="text.secondary">
                    Patient: {patientName}
                </Typography>
            </DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <TextField
                    fullWidth
                    label="Appointment Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    margin="normal"
                />

                <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    fullWidth
                    label="Time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    fullWidth
                    label="Notes (optional)"
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    margin="normal"
                    placeholder="Any additional instructions or notes..."
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? 'Scheduling...' : 'Schedule'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ScheduleFollowupModal;