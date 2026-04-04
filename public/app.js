// --- ESTADO DE LA APLICACIÓN ---
let estudiantes = [];
let piars = [];

// Al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await fetchDatos();
    updateDashStats();
    loadStudentsSelect();
    renderPIARs();
    
    // Crear toast notification element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'toast-alert';
    document.body.appendChild(toast);
});

async function fetchDatos() {
    try {
        const [resEstudiantes, resPiars] = await Promise.all([
            fetch('/api/estudiantes'),
            fetch('/api/piars')
        ]);
        if (resEstudiantes.ok) estudiantes = await resEstudiantes.json();
        if (resPiars.ok) piars = await resPiars.json();
    } catch (err) {
        console.error("Error al obtener datos:", err);
        showToast("Error al cargar datos del servidor.");
    }
}

// --- NAVEGACIÓN SPA ---
function navigate(viewId) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // Mostrar la vista seleccionada
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    // Actualizar botones de navegación
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    // Buscar el botón correspondiente (por su onclick)
    const btn = document.querySelector(`.nav-btn[onclick="navigate('${viewId}')"]`);
    if(btn) btn.classList.add('active');

    if(viewId === 'home') updateDashStats();
    if(viewId === 'new-piar') loadStudentsSelect();
    if(viewId === 'list-piar') renderPIARs();
}

// --- UTILIDADES ---
function showToast(message) {
    const toast = document.getElementById('toast-alert');
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

function updateDashStats() {
    document.getElementById('stat-students').textContent = estudiantes.length;
    document.getElementById('stat-piars').textContent = piars.length;
}

// Genera un UUID v4 básico
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- ESTUDIANTES ---
async function saveStudent(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('std-nombre').value;
    const grado = document.getElementById('std-grado').value;
    const edad = document.getElementById('std-edad').value;
    
    // Recolectar checkboxes
    const diagnosticos = [];
    document.querySelectorAll('input[name="diagnostico"]:checked').forEach(cb => {
        diagnosticos.push(cb.value);
    });
    
    const detalle = document.getElementById('std-detalle-diag').value;
    
    if(!nombre || !grado) {
        alert("El nombre y el grado son obligatorios.");
        return;
    }
    
    const newStudent = {
        id: generateUUID(),
        nombre,
        grado,
        edad: edad || null,
        diagnostico: diagnosticos,
        detalle_diagnostico: detalle,
        created_at: new Date().toISOString()
    };
    
    try {
        const res = await fetch('/api/estudiantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newStudent)
        });
        
        if (res.ok) {
            const savedStudent = await res.json();
            estudiantes.push(savedStudent);
            showToast('✅ Estudiante agregado correctamente');
            e.target.reset();
            navigate('home');
        } else {
            const errData = await res.json();
            alert("Error: " + (errData.error || "Ocurrió un error"));
        }
    } catch (err) {
        console.error("Error al guardar estudiante:", err);
        alert("Error de conexión con el servidor");
    }
}

// --- FORMULARIO PIAR ---
function loadStudentsSelect() {
    const select = document.getElementById('piar-estudiante');
    select.innerHTML = '<option value="">Seleccione estudiante registrado...</option>';
    
    estudiantes.forEach(est => {
        const opt = document.createElement('option');
        opt.value = est.id;
        opt.textContent = `${est.nombre} (${est.grado})`;
        select.appendChild(opt);
    });
}

// LOGICA CLAVE: Autosugerir barreras basado en diagnóstico
function handleStudentSelect(studentId) {
    const helper = document.getElementById('diag-helper');
    if(!studentId) {
        helper.textContent = "Selecciona un estudiante para sugerir barreras.";
        document.querySelectorAll('input[name="barreras"]').forEach(cb => cb.checked = false);
        return;
    }
    
    const student = estudiantes.find(s => s.id === studentId);
    if(student && student.diagnostico && student.diagnostico.length > 0) {
        helper.textContent = `💡 Sugiriendo barreras basado en: ${student.diagnostico.join(', ')}`;
        
        // Limpiar
        document.querySelectorAll('input[name="barreras"]').forEach(cb => cb.checked = false);
        
        // Mapeo sugerido
        const diags = student.diagnostico;
        const barrisAutoselect = new Set();
        
        if(diags.includes("Dificultad en lectura")) { barrisAutoselect.add("Lectura"); barrisAutoselect.add("Comprensión"); }
        if(diags.includes("Dificultad en escritura")) { barrisAutoselect.add("Escritura"); barrisAutoselect.add("Motrices"); }
        if(diags.includes("Dificultad cognitiva")) { barrisAutoselect.add("Comprensión"); barrisAutoselect.add("Metodológicas"); }
        if(diags.includes("Trastorno de atención")) { barrisAutoselect.add("Atención"); barrisAutoselect.add("Del entorno"); }
        if(diags.includes("Discapacidad auditiva")) { barrisAutoselect.add("Comunicación"); barrisAutoselect.add("Metodológicas"); }
        if(diags.includes("Discapacidad visual")) { barrisAutoselect.add("Lectura"); barrisAutoselect.add("Entorno"); }
        
        // Check checkboxes
        barrisAutoselect.forEach(val => {
            const cb = document.querySelector(`input[name="barreras"][value="${val}"]`);
            if(cb) cb.checked = true;
        });
    } else {
         helper.textContent = "Estudiante sin diagnóstico específico pre-marcado.";
         document.querySelectorAll('input[name="barreras"]').forEach(cb => cb.checked = false);
    }
}

function toggleFlex(isYes) {
    const flexContainer = document.getElementById('flex-options-container');
    if(isYes) {
        flexContainer.classList.remove('hidden');
    } else {
        flexContainer.classList.add('hidden');
        document.querySelectorAll('input[name="tipo_flex"]').forEach(cb => cb.checked = false);
    }
}

async function savePIAR(e) {
    e.preventDefault();
    
    // Obtener valores básicos
    const docente = document.getElementById('piar-docente').value;
    const estudiante_id = document.getElementById('piar-estudiante').value;
    const asignatura = document.getElementById('piar-asignatura').value;
    const ajuste_razonable = document.getElementById('piar-ajuste').value;
    const meta = document.getElementById('piar-meta').value;
    
    // Radios
    const flexRadio = document.querySelector('input[name="flexibilizacion"]:checked');
    const flexibilizacion = flexRadio ? flexRadio.value === 'si' : false;
    
    const frecRadio = document.querySelector('input[name="frecuencia"]:checked');
    const frecuencia = frecRadio ? frecRadio.value : '';

    // Función helper para arrays de checkboxes
    const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

    const barreras = getCheckedValues('barreras');
    const tipo_flex = getCheckedValues('tipo_flex');
    const evaluacion = getCheckedValues('evaluacion');
    const apoyo = getCheckedValues('apoyo');
    const seguimiento = getCheckedValues('seguimiento');

    if(!estudiante_id) { alert("Debe seleccionar un estudiante."); return; }

    const newPIAR = {
        id: generateUUID(),
        estudiante_id,
        docente,
        asignatura,
        barreras,
        ajuste_razonable,
        flexibilizacion,
        tipo_flexibilizacion: tipo_flex,
        evaluacion,
        apoyo,
        meta,
        seguimiento,
        frecuencia,
        created_at: new Date().toISOString()
    };

    try {
        const res = await fetch('/api/piars', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPIAR)
        });
        
        if (res.ok) {
            const savedPiar = await res.json();
            piars.push(savedPiar);
            showToast('✅ Formulario PIAR guardado');
            e.target.reset();
            document.getElementById('flex-options-container').classList.add('hidden');
            navigate('list-piar');
        } else {
            const errData = await res.json();
            alert("Error: " + (errData.error || "Ocurrió un error al guardar"));
        }
    } catch(err) {
        console.error("Error al guardar PIAR:", err);
        alert("Error de conexión con el servidor");
    }
}

// --- VER PIARs ---
function renderPIARs() {
    const list = document.getElementById('piar-list-container');
    list.innerHTML = '';
    
    if(piars.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No hay PIARs registrados aún.</p>';
        return;
    }
    
    // Ordenar de más reciente a más antiguo
    const sortedPiars = [...piars].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    sortedPiars.forEach(p => {
        const std = estudiantes.find(s => s.id === p.estudiante_id);
        const stdName = std ? std.nombre : 'Estudiante eliminado';
        
        const card = document.createElement('div');
        card.className = 'piar-detail-card';
        card.innerHTML = `
            <h3>${stdName}</h3>
            <p><strong>Asignatura:</strong> ${p.asignatura}</p>
            <p><strong>Docente:</strong> ${p.docente}</p>
            <p><strong>Meta:</strong> ${p.meta}</p>
            <span class="badge">Registrado: ${new Date(p.created_at).toLocaleDateString()}</span>
        `;
        list.appendChild(card);
    });
}

// --- EXPORTAR EXCEL ---
function exportExcel() {
    if(piars.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // Encabezados requeridos EXACTAMENTE como pidió el usuario:
    // Nombre del docente, Asignatura, Barreras identificadas, Estrategia metodológica, 
    // Flexibilización de tiempo, Tipo de flexibilización, Tipo de evaluación, 
    // Apoyo requerido, Meta de aprendizaje, Tipo de seguimiento, Frecuencia de seguimiento
    
    const headers = [
        "Estudiante",
        "Grado",
        "Diagnóstico",
        "Nombre del docente",
        "Asignatura",
        "Barreras identificadas",
        "Estrategia metodológica", // (Ajuste razonable)
        "Flexibilización de tiempo",
        "Tipo de flexibilización",
        "Tipo de evaluación",
        "Apoyo requerido",
        "Meta de aprendizaje",
        "Tipo de seguimiento",
        "Frecuencia de seguimiento",
        "Fecha"
    ];

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM para acentos en Excel
    csvContent += headers.join(";") + "\r\n";

    piars.forEach(p => {
        const std = estudiantes.find(s => s.id === p.estudiante_id) || {};
        
        const row = [
            `"${std.nombre || ''}"`,
            `"${std.grado || ''}"`,
            `"${(std.diagnostico || []).join(', ')}"`,
            `"${p.docente || ''}"`,
            `"${p.asignatura || ''}"`,
            `"${(p.barreras || []).join(', ')}"`,
            `"${(p.ajuste_razonable || '').replace(/"/g, '""')}"`,
            `"${p.flexibilizacion ? 'Sí' : 'No'}"`,
            `"${(p.tipo_flexibilizacion || []).join(', ')}"`,
            `"${(p.evaluacion || []).join(', ')}"`,
            `"${(p.apoyo || []).join(', ')}"`,
            `"${(p.meta || '').replace(/"/g, '""')}"`,
            `"${(p.seguimiento || []).join(', ')}"`,
            `"${p.frecuencia || ''}"`,
            `"${new Date(p.created_at).toLocaleDateString()}"`
        ];
        
        csvContent += row.join(";") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Exportacion_PIAR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("💾 Exportando Excel...");
}
