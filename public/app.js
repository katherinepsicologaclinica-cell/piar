// --- ESTADO DE LA APLICACIÓN ---
let estudiantes = [];
let piars = [];
let currentStudentStep = 1;
let currentPiarStep = 1;

// Al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await fetchDatos();
    updateDashStats();
    loadStudentsSelect();
    renderPIARs();
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
        showToast("Error al conectar con el servidor.");
    }
}

// --- NAVEGACIÓN SPA ---
function navigate(viewId) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // Mostrar la vista seleccionada
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active');
    
    // Actualizar botones de navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-primary', 'text-secondary', 'text-gray-900');
        btn.classList.add('text-gray-400');
    });

    const btn = document.querySelector(`.nav-btn[onclick="navigate('${viewId}')"]`);
    if(btn) {
        btn.classList.remove('text-gray-400');
        const colorClass = (viewId === 'new-piar') ? 'text-secondary' : 'text-primary';
        btn.classList.add(colorClass);
    }

    if(viewId === 'home') updateDashStats();
    if(viewId === 'new-piar') {
        loadStudentsSelect();
        resetFormSteps('piar');
    }
    if(viewId === 'list-piar') renderPIARs();
    if(viewId === 'add-student') resetFormSteps('student');
}

// --- LÓGICA DE FORMULARIOS POR PASOS ---
function resetFormSteps(type) {
    if (type === 'student') {
        currentStudentStep = 1;
        updateProgress('student');
    } else {
        currentPiarStep = 1;
        updateProgress('piar');
    }
}

function nextStep(type) {
    if (type === 'student') {
        if (validateStep('student', currentStudentStep)) {
            currentStudentStep++;
            updateProgress('student');
        }
    } else {
        if (validateStep('piar', currentPiarStep)) {
            currentPiarStep++;
            updateProgress('piar');
        }
    }
}

function prevStep(type) {
    if (type === 'student' && currentStudentStep > 1) {
        currentStudentStep--;
        updateProgress('student');
    } else if (type === 'piar' && currentPiarStep > 1) {
        currentPiarStep--;
        updateProgress('piar');
    }
}

function validateStep(type, step) {
    const container = document.getElementById(`${type}-step-${step}`);
    const requiredInputs = container.querySelectorAll('[required]');
    let valid = true;
    
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('ring-2', 'ring-red-300');
            valid = false;
        } else {
            input.classList.remove('ring-2', 'ring-red-300');
        }
    });

    if (!valid) showToast("⚠️ Completa los campos obligatorios");
    return valid;
}

function updateProgress(type) {
    const total = (type === 'student') ? 2 : 5;
    const current = (type === 'student') ? currentStudentStep : currentPiarStep;
    const percent = (current / total) * 100;

    // Actualizar barra y texto
    document.getElementById(`${type}-progress-bar`).style.width = `${percent}%`;
    document.getElementById(`${type}-step-indicator`).textContent = `Paso ${current} de ${total}`;

    // Mostrar/ocultar pasos
    document.querySelectorAll(`#form-${type} .form-step`).forEach((el, idx) => {
        el.classList.toggle('active', (idx + 1) === current);
    });

    // Control de botones
    const btnPrev = document.getElementById(`btn-${type}-prev`);
    const btnNext = document.getElementById(`btn-${type}-next`);
    const btnSave = document.getElementById(`btn-${type}-save`);

    btnPrev.classList.toggle('hidden', current === 1);
    btnNext.classList.toggle('hidden', current === total);
    btnSave.classList.toggle('hidden', current !== total);
}

// --- UTILIDADES ---
function showToast(message) {
    const toast = document.getElementById('toast-alert');
    if (!toast) return;
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
    const diagnosticos = Array.from(document.querySelectorAll('input[name="diagnostico"]:checked')).map(cb => cb.value);
    const detalle = document.getElementById('std-detalle-diag').value;
    
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
        showToast("⏳ Guardando...");
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
        alert("Error de conexión");
    }
}

// --- FORMULARIO PIAR ---
function loadStudentsSelect() {
    const select = document.getElementById('piar-estudiante');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccione estudiante...</option>';
    
    estudiantes.forEach(est => {
        const opt = document.createElement('option');
        opt.value = est.id;
        opt.textContent = `${est.nombre} (${est.grado})`;
        select.appendChild(opt);
    });
}

function handleStudentSelect(studentId) {
    const helper = document.getElementById('diag-helper');
    if(!studentId) {
        helper.textContent = "Selecciona para ver sugerencias";
        document.querySelectorAll('input[name="barreras"]').forEach(cb => cb.checked = false);
        return;
    }
    
    const student = estudiantes.find(s => s.id === studentId);
    if(student && student.diagnostico && student.diagnostico.length > 0) {
        helper.textContent = `💡 Sugerencia: ${student.diagnostico.join(', ')}`;
        document.querySelectorAll('input[name="barreras"]').forEach(cb => cb.checked = false);
        
        const diags = student.diagnostico;
        const barrisAutoselect = new Set();
        if(diags.includes("Dificultad en lectura")) { barrisAutoselect.add("Lectura"); barrisAutoselect.add("Comprensión"); }
        if(diags.includes("Dificultad en escritura")) { barrisAutoselect.add("Escritura"); }
        if(diags.includes("Dificultad cognitiva")) { barrisAutoselect.add("Comprensión"); barrisAutoselect.add("Metodológicas"); }
        if(diags.includes("Trastorno de atención")) { barrisAutoselect.add("Atención"); }
        
        barrisAutoselect.forEach(val => {
            const cb = document.querySelector(`input[name="barreras"][value="${val}"]`);
            if(cb) cb.checked = true;
        });
    } else {
         helper.textContent = "Estudiante sin diagnóstico previo.";
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
    
    const docente = document.getElementById('piar-docente').value;
    const estudiante_id = document.getElementById('piar-estudiante').value;
    const asignatura = document.getElementById('piar-asignatura').value;
    const ajuste_razonable = document.getElementById('piar-ajuste').value;
    const meta = document.getElementById('piar-meta').value;
    const flexRadio = document.querySelector('input[name="flexibilizacion"]:checked');
    const flexibilizacion = flexRadio ? flexRadio.value === 'si' : false;
    const frecRadio = document.querySelector('input[name="frecuencia"]:checked');
    const frecuencia = frecRadio ? frecRadio.value : '';

    const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

    const newPIAR = {
        id: generateUUID(),
        estudiante_id,
        docente,
        asignatura,
        barreras: getCheckedValues('barreras'),
        ajuste_razonable,
        flexibilizacion,
        tipo_flexibilizacion: getCheckedValues('tipo_flex'),
        evaluacion: getCheckedValues('evaluacion'),
        apoyo: getCheckedValues('apoyo'),
        meta,
        seguimiento: getCheckedValues('seguimiento'),
        frecuencia,
        created_at: new Date().toISOString()
    };

    try {
        showToast("⏳ Guardando...");
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
            navigate('list-piar');
        } else {
            const errData = await res.json();
            alert("Error: " + (errData.error || "Error al guardar"));
        }
    } catch(err) {
        console.error("Error:", err);
        alert("Error de conexión");
    }
}

function renderPIARs() {
    const list = document.getElementById('piar-list-container');
    if (!list) return;
    list.innerHTML = '';
    
    if(piars.length === 0) {
        list.innerHTML = '<div class="text-center py-10 text-gray-400 font-medium">No hay registros aún.</div>';
        return;
    }
    
    const sortedPiars = [...piars].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    sortedPiars.forEach(p => {
        const std = estudiantes.find(s => s.id === p.estudiante_id);
        const stdName = std ? std.nombre : 'Estudiante eliminado';
        
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-2xl shadow-sm border-l-4 border-primary';
        card.innerHTML = `
            <h3 class="font-bold text-gray-800 text-lg">${stdName}</h3>
            <div class="mt-2 space-y-1">
                <p class="text-xs text-gray-500 font-medium"><span class="text-gray-400">Asignatura:</span> ${p.asignatura}</p>
                <p class="text-xs text-gray-500 font-medium"><span class="text-gray-400">Docente:</span> ${p.docente}</p>
                <p class="text-[0.65rem] text-primary font-bold mt-2 opacity-70">${new Date(p.created_at).toLocaleDateString()}</p>
            </div>
        `;
        list.appendChild(card);
    });
}

function exportExcel() {
    if(piars.length === 0) {
        showToast("❌ No hay datos para exportar.");
        return;
    }

    const headers = [
        "Estudiante", "Grado", "Diagnóstico", "Docente", "Asignatura", 
        "Barreras", "Ajuste Metodológico", "Flex. Tiempo", "Tipo Flex", 
        "Evaluación", "Apoyo", "Meta", "Seguimiento", "Frecuencia", "Fecha"
    ];

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(";") + "\r\n";

    piars.forEach(p => {
        const std = estudiantes.find(s => s.id === p.estudiante_id) || {};
        const row = [
            `"${std.nombre || ''}"`, `"${std.grado || ''}"`, `"${(std.diagnostico || []).join(', ')}"`,
            `"${p.docente || ''}"`, `"${p.asignatura || ''}"`, `"${(p.barreras || []).join(', ')}"`,
            `"${(p.ajuste_razonable || '').replace(/"/g, '""')}"`, `"${p.flexibilizacion ? 'Sí' : 'No'}"`,
            `"${(p.tipo_flexibilizacion || []).join(', ')}"`, `"${(p.evaluacion || []).join(', ')}"`,
            `"${(p.apoyo || []).join(', ')}"`, `"${(p.meta || '').replace(/"/g, '""')}"`,
            `"${(p.seguimiento || []).join(', ')}"`, `"${p.frecuencia || ''}"`,
            `"${new Date(p.created_at).toLocaleDateString()}"`
        ];
        csvContent += row.join(";") + "\r\n";
    });

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `PIAR_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast("💾 Exportando Excel...");
}
