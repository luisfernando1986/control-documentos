console.log('✅ script documentos cargado');

const rolUsuario = localStorage.getItem('rol');
const rangoUsuario = localStorage.getItem('rango');


// Solo validar sesión, NO rol
const usuario = localStorage.getItem('usuario');

if(!usuario) {
    window.location.href = '/login.html';
}







let alertaActiva = false;/*xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx*/



// ================== ELEMENTOS ==================

const buscador = document.getElementById('buscador');

let documentosGlobal = [];
let filtroActivo = 'Pendiente';

const check_otro = document.getElementById('check_otro');
const otro_elemento = document.getElementById('otro_elemento');

const tipo_documento = document.getElementById('tipo_documento');
const otro_tipo = document.getElementById('otro_tipo');
const numero = document.getElementById('numero');

const descripcion = document.getElementById('descripcion');
const formulario = document.getElementById('formulario');
// ================== BLOQUEAR DASHBOARD A LECTURA ==================

if(rolUsuario === 'LECTURA') {

    formulario.style.display = 'none';

}
const tabla = document.getElementById('tabla');

const instructor = document.getElementById('instructor');

const fecha_recepcion = document.getElementById('fecha_recepcion');

const fecha_limite = document.getElementById('fecha_limite');

const estado = document.getElementById('estado');

const oficio_respuesta = document.getElementById('oficio_respuesta');

oficio_respuesta.addEventListener('blur', () => {

    let valor = oficio_respuesta.value.trim();

    if(valor !== '' && !valor.includes('/')) {

        const anio = new Date()
            .getFullYear()
            .toString()
            .slice(-2);

        oficio_respuesta.value =
            valor + '/' + anio;
    }
});

const fecha_respuesta = document.getElementById('fecha_respuesta');

let editandoId = null;


function formatearFecha(fecha) {

    if(!fecha) return '';

    const meses = [
        'ENE', 'FEB', 'MAR',
        'ABR', 'MAY', 'JUN',
        'JUL', 'AGO', 'SEP',
        'OCT', 'NOV', 'DIC'
    ];

    const partes = fecha.split('-');

    const anio = partes[0];
    const mes = meses[parseInt(partes[1]) - 1];
    const dia = partes[2];

    return `${dia}-${mes}-${anio}`;
}
// ================== BLOQUEO POR ROL ==================

// 🔥 IMPORTANTE:
// admin = administrador
// lectura = solo lectura

// ================== CONTROL POR ROLES ==================

const btnExportar = document.querySelector(
    'button[onclick="exportarExcel()"]'
);

// ===== LECTURA =====

if(rolUsuario === 'LECTURA') {

    if(btnExportar) {
        btnExportar.style.display = 'none';
    }

    // ocultar formulario completo
    formulario.style.display = 'none';
}

// ===== EDITOR =====

if(rolUsuario === 'EDITOR') {

    if(btnExportar) {
        btnExportar.style.display = 'none';
    }
}


// SI ES TENIENTE NO PUEDE ELIMINAR

if(rangoUsuario === 'TENIENTE') {

    console.log('RANGO LIMITADO');
}
// ================== EVENTOS ==================

check_otro.addEventListener('change', () => {

    otro_elemento.style.display =
        check_otro.checked
            ? 'block'
            : 'none';
});

tipo_documento.addEventListener('change', () => {

    otro_tipo.style.display =
        tipo_documento.value === 'OTROS'
            ? 'block'
            : 'none';
});

// ================== CARGAR DOCUMENTOS ==================

async function cargarDocumentos() {

    console.log('🚀 intentando cargar documentos');

    try {

        const res = await fetch('/documentos');

                console.log('STATUS DOCUMENTOS:', res.status);

                const docs = await res.json();

        console.log('DOCS:', docs);

        if(!Array.isArray(docs)) {

            console.log('Respuesta inválida');

            return;
        }

        documentosGlobal = docs;

        aplicarFiltros();

        actualizarPanelComando();

    } catch(error) {

        console.log('ERROR DOCUMENTOS:', error);
    }
}

// ================== MOSTRAR DOCUMENTOS ==================

// ================== MOSTRAR DOCUMENTOS ==================

function mostrarDocumentos(docs) {

    tabla.innerHTML = '';

    docs.forEach(doc => {

        // ===== FECHA DE HOY =====
        const hoy = new Date();

        const hoySoloFecha = new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            hoy.getDate()
        );

        // ===== FECHA LIMITE =====
        const partesFecha = doc.fecha_limite.split('-');

        const limite = new Date(
            parseInt(partesFecha[0]),
            parseInt(partesFecha[1]) - 1,
            parseInt(partesFecha[2])
        );

        // ===== DIFERENCIA =====
        const diferencia = Math.floor(
            (limite - hoySoloFecha) / (1000 * 60 * 60 * 24)
        );

        let clase = '';

        // ===== COLORES =====

        if(doc.estado === 'Cumplido') {

            clase = 'cumplido';

        } else if(diferencia < 0) {

            // ROJO SOLO SI YA PASÓ EL DÍA
            clase = 'vencido';

        } else if(diferencia <= 1) {

            // ROSADO SI ES HOY O MAÑANA
            clase = 'urgente';
        }

        tabla.innerHTML += `
            <tr class="${clase}">

                <td>${doc._id}</td>

                <td>${doc.numero_documento}</td>

                <td>${doc.descripcion}</td>

                <td>${doc.elemento || ''}</td>

                <td>${doc.seccion || ''}</td>

                <td>${doc.instructor}</td>

                <td>${formatearFecha(doc.fecha_recepcion)}</td>

                <td>${formatearFecha(doc.fecha_limite)}</td>

                <td>${doc.oficio_respuesta || ''}</td>

                <td>${formatearFecha(doc.fecha_respuesta)}</td>

                <td>${doc.estado}</td>

                <td>

                    ${
                        rolUsuario === 'ADMIN'
                        ?
                        `
                        <button class="btn-editar" onclick="editarDocumento('${doc._id}')">
                            Editar
                        </button>

                        <button class="btn-eliminar" onclick="eliminarDocumento('${doc._id}')">
                            Eliminar
                        </button>
                        `
                        :
                        rolUsuario === 'EDITOR'
                        ?
                        `
                        <button class="btn-editar" onclick="editarDocumento('${doc._id}')">
                            Editar
                        </button>
                        `
                        :
                        `<span style="color:gray;">SOLO REGISTRO</span>`
                    }

                </td>

            </tr>
        `;
    });
}


function toggleOtros() {

    const check = document.getElementById('check_otros');
    const input = document.getElementById('otros_seccion');

    if (check.checked) {
        input.style.display = 'block';
    } else {
        input.style.display = 'none';
        input.value = '';
    }
}

// ================== FILTROS ==================

function setFiltro(tipo) {

    filtroActivo = tipo;

    actualizarBotones();

    aplicarFiltros();
}

function aplicarFiltros() {

    const texto = buscador.value.toLowerCase();

    let filtrados = documentosGlobal.filter(doc => {

        return (

            doc.numero_documento.toLowerCase().includes(texto)

            ||

            doc.descripcion.toLowerCase().includes(texto)

            ||

            doc.instructor.toLowerCase().includes(texto)

            ||

            (
                doc.seccion &&
                doc.seccion.toLowerCase().includes(texto)
            )
        );
    });

    if(filtroActivo !== 'TODOS') {

        if(filtroActivo === 'URGENTE') {

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    filtrados = filtrados.filter(doc => {

        const partesFecha = doc.fecha_limite.split('-');

        const limite = new Date(
            parseInt(partesFecha[0]),
            parseInt(partesFecha[1]) - 1,
            parseInt(partesFecha[2])
        );

        return (
            doc.estado !== 'Cumplido'
            &&
            limite < hoy
        );
    });
} else {

            filtrados = filtrados.filter(doc =>
                doc.estado === filtroActivo
            );
        }
    }

    mostrarDocumentos(filtrados);
}

// ================== PANEL ALERTAS ==================

// ================== PANEL ALERTAS ==================

function actualizarPanelComando() {

    let vencidos = 0;
    let urgentes = 0;
    let cumplidos = 0;

    documentosGlobal.forEach(doc => {

        // ===== FECHA DE HOY =====
        const hoy = new Date();

        const hoySoloFecha = new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            hoy.getDate()
        );

        // ===== FECHA LIMITE =====
        const partesFecha = doc.fecha_limite.split('-');

        const limite = new Date(
            parseInt(partesFecha[0]),
            parseInt(partesFecha[1]) - 1,
            parseInt(partesFecha[2])
        );

        // ===== DIFERENCIA =====
        const diferencia = Math.floor(
            (limite - hoySoloFecha) / (1000 * 60 * 60 * 24)
        );

        // ===== CONTADORES =====
        if(doc.estado === 'Cumplido') {

            cumplidos++;

        } else if(diferencia < 0) {

            // SOLO SI YA PASÓ EL DÍA
            vencidos++;

        } else if(diferencia <= 1) {

            // HOY Y MAÑANA
            urgentes++;
        }

    });

    // ===== ACTUALIZAR PANEL =====

    document.getElementById('count-vencidos').textContent = vencidos;

    document.getElementById('count-urgentes').textContent = urgentes;

    document.getElementById('count-cumplidos').textContent = cumplidos;

    const panel = document.querySelector('.panel-comando');

    const audio = document.getElementById('sonidoAlerta');

    // ===== ALERTA =====

    if(vencidos > 0 || urgentes > 0) {

        panel.classList.add('alerta-activa');

        if(!alertaActiva) {

            alertaActiva = true;

            audio.currentTime = 0;

            audio.play().catch(() => {
                console.log('Sonido bloqueado');
            });

            alert(`⚠ ALERTA:

${vencidos} VENCIDOS
${urgentes} URGENTES`);
        }

    } else {

        panel.classList.remove('alerta-activa');

        alertaActiva = false;
    }
}

// ================== OBTENER ELEMENTOS ==================

function obtenerElementos() {

    const checks = document.querySelectorAll(
        '.elementos-box input[type="checkbox"]:checked'
    );

    let elementos = [];

    checks.forEach(check => {

        if(
            check.checked &&
            check.value &&
            check.value !== 'on'
        ) {
        
            elementos.push(check.value);
        }
    });

    if(
        check_otro.checked &&
        otro_elemento.value.trim() !== ''
    ) {

        elementos.push(otro_elemento.value);
    }

    return elementos.join(', ');
}

// ================== OBTENER SECCIONES ==================

function obtenerSecciones() {

    let secciones = [];

    document.querySelectorAll(
        '.secciones-box input[type="checkbox"]'
    ).forEach(cb => {
    
        if (
            cb.checked &&
            cb.id !== 'check_otros' &&
            cb.value
        ) {

            secciones.push(
                cb.value.toUpperCase()
            );
        }
    });

    // OTROS
    const otros = document.getElementById(
        'otros_seccion'
    );

    if (
        document.getElementById('check_otros').checked &&
        otros &&
        otros.value.trim() !== ''
    ) {

        secciones.push(
            otros.value.trim().toUpperCase()
        );
    }

    return secciones.join(', ');
}
// ================== GUARDAR ==================

// ================== GUARDAR ==================

formulario.addEventListener('submit', async (e) => {

    e.preventDefault();

    let nuevoEstado = 'Pendiente';

        if(
            oficio_respuesta.value.trim() !== '' &&
            fecha_respuesta.value !== ''
        ) {
        
            nuevoEstado = 'Cumplido';
        }

    const documento = {

        numero_documento:

            (
                tipo_documento.value === 'OTROS'
                    ? otro_tipo.value.trim().toUpperCase()
                    : tipo_documento.value
            )

            + ' ' +

            numero.value.trim().toUpperCase()
            
            + '/' +
            
            new Date().getFullYear().toString().slice(-2),

        descripcion: descripcion.value,

        elemento:

            obtenerElementos()

            ||

            (
                documentosGlobal.find(d =>
                    d._id == editandoId
                )?.elemento
            ),

        seccion:

            obtenerSecciones()

            ||

            (
                documentosGlobal.find(d =>
                    d._id == editandoId
                )?.seccion
            ),

        instructor: instructor.value,

        fecha_recepcion: fecha_recepcion.value,

        fecha_limite: fecha_limite.value,

        estado: nuevoEstado,

        oficio_respuesta: oficio_respuesta.value,

        fecha_respuesta: fecha_respuesta.value
    };

    try {

        await fetch(

            editandoId
                ? '/documentos/' + editandoId
                : '/documentos',

            {
                method:
                    editandoId
                        ? 'PUT'
                        : 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(documento)
            }
        );

        alert('Documento guardado');

        formulario.reset();

        editandoId = null;

        otro_elemento.style.display = 'none';

        otro_tipo.style.display = 'none';

        document.getElementById('otros_seccion').style.display = 'none';

        cargarDocumentos();

    } catch(error) {

        console.log('ERROR GUARDANDO:', error);
    }
});



//======funcion boton cerrar cesion 

function logout() {

    fetch('/logout')
    .then(() => {

        localStorage.clear();

        window.location.href = '/login.html';
    });
}
// ================== ELIMINAR ==================

async function eliminarDocumento(id) {

    if(!confirm('¿Eliminar documento?')) return;

    await fetch('/documentos/' + id, {
        method: 'DELETE'
    });

    cargarDocumentos();
    
}



// ================== EDITAR ==================

async function editarDocumento(id) {

        if(rolUsuario === 'LECTURA') {

            alert('No tiene permisos para editar');

            return;
        }

        try {

            const res = await fetch('/documentos');

        const docs = await res.json();

        const doc = docs.find(d => d._id == id);

        if(!doc) {

            alert('Documento no encontrado');

            return;
        }

        // GUARDAR ID
        editandoId = doc._id;

        // ================= CAMPOS =================

        descripcion.value = doc.descripcion || '';

        instructor.value = doc.instructor || '';

        fecha_recepcion.value = doc.fecha_recepcion || '';

        fecha_limite.value = doc.fecha_limite || '';

        if(
            doc.oficio_respuesta &&
            doc.oficio_respuesta.trim() !== '' &&
            doc.fecha_respuesta
        ) {
        
            estado.value = 'Cumplido';
        
        } else {
        
            estado.value = 'Pendiente';
        }

        oficio_respuesta.value = doc.oficio_respuesta || '';

        fecha_respuesta.value = doc.fecha_respuesta || '';

        // ================= NUMERO DOCUMENTO =================

        const partes = doc.numero_documento.split(' ');

            const ultimoParte = partes[partes.length - 1];
            
            numero.value = ultimoParte.split('/')[0];
            
            const tipoCompleto = doc.numero_documento
                .replace(ultimoParte, '')
                .trim();
        
        const opciones = Array.from(
            tipo_documento.options
        ).map(o => o.value);
        
        if(opciones.includes(tipoCompleto)) {
        
            tipo_documento.value = tipoCompleto;
        
        } else {
        
            tipo_documento.value = 'OTROS';
        
            otro_tipo.style.display = 'block';
        
            otro_tipo.value = tipoCompleto;
        }

        // ================= LIMPIAR CHECKBOX =================

        document
            .querySelectorAll(
                '.elementos-box input[type="checkbox"]'
            )
            .forEach(check => {

                check.checked = false;
            });

        document
            .querySelectorAll(
                '.secciones-box input[type="checkbox"]'
            )
            .forEach(check => {

                check.checked = false;
            });

        // ================= MARCAR ELEMENTOS =================

        document
            .querySelectorAll(
                '.elementos-box input[type="checkbox"]'
            )
            .forEach(check => {

                if(
                    doc.elemento &&
                    doc.elemento.includes(check.value)
                ) {
                    check.checked = true;
                }
            });

        // ================= MARCAR SECCIONES =================

        document
            .querySelectorAll(
                '.secciones-box input[type="checkbox"]'
            )
            .forEach(check => {

                if(
                    doc.seccion &&
                    doc.seccion.includes(check.value)
                ) {
                    check.checked = true;
                }
            });

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

    } catch(error) {

        console.log(error);

        alert('Error cargando documento');
    }
}

// ================== EXPORTAR ==================

function exportarExcel() {

    window.location.href =
        '/exportar-excel';
}

// ================== BOTONES ==================

function actualizarBotones() {

    document
        .querySelectorAll('.filtros button')
        .forEach(btn => {

            btn.classList.remove('activo');
        });

    if(filtroActivo === 'TODOS') {

        document
            .getElementById('btn-todos')
            .classList.add('activo');
    }

    if(filtroActivo === 'Pendiente') {

        document
            .getElementById('btn-pendiente')
            .classList.add('activo');
    }

    if(filtroActivo === 'Cumplido') {

        document
            .getElementById('btn-cumplido')
            .classList.add('activo');
    }

    if(filtroActivo === 'URGENTE') {

        document
            .getElementById('btn-urgente')
            .classList.add('activo');
    }
}

// ================== INICIO ==================

cargarDocumentos();

actualizarBotones();

setInterval(() => {

    cargarDocumentos();

}, 30000);

// ================= CIERRE AUTOMÁTICO =================

let tiempoInactividad;

function reiniciarTemporizador() {

    clearTimeout(tiempoInactividad);

    tiempoInactividad = setTimeout(() => {

        alert('SESIÓN CERRADA POR INACTIVIDAD');

        localStorage.clear();

        window.location.href = '/login.html';

    }, 300000); // 5 minutos
}


document.querySelectorAll('input[type="text"], textarea').forEach(el => {

    el.addEventListener('input', () => {
        el.value = el.value.toUpperCase();
    });
});



// ================= BACKUPS =================

async function cargarBackups() {

    try {

        const res = await fetch('/backups');
        const data = await res.json();

        const lista = document.getElementById('listaBackups');

        lista.innerHTML = '';

        data.forEach(nombre => {

            lista.innerHTML += `
                <li>
                    ${nombre}

                    <button onclick="descargarBackup('${nombre}')">
                        Descargar
                    </button>

                    <button onclick="restaurarBackup('${nombre}')">
                        Restaurar
                    </button>
                </li>
            `;
        });

    } catch(error) {
        console.log('Error cargando backups:', error);
    }
}


// DESCARGAR
function descargarBackup(nombre) {
    window.location.href = '/backup/' + nombre;
}


// RESTAURAR
async function restaurarBackup(nombre) {

    const confirmar = confirm('⚠ Esto borrará TODO y restaurará el sistema');

    if(!confirmar) return;

    try {

        await fetch('/restaurar-backup/' + nombre, {
            method: 'POST'
        });

        alert('Sistema restaurado');

        location.reload();

    } catch(error) {
        console.log('Error restaurando:', error);
    }
}
// EVENTOS

window.onload = reiniciarTemporizador;

document.onmousemove = reiniciarTemporizador;

document.onkeypress = reiniciarTemporizador;

document.onclick = reiniciarTemporizador;


// ==========================
// MOSTRAR SOLO A ADMIN
// ==========================

const rol = localStorage.getItem('rol');

if(rol !== 'ADMIN'){

    document.getElementById('btnUsuarios').style.display = 'none';

    document.getElementById('btnEliminados').style.display = 'none';

    document.getElementById('btnLogs').style.display = 'none';
}