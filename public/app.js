// --- ESTADO DE LA APLICACIÓN ---
let estudiantes = [];
let piars = [];
let currentStudentStep = 1;
let currentPiarStep = 1;
let isAuthorized = sessionStorage.getItem('piar_auth') === 'true';
let pendingAction = null; // Para ejecutar una acción (como exportar) después de loguearse

// Al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await fetchDatos();
    updateDashStats();
    loadStudentsSelect();
    renderPIARs();
    renderBarriers(); // Nueva función
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

// --- NAVEGACIÓN Y AUTENTICACIÓN ---
function handleAuthNavigation(action) {
    if (isAuthorized) {
        if (action === 'list-piar') navigate('list-piar');
        if (action === 'export') exportExcel();
    } else {
        pendingAction = action;
        navigate('login');
    }
}

async function verifyLogin() {
    const password = document.getElementById('login-password').value;
    if (!password) {
        showToast("Por favor ingresa la contraseña");
        return;
    }

    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            isAuthorized = true;
            sessionStorage.setItem('piar_auth', 'true');
            showToast("🔓 Acceso concedido");
            
            // Ejecutar acción pendiente o ir a listado
            if (pendingAction === 'export') {
                exportExcel();
                navigate('home');
            } else {
                navigate('list-piar');
            }
            pendingAction = null;
            document.getElementById('login-password').value = '';
        } else {
            showToast("❌ Contraseña incorrecta");
        }
    } catch (err) {
        showToast("Error de conexión");
    }
}

function navigate(viewId) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // Mostrar la vista seleccionada
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active');
    
    // Actualizar botones de navegación en el top-bar
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-primary', 'text-secondary', 'text-gray-900', 'bg-gray-50');
        btn.classList.add('text-gray-400');
    });

    // Encontrar el botón (considerando handleAuthNavigation o navigate)
    const btn = document.querySelector(`.nav-btn[onclick*="'${viewId}'"]`);
    if(btn) {
        btn.classList.remove('text-gray-400');
        const colorClass = (viewId === 'new-piar' || viewId === 'login') ? 'text-secondary' : 'text-primary';
        btn.classList.add(colorClass, 'bg-gray-50');
    }

    if(viewId === 'home') updateDashStats();
    if(viewId === 'new-piar') {
        loadStudentsSelect();
        resetFormSteps('piar');
    }
    if(viewId === 'list-piar') renderPIARs();
    if(viewId === 'add-student') resetFormSteps('student');
    
    // Enfocar password si es login
    if(viewId === 'login') {
        setTimeout(() => document.getElementById('login-password').focus(), 100);
    }
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

    // Validación especial para grupos de checkboxes obligatorios (ej: Apoyo Requerido)
    // Buscamos contenedores que tengan un label con "*"
    const checkGroups = container.querySelectorAll('.grid'); // Suponiendo que los grupos están en divs .grid
    checkGroups.forEach(group => {
        const label = group.parentElement.querySelector('label');
        if (label && label.textContent.includes('*')) {
            const checks = group.querySelectorAll('input[type="checkbox"]');
            if (checks.length > 0) {
                const oneChecked = Array.from(checks).some(c => c.checked);
                if (!oneChecked) {
                    group.classList.add('ring-2', 'ring-red-300', 'rounded-xl', 'p-2');
                    valid = false;
                } else {
                    group.classList.remove('ring-2', 'ring-red-300', 'p-2');
                }
            }
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
    const progressBar = document.getElementById(`${type}-progress-bar`);
    const stepIndicator = document.getElementById(`${type}-step-indicator`);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (stepIndicator) stepIndicator.textContent = `Paso ${current} de ${total}`;

    // Mostrar/ocultar pasos
    document.querySelectorAll(`#form-${type} .form-step`).forEach((el, idx) => {
        el.classList.toggle('active', (idx + 1) === current);
    });

    // Control de botones
    const btnPrev = document.getElementById(`btn-${type}-prev`);
    const btnNext = document.getElementById(`btn-${type}-next`);
    const btnSave = document.getElementById(`btn-${type}-save`);

    if (btnPrev) btnPrev.classList.toggle('hidden', current === 1);
    if (btnNext) btnNext.classList.toggle('hidden', current === total);
    if (btnSave) btnSave.classList.toggle('hidden', current !== total);
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
    const stdStat = document.getElementById('stat-students');
    const piarStat = document.getElementById('stat-piars');
    if (stdStat) stdStat.textContent = estudiantes.length;
    if (piarStat) piarStat.textContent = piars.length;
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
    
    // Capturar "Otro" diagnóstico
    const checkOtro = document.getElementById('check-std-diag-otro');
    const txtOtro = document.getElementById('std-diag-otro');
    if (checkOtro && checkOtro.checked && txtOtro && txtOtro.value.trim()) {
        diagnosticos.push(`Otro: ${txtOtro.value.trim()}`);
    }

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
        if (helper) helper.textContent = "Selecciona para ver sugerencias";
        document.querySelectorAll('input[name="barreras"]').forEach(cb => cb.checked = false);
        updateBarriersCounter();
        return;
    }
    
    const student = estudiantes.find(s => s.id === studentId);
    if(student && student.diagnostico && student.diagnostico.length > 0) {
        const diagStr = student.diagnostico.join(', ');
        if (helper) helper.textContent = `💡 Sugerencia: ${diagStr}`;
        
        // Auto-expandir acordeones relacionados
        document.querySelectorAll('.accordion-item').forEach(item => {
            const title = item.querySelector('.disability-title').textContent;
            let shouldExpand = false;
            if(diagStr.includes("cognitiva") && title.includes("Cognitiva")) shouldExpand = true;
            if(diagStr.includes("auditiva") && title.includes("Auditiva")) shouldExpand = true;
            if(diagStr.includes("visual") && title.includes("Visual")) shouldExpand = true;
            if(diagStr.includes("atención") && title.includes("Aprendizaje")) shouldExpand = true;
            
            if(shouldExpand) item.classList.add('active');
        });
    } else {
         if (helper) helper.textContent = "Estudiante sin diagnóstico previo.";
    }
}

function toggleOtroBarrera(show) {
    const txt = document.getElementById('piar-barrera-otro');
    if (txt) {
        txt.classList.toggle('hidden', !show);
        if (show) setTimeout(() => txt.focus(), 100);
    }
    updateBarriersCounter();
}

function handleAsignaturaChange(val) {
    const txt = document.getElementById('piar-asignatura-otra');
    if (txt) {
        txt.classList.toggle('hidden', val !== 'Otra');
        if (val === 'Otra') setTimeout(() => txt.focus(), 100);
    }
}

function toggleField(checkId, txtId) {
    const check = document.getElementById(checkId);
    const txt = document.getElementById(txtId);
    if (check && txt) {
        txt.classList.toggle('hidden', !check.checked);
        if (check.checked) setTimeout(() => txt.focus(), 100);
    }
}

function toggleFrecuenciaOtra(show) {
    const txt = document.getElementById('piar-frecuencia-otra');
    if (txt) {
        txt.classList.toggle('hidden', !show);
        if (show) setTimeout(() => txt.focus(), 100);
    }
}

// --- NUEVAS FUNCIONES PARA BARRERAS DINÁMICAS ---
function renderBarriers() {
    const container = document.getElementById('barreras-container');
    if (!container || !window.BARRERAS_DATA) return;
    container.innerHTML = '';

    Object.entries(window.BARRERAS_DATA).forEach(([disability, categories]) => {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item bg-gray-50 rounded-xl border border-gray-200 overflow-hidden';
        
        const header = document.createElement('div');
        header.className = 'accordion-header p-4 flex items-center justify-between bg-white hover:bg-gray-50';
        header.onclick = () => accordionItem.classList.toggle('active');
        header.innerHTML = `
            <span class="text-xs font-bold text-gray-700 disability-title">${disability}</span>
            <span class="chevron transition-transform duration-300 text-gray-400">▼</span>
        `;
        
        const content = document.createElement('div');
        content.className = 'accordion-content p-4 space-y-4';
        
        Object.entries(categories).forEach(([catName, items]) => {
            const catHeader = document.createElement('h4');
            catHeader.className = 'text-[0.65rem] font-black text-primary uppercase tracking-widest mb-2 border-b border-indigo-100 pb-1';
            catHeader.textContent = catName;
            content.appendChild(catHeader);
            
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 gap-2';
            
            items.forEach(itemText => {
                const label = document.createElement('label');
                label.className = 'flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-primary transition-all';
                label.innerHTML = `
                    <input type="checkbox" name="barreras" value="${itemText}" onchange="updateBarriersCounter()" class="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary">
                    <span class="text-xs text-gray-600 leading-tight">${itemText}</span>
                `;
                grid.appendChild(label);
            });
            content.appendChild(grid);
        });

        accordionItem.appendChild(header);
        accordionItem.appendChild(content);
        container.appendChild(accordionItem);
    });
}

function updateBarriersCounter() {
    const listCount = document.querySelectorAll('input[name="barreras"]:checked').length;
    const otroCheck = document.getElementById('check-barrera-otro');
    const count = listCount + (otroCheck && otroCheck.checked ? 1 : 0);
    
    const counter = document.getElementById('barreras-counter');
    if (counter) {
        counter.textContent = `${count} seleccionadas`;
        counter.classList.toggle('bg-pink-500', count > 0);
        counter.classList.toggle('text-white', count > 0);
        counter.classList.toggle('bg-pink-100', count === 0);
        counter.classList.toggle('text-pink-600', count === 0);
    }
}

function toggleFlex(isYes) {
    const flexContainer = document.getElementById('flex-options-container');
    if (flexContainer) {
        if(isYes) {
            flexContainer.classList.remove('hidden');
        } else {
            flexContainer.classList.add('hidden');
            document.querySelectorAll('input[name="tipo_flex"]').forEach(cb => cb.checked = false);
        }
    }
}

async function savePIAR(e) {
    e.preventDefault();
    
    const docente = document.getElementById('piar-docente').value;
    const estudiante_id = document.getElementById('piar-estudiante').value;
    const asignaturaSelect = document.getElementById('piar-asignatura');
    let asignatura = asignaturaSelect ? asignaturaSelect.value : '';
    if (asignatura === 'Otra') {
        const asigOtra = document.getElementById('piar-asignatura-otra');
        if (asigOtra && asigOtra.value.trim()) asignatura = `Otra: ${asigOtra.value.trim()}`;
    }

    const ajuste_razonable = document.getElementById('piar-ajuste').value;
    const meta = document.getElementById('piar-meta').value;
    const flexRadio = document.querySelector('input[name="flexibilizacion"]:checked');
    const flexibilizacion = flexRadio ? flexRadio.value === 'si' : false;
    
    const frecRadio = document.querySelector('input[name="frecuencia"]:checked');
    let frecuencia = frecRadio ? frecRadio.value : '';
    if (frecuencia === 'Otra') {
        const frecOtra = document.getElementById('piar-frecuencia-otra');
        if (frecOtra && frecOtra.value.trim()) frecuencia = `Otra: ${frecOtra.value.trim()}`;
    }

    const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
    
    const collectWithOther = (name, checkId, txtId) => {
        const vals = getCheckedValues(name);
        const check = document.getElementById(checkId);
        const txt = document.getElementById(txtId);
        if (check && check.checked && txt && txt.value.trim()) {
            vals.push(`Otro: ${txt.value.trim()}`);
        }
        return vals;
    };

    const barreras = collectWithOther('barreras', 'check-barrera-otro', 'piar-barrera-otro');
    const tipo_flexibilizacion = collectWithOther('tipo_flex', 'check-flex-otro', 'piar-flex-otro');
    const apoyo = collectWithOther('apoyo', 'check-apoyo-otro', 'piar-apoyo-otro');
    const evaluacion = collectWithOther('evaluacion', 'check-eval-otro', 'piar-eval-otro');
    const seguimiento = collectWithOther('seguimiento', 'check-seguimiento-otro', 'piar-seguimiento-otro');

    const newPIAR = {
        id: generateUUID(),
        estudiante_id,
        docente,
        asignatura,
        barreras,
        ajuste_razonable,
        flexibilizacion,
        tipo_flexibilizacion,
        evaluacion,
        apoyo,
        meta,
        seguimiento,
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
            // Limpiar campos "Otro" y ocultarlos
            document.querySelectorAll('textarea[id$="-otro"], textarea[id$="-otra"]').forEach(txt => {
                txt.value = '';
                txt.classList.add('hidden');
            });
            document.querySelectorAll('input[id^="check-"]').forEach(cb => cb.checked = false);
            
            updateBarriersCounter(); // Resetear contador
            handleAuthNavigation('list-piar');
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
        const escapeCsv = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
        const joinAndEscape = (arr) => escapeCsv((arr || []).join('\n'));

        const row = [
            escapeCsv(std.nombre), escapeCsv(std.grado), joinAndEscape(std.diagnostico),
            escapeCsv(p.docente), escapeCsv(p.asignatura), joinAndEscape(p.barreras),
            escapeCsv(p.ajuste_razonable), escapeCsv(p.flexibilizacion ? 'Sí' : 'No'),
            joinAndEscape(p.tipo_flexibilizacion), joinAndEscape(p.evaluacion),
            joinAndEscape(p.apoyo), escapeCsv(p.meta),
            joinAndEscape(p.seguimiento), escapeCsv(p.frecuencia),
            escapeCsv(new Date(p.created_at).toLocaleDateString())
        ];
        csvContent += row.join(";") + "\r\n";
    });

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `PIAR_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast("💾 Exportando Excel...");
}
