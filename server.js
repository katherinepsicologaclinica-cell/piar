const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar Supabase
// Asegúrate de definir SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// API Routes

// Obtener todos los estudiantes
app.get('/api/estudiantes', async (req, res) => {
    const { data, error } = await supabase.from('estudiantes').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Crear estudiante
app.post('/api/estudiantes', async (req, res) => {
    const newStudent = req.body;
    const { data, error } = await supabase.from('estudiantes').insert([newStudent]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Obtener todos los piars
app.get('/api/piars', async (req, res) => {
    const { data, error } = await supabase.from('piars').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Crear un piar
app.post('/api/piars', async (req, res) => {
    const newPiar = req.body;
    const { data, error } = await supabase.from('piars').insert([newPiar]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Ruta por defecto para cualquier otra petición que no sea API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

module.exports = app;
