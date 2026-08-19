// frontend/src/components/Chatbot.js
import React, { useState } from 'react';
import {
    Box,
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    TextField,
    Button,
    List,
    ListItem,
    Paper,
    Typography,
    Chip,
    Divider,
    Stack,
    Avatar,
} from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    SmartToy as SmartToyIcon,
    Chat as ChatIcon,
} from '@mui/icons-material';

const faqs = [
    {
        keywords: ['stroke', 'what is stroke'],
        question: 'What is a stroke?',
        answer: 'A stroke occurs when blood flow to part of the brain is blocked or reduced, preventing brain tissue from getting oxygen and nutrients. Brain cells begin to die within minutes. Seek immediate medical attention if you suspect a stroke.'
    },
    {
        keywords: ['symptom', 'symptoms', 'signs'],
        question: 'What are stroke symptoms?',
        answer: 'Common symptoms include:\n• Sudden numbness or weakness in face, arm, or leg (especially on one side)\n• Sudden confusion, trouble speaking or understanding speech\n• Sudden trouble seeing in one or both eyes\n• Sudden trouble walking, dizziness, loss of balance\n• Sudden severe headache with no known cause\n\nRemember: Act FAST (Face, Arms, Speech, Time).'
    },
    {
        keywords: ['prevent', 'prevention', 'avoid'],
        question: 'How to prevent stroke?',
        answer: 'To reduce stroke risk:\n• Maintain healthy blood pressure (below 120/80)\n• Exercise regularly (at least 30 minutes daily)\n• Eat a heart-healthy diet (fruits, vegetables, whole grains)\n• Avoid smoking and limit alcohol\n• Manage stress and diabetes\n• Take medications as prescribed'
    },
    {
        keywords: ['readmission', 'risk', 'readmission risk'],
        question: 'What is readmission risk?',
        answer: 'Readmission risk is the likelihood of being hospitalized again within 30 days after discharge. Our system uses machine learning (Random Forest + XGBoost) to analyze your clinical data and daily symptom reports to predict this risk and help doctors provide better care.'
    },
    {
        keywords: ['ml', 'machine learning', 'algorithm', 'predict'],
        question: 'How is risk calculated?',
        answer: 'Our system uses two powerful machine learning algorithms: Random Forest and XGBoost. They analyze multiple factors including your age, stroke severity (NIHSS score), risk factors, daily symptoms, and medication adherence to predict your 30-day readmission risk with high accuracy.'
    },
    {
        keywords: ['daily report', 'report', 'submit'],
        question: 'How do I submit a daily report?',
        answer: 'Log in to your patient account, go to "Daily Reports" from the sidebar, and fill in the form. Report any symptoms you\'re experiencing, whether you took your medications, and rate your well-being. This helps us track your recovery and adjust your risk score.'
    },
    {
        keywords: ['emergency', 'panic', 'urgent'],
        question: 'What to do in an emergency?',
        answer: ' If you\'re having a medical emergency:\n1. Call emergency services immediately: 📞 112 or 999\n2. Use the RED "Panic Button" at the bottom right corner\n3. Contact your doctor or go to the nearest hospital\n\nDo NOT wait — stroke is a medical emergency!'
    },
    {
        keywords: ['medication', 'meds', 'drugs'],
        question: 'Why are medications important?',
        answer: 'Taking medications as prescribed is crucial for stroke recovery and prevention. They help:\n• Control blood pressure\n• Prevent blood clots\n• Reduce cholesterol\n• Manage diabetes\n• Prevent another stroke\n\nAlways take your medications on time. If you miss a dose, take it as soon as you remember, but never double dose.'
    },
    {
        keywords: ['recovery', 'rehab', 'therapy'],
        question: 'What helps with recovery?',
        answer: 'Stroke recovery involves:\n• Physical therapy (to regain movement)\n• Speech therapy (for communication)\n• Occupational therapy (for daily tasks)\n• Regular follow-up appointments\n• Healthy lifestyle (diet, exercise, sleep)\n• Mental health support\n\nRecovery is a journey — be patient and consistent!'
    },
];

function Chatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            text: 'Hello! I\'m your health assistant. Ask me about stroke, symptoms, prevention, readmission risk, or daily reports.',
            sender: 'bot'
        },
    ]);
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const findAnswer = (query) => {
        const lowerQuery = query.toLowerCase();

        let bestMatch = null;
        let bestScore = 0;

        for (const faq of faqs) {
            let score = 0;
            for (const keyword of faq.keywords) {
                if (lowerQuery.includes(keyword)) {
                    score += 1;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = faq;
            }
        }

        if (bestMatch && bestScore > 0) {
            return bestMatch.answer;
        }

        return null;
    };

    const getSuggestions = () => faqs.map(f => f.question).slice(0, 6);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);

        const answer = findAnswer(input);

        let botResponse = "I’m not sure about that. Please ask about stroke, symptoms, prevention, readmission risk, or medications. Here are some questions you can ask:";
        if (answer) {
            botResponse = answer;
        }

        setTimeout(() => {
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
            if (!answer) {
                setSuggestions(getSuggestions());
            } else {
                setSuggestions([]);
            }
        }, 500);

        setInput('');
    };

    return (
        <>
            <Fab
                aria-label="Open health assistant"
                onClick={handleOpen}
                sx={{
                    position: 'fixed',
                    bottom: 112,
                    right: 28,
                    zIndex: 9998,
                    width: 64,
                    height: 64,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 20px 35px rgba(37, 99, 235, 0.42)',
                    color: '#fff',
                    border: '2px solid rgba(255,255,255,0.72)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                        transform: 'translateY(-2px) scale(1.01)',
                    },
                    transition: 'all 0.2s ease',
                }}
            >
                <SmartToyIcon sx={{ fontSize: 28 }} />
            </Fab>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                    },
                }}
            >
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2.5,
                        py: 2,
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        borderBottom: '1px solid #dbeafe',
                    }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 40, height: 40, bgcolor: '#2563eb', boxShadow: '0 10px 18px rgba(37,99,235,0.25)' }}>
                                <ChatIcon fontSize="small" />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                    Care Assistant
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Health support
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton onClick={handleClose} aria-label="Close chatbot" sx={{ color: '#0f172a', '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    <Box sx={{ height: 450, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f8fafc' }}>
                            <List sx={{ p: 0 }}>
                                {messages.map((msg, idx) => (
                                    <ListItem key={idx} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', px: 0, py: 0.75 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                maxWidth: '85%',
                                                bgcolor: msg.sender === 'user' ? '#1d4ed8' : '#ffffff',
                                                color: msg.sender === 'user' ? '#fff' : '#0f172a',
                                                borderRadius: 2,
                                                whiteSpace: 'pre-line',
                                                border: msg.sender === 'bot' ? '1px solid #e2e8f0' : 'none',
                                                boxShadow: msg.sender === 'bot' ? '0 5px 12px rgba(15, 23, 42, 0.05)' : 'none',
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                                {msg.text}
                                            </Typography>
                                        </Paper>
                                    </ListItem>
                                ))}
                                {suggestions.length > 0 && (
                                    <Box sx={{ pt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {suggestions.map((s, idx) => (
                                            <Chip
                                                key={idx}
                                                label={s}
                                                size="small"
                                                onClick={() => {
                                                    setInput(s);
                                                    setTimeout(() => handleSend(), 100);
                                                }}
                                                sx={{
                                                    cursor: 'pointer',
                                                    bgcolor: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    border: '1px solid #bfdbfe',
                                                    fontWeight: 600,
                                                    '&:hover': { bgcolor: '#dbeafe' },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </List>
                        </Box>

                        <Divider />

                        <Box sx={{ p: 2, display: 'flex', gap: 1.25, bgcolor: '#ffffff' }}>
                            <TextField
                                fullWidth
                                placeholder="Ask about symptoms, prevention, or recovery..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        backgroundColor: '#f8fafc',
                                    },
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleSend}
                                sx={{
                                    minWidth: 52,
                                    borderRadius: 2,
                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                    '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' },
                                }}
                            >
                                <SendIcon />
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default Chatbot;