// frontend/src/components/Chatbot.js
import React, { useState, useRef, useEffect } from 'react';
import API from '../api'; // IMPORTED API
import {
    Box, Fab, Typography, TextField, IconButton, Avatar, 
    Chip, Slide, Badge
} from '@mui/material';
import {
    Close as CloseIcon, Send as SendIcon, SmartToy as BotIcon, 
    Chat as ChatIcon
} from '@mui/icons-material';

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const [messages, setMessages] = useState([
        { 
            id: 1, 
            sender: 'bot', 
            text: "Muraho! Welcome to Gihundwe Hospital Stroke Care. I am your AI Care Assistant.\n\nI speak English, Kinyarwanda, French, and Swahili. How can I help you today?\n\n⚠️ Disclaimer: I am an AI. For medical emergencies, please use the Panic Button.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    const handleSend = async (textToSend) => {
        const userText = (textToSend || input).trim();
        if (!userText) return;

        const userMsg = { id: Date.now(), sender: 'user', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Call the Django AI Backend
            const res = await API.post('chatbot/', { message: userText });
            const botText = res.data.reply || "I'm sorry, I couldn't process that.";
            const botMsg = { id: Date.now() + 1, sender: 'bot', text: botText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            const errorMsg = { id: Date.now() + 1, sender: 'bot', text: "I'm having trouble connecting to the hospital network right now. Please try again.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    // Quick replies in multiple languages to show off the AI!
    const quickReplies = [
        "How is my risk calculated?", 
        "Nakora iki nibagiwe imiti?", // Kinyarwanda: What if I forget my meds?
        "Régime alimentaire recommandé", // French: Recommended diet
        "Nifadili nini?" // Swahili: What should I eat?
    ];

    return (
        <>
            {/* FLOATING ACTION BUTTON */}
            <Box sx={{ position: 'fixed', bottom: 110, right: 28, zIndex: 1200 }}>
                <Badge color="success" variant="dot" invisible={isOpen} overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ '& .MuiBadge-badge': { width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff' } }}>
                    <Fab
                        onClick={() => setIsOpen(!isOpen)}
                        sx={{
                            bgcolor: isOpen ? '#6b7280' : '#0d47a1', color: '#fff', width: 56, height: 56,
                            boxShadow: '0 8px 24px rgba(13, 71, 161, 0.3)', transition: 'all 0.3s ease',
                            '&:hover': { bgcolor: isOpen ? '#4b5563' : '#0a3a80', transform: 'scale(1.05)' }
                        }}
                    >
                        {isOpen ? <CloseIcon /> : <ChatIcon />}
                    </Fab>
                </Badge>
            </Box>

            {/* CHAT WINDOW */}
            <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
                <Box
                    sx={{
                        position: 'fixed', bottom: 180, right: 28,
                        width: { xs: 'calc(100% - 32px)', sm: 380 }, height: 550, maxHeight: 'calc(100vh - 200px)',
                        zIndex: 1200, display: 'flex', flexDirection: 'column',
                        borderRadius: 3, overflow: 'hidden',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
                        bgcolor: '#ffffff', color: '#0f172a', 
                    }}
                >
                    {/* HEADER */}
                    <Box sx={{ p: 2, bgcolor: '#0d47a1', color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}><BotIcon sx={{ fontSize: 20 }} /></Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '1rem' }}>AI Care Assistant</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                                <Box sx={{ width: 6, height: 6, bgcolor: '#4ade80', borderRadius: '50%' }} /> Powered by Gemini AI
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setIsOpen(false)} sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}><CloseIcon sx={{ fontSize: 20 }} /></IconButton>
                    </Box>

                    {/* MESSAGES AREA */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {messages.map((msg) => (
                            <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                                <Box sx={{
                                    p: 1.5, borderRadius: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.875rem', wordBreak: 'break-word',
                                    bgcolor: msg.sender === 'user' ? '#0d47a1' : '#ffffff', color: msg.sender === 'user' ? '#fff' : '#0f172a',
                                    border: msg.sender === 'bot' ? '1px solid #e2e8f0' : 'none', boxShadow: msg.sender === 'bot' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                }}>
                                    {msg.text}
                                </Box>
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', mt: 0.5, px: 0.5 }}>{msg.time}</Typography>
                            </Box>
                        ))}

                        {/* TYPING INDICATOR */}
                        {isTyping && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, alignSelf: 'flex-start' }}>
                                <Avatar sx={{ width: 24, height: 24, bgcolor: '#e2e8f0' }}><BotIcon sx={{ fontSize: 14, color: '#64748b' }} /></Avatar>
                                <Box sx={{ display: 'flex', gap: 0.5, p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    <Box className="chat-dot" sx={{ animationDelay: '0s' }} />
                                    <Box className="chat-dot" sx={{ animationDelay: '0.2s' }} />
                                    <Box className="chat-dot" sx={{ animationDelay: '0.4s' }} />
                                </Box>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* QUICK REPLIES */}
                    {messages.length <= 1 && !isTyping && (
                        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap', bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                            {quickReplies.map((q, i) => (
                                <Chip key={i} label={q} size="small" onClick={() => handleSend(q)}
                                    sx={{ bgcolor: '#ffffff', border: '1px solid #cbd5e1', color: '#0d47a1', fontWeight: 500, fontSize: '0.75rem', height: 28, '&:hover': { bgcolor: '#eff6ff', borderColor: '#0d47a1' } }}
                                />
                            ))}
                        </Box>
                    )}

                    {/* INPUT AREA */}
                    <Box sx={{ p: 1.5, display: 'flex', gap: 1, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                        <TextField
                            fullWidth size="small" placeholder="Ask in any language..." value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} disabled={isTyping}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc', fontSize: '0.875rem' } }}
                        />
                        <IconButton onClick={() => handleSend()} disabled={!input.trim() || isTyping}
                            sx={{ bgcolor: '#0d47a1', color: '#fff', width: 40, height: 40, '&:hover': { bgcolor: '#0a3a80' }, '&:disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' } }}>
                            <SendIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>
                </Box>
            </Slide>
            
            {/* CSS ANIMATION FOR TYPING DOTS */}
            <style>{`
                .chat-dot {
                    width: 6px; height: 6px; background-color: #94a3b8; border-radius: 50%;
                    animation: chatPulse 1s infinite;
                }
                @keyframes chatPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
}

export default Chatbot;