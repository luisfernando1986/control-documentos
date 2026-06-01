console.log('✅ requerimientos.js cargado');

const rolUsuario = localStorage.getItem('rol');

const form =
    document.getElementById('formRequerimiento');

const tabla =
    document.getElementById('tablaRequerimientos');

let editandoId = null;

let filtroActivo = 'URGENTES';

// =========================================
// MOSTRAR U OCULTAR DIA CUMPLIMIENTO
// =========================================

const tipoSelect =
    document.getElementById('tipo');

const contenedorDia =
    document.getElementById('contenedorDia');

function controlarDiaCumplimiento() {

    if(tipoSelect.value === 'Semanal') {

        contenedorDia.style.display = 'block';

    } else {

        contenedorDia.style.display = 'none';

        document.getElementById(
            'diaCumplimiento'
        ).value = '';
    }
}

tipoSelect.addEventListener(
    'change',
    controlarDiaCumplimiento
);

// =========================================
// CARGAR
// =========================================

async function cargarRequerimientos() {

    console.log('🚀 intentando cargar requerimientos');

    try {

        const res =
            await fetch('/api/requerimientos');

        console.log('STATUS:', res.status);

        const datos = await res.json();

        console.log('DATOS:', datos);

        aplicarFiltros(datos);

        actualizarPanel(datos);

    } catch(error) {

        console.log(
            'ERROR FETCH:',
            error
        );
    }
}

// =========================================
// FILTROS
// =========================================

function setFiltro(tipo) {

    filtroActivo = tipo;

    cargarRequerimientos();
}

function obtenerAnticipacion(tipo) {

    if(tipo === 'Diario') {
        return 1;
    }

    if(tipo === 'Semanal') {
        return 2;
    }

    if(tipo === 'Mensual') {
        return 4;
    }

    if(tipo === 'Trimestral') {
        return 7;
    }

    if(tipo === 'Semestral') {
        return 12;
    }

    return 0;
}

function aplicarFiltros(datos) {



        const buscador =
            document.getElementById(
                'buscadorRequerimientos'
            );

        const textoBusqueda =
            buscador
                ? buscador.value.toLowerCase()
                : '';
    const hoy = new Date();

    hoy.setHours(0,0,0,0);

    let filtrados = datos.filter(req => {

                    const coincideBusqueda =

                    Object.values(req)

                    .join(' ')

                    .toLowerCase()

                    .includes(textoBusqueda);

        if(!coincideBusqueda){

            return false;
        }

                const fechaReq =
            new Date(req.fechaInicio);

        fechaReq.setHours(0,0,0,0);

        const diferencia = Math.floor(

            (fechaReq - hoy)

            /

            (1000 * 60 * 60 * 24)
        );

        // =====================================
        // URGENTES
        // =====================================

        if(filtroActivo === 'URGENTES') {

            const anticipacion =
                obtenerAnticipacion(req.tipo);

            return (

                req.estado !== 'Completado'

                &&

                (
                    diferencia <= anticipacion
                    ||
                    diferencia < 0
                )
            );
        }

        // =====================================
        // VENCIDOS
        // =====================================

        if(filtroActivo === 'VENCIDOS') {

            return (

                diferencia < 0

                &&

                req.estado !== 'Completado'
            );
        }

        // =====================================
        // HOY
        // =====================================

        if(filtroActivo === 'HOY') {

            return diferencia === 0;
        }

        // =====================================
        // SEMANA
        // =====================================

        if(filtroActivo === 'SEMANA') {

            return (
                diferencia >= 0
                &&
                diferencia <= 7
            );
        }

        // =====================================
        // COMPLETADOS
        // =====================================

        if(filtroActivo === 'COMPLETADOS') {

            return (
                req.estado === 'Completado'
            );
        }

        return true;
    });

    mostrarRequerimientos(filtrados);
}

// =========================================
// MOSTRAR
// =========================================

function mostrarRequerimientos(datos) {


                       

    tabla.innerHTML = '';

    datos.forEach(req => {

        const hoy = new Date();

        hoy.setHours(0,0,0,0);

                const fechaReq =
            new Date(req.fechaInicio);

        fechaReq.setHours(0,0,0,0);

        const diferencia = Math.floor(

            (fechaReq - hoy)

            /

            (1000 * 60 * 60 * 24)
        );


        // =====================================
        // COLORES
        // =====================================
        let clase = '';
        if(req.estado === 'Completado'){

                clase = 'cumplido';

            }else if(diferencia < 0){

                clase = 'vencido';

            }else if(
                diferencia <= obtenerAnticipacion(req.tipo)
            ){

                clase = 'urgente';

            }else{

                clase = '';
            }


                                                        console.log(
                                                            req.nombre,
                                                            req.proximaFecha,
                                                            diferencia,
                                                            clase
                                                        );
        

        tabla.innerHTML += `

        <tr class="${clase}">

                <td>${req.codigoRequerimiento || req._id}</td>

                <td>${req.nombre}</td>

                <td>${req.tipo}</td>

                <td>${req.responsable}</td>

                <td>${req.descripcion || ''}</td>

                <td>${formatearFecha(req.fechaInicio)}</td>

                <td>${formatearFecha(req.proximaFecha)}</td>

                <td>${req.estado}</td>

                <td>${req.tipoRespuesta || ''}</td>

                <td>${req.numeroRespuesta || ''}</td>

                <td>
                    ${
                        req.fechaRespuesta
                        ?
                        formatearFecha(req.fechaRespuesta)
                        :
                        ''
                    }
                </td>

            <td>

                ${
                    rolUsuario === 'ADMIN'

                    ?

                    `
                    <button
                        class="btn-editar"
                        onclick="editar('${req._id}')"
                    >
                        Editar
                    </button>

                    <button
                        class="btn-eliminar"
                        onclick="eliminarReq('${req._id}')"
                    >
                        Eliminar
                    </button>
                    `

                    :

                    rolUsuario === 'EDITOR'

                    ?

                    `
                    <button
                        class="btn-editar"
                        onclick="editar('${req._id}')"
                    >
                        Editar
                    </button>
                    `

                    :

                    `<span>SOLO LECTURA</span>`
                }

            </td>

        </tr>
        `;
    });
}

// =========================================
// FORMATEAR FECHA
// =========================================

function formatearFecha(fecha) {

    if (!fecha) return '';

    const partes =
        fecha.split('T')[0].split('-');

    const dia = partes[2];

    const meses = [
        'ENE','FEB','MAR','ABR',
        'MAY','JUN','JUL','AGO',
        'SEP','OCT','NOV','DIC'
    ];

    const mes =
        meses[parseInt(partes[1]) - 1];

    const anio =
        partes[0].slice(-2);

    return `${dia}-${mes}-${anio}`;
}

// =========================================
// CALCULAR PROXIMA FECHA
// =========================================

function calcularProximaFecha(

    tipo,
    fechaInicio,
    diaCumplimiento

) {

    const fecha =
        new Date(
            fechaInicio + 'T00:00:00'
        );

    // =====================================
    // SEMANAL
    // =====================================

    if(tipo === 'Semanal') {

        fecha.setDate(
            fecha.getDate() + 7
        );
    }

    // =====================================
    // DIARIO
    // =====================================

    else if(tipo === 'Diario') {

        fecha.setDate(
            fecha.getDate() + 1
        );
    }

    // =====================================
    // MENSUAL
    // =====================================

    else if(tipo === 'Mensual') {

        fecha.setMonth(
            fecha.getMonth() + 1
        );
    }

    // =====================================
    // TRIMESTRAL
    // =====================================

    else if(tipo === 'Trimestral') {

        fecha.setMonth(
            fecha.getMonth() + 3
        );
    }

    // =====================================
    // SEMESTRAL
    // =====================================

    else if(tipo === 'Semestral') {

        fecha.setMonth(
            fecha.getMonth() + 6
        );
    }

    const anio =
        fecha.getFullYear();

    const mes = String(

        fecha.getMonth() + 1

    ).padStart(2, '0');

    const dia = String(

        fecha.getDate()

    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
}

// =========================================
// GUARDAR
// =========================================

form.addEventListener(

    'submit',

    async (e) => {

    e.preventDefault();

    let estadoSeleccionado =
        'Pendiente';

    const numeroRespuesta =
        document.getElementById(
            'numeroRespuesta'
        ).value;

    const fechaRespuesta =
        document.getElementById(
            'fechaRespuesta'
        ).value;

    // =====================================
    // COMPLETADO AUTOMATICO
    // =====================================

    if(

        numeroRespuesta.trim() !== ''

        ||

        fechaRespuesta !== ''

    ) {

        estadoSeleccionado =
            'Completado';
    }

    let nuevaProximaFecha;

    // =====================================
    // SI ESTA COMPLETADO
    // =====================================

    if(

        estadoSeleccionado ===
        'Completado'

    ) {

        nuevaProximaFecha =

            document.getElementById(
                'proximaFechaOculta'
            ).value;

    } else {

        nuevaProximaFecha =

            editandoId

            ?

            document.getElementById(
                'proximaFechaOculta'
            ).value

            :

            calcularProximaFecha(

                document.getElementById(
                    'tipo'
                ).value,

                document.getElementById(
                    'fechaInicio'
                ).value,

                document.getElementById(
                    'diaCumplimiento'
                ).value
            );
    }

    const data = {

        nombre:
            document.getElementById(
                'nombre'
            ).value,

        tipo:
            document.getElementById(
                'tipo'
            ).value,

        responsable:
            document.getElementById(
                'responsable'
            ).value,

        descripcion:
            document.getElementById(
                'descripcion'
            ).value,

        fechaInicio:
            document.getElementById(
                'fechaInicio'
            ).value,

        proximaFecha:
            nuevaProximaFecha,

        estado:
            estadoSeleccionado,

        tipoRespuesta:
            document.getElementById(
                'tipoRespuesta'
            ).value,

        numeroRespuesta: (() => {

            const numero =
                document.getElementById(
                    'numeroRespuesta'
                ).value.trim();

            if(numero === '') return '';

            const anio = String(
                new Date().getFullYear()
            ).slice(-2);

            if(numero.includes('/')) {
                return numero;
            }

            return `${numero}/${anio}`;

        })(),

        fechaRespuesta:
            document.getElementById(
                'fechaRespuesta'
            ).value,

        diaCumplimiento:
            document.getElementById(
                'diaCumplimiento'
            ).value
    };

    // =====================================
    // EDITAR
    // =====================================

    if(editandoId) {

        await fetch(

            '/api/requerimientos/' +
            editandoId,

            {

                method: 'PUT',

                headers: {
                    'Content-Type':
                    'application/json'
                },

                body:
                    JSON.stringify(data)
            }
        );

        // =====================================
        // CREAR NUEVO CICLO
        // =====================================

        if(
            estadoSeleccionado ===
            'Completado'
        ) {

            const fechaBase =

                document.getElementById(
                    'proximaFechaOculta'
                ).value;

            const siguienteFecha =
                calcularProximaFecha(

                    data.tipo,

                    fechaBase,

                    data.diaCumplimiento
                );

            const nuevoRequerimiento = {

                    nombre: data.nombre,

                    tipo: data.tipo,

                    responsable: data.responsable,

                    descripcion: data.descripcion,

                    fechaInicio: fechaBase,

                    proximaFecha: siguienteFecha,

                    estado: 'Pendiente',

                    tipoRespuesta: '',

                    numeroRespuesta: '',

                    fechaRespuesta: '',

                    diaCumplimiento: data.diaCumplimiento
                };



            await fetch(

                '/api/requerimientos',

                {

                    method: 'POST',

                    headers: {
                        'Content-Type':
                        'application/json'
                    },

                    body: JSON.stringify(
                        nuevoRequerimiento
                    )
                }
            );
        }

    } else {

        await fetch(

            '/api/requerimientos',

            {

                method: 'POST',

                headers: {
                    'Content-Type':
                    'application/json'
                },

                body:
                    JSON.stringify(data)
            }
        );
    }

    form.reset();

    editandoId = null;

    cargarRequerimientos();
});

// =========================================
// ELIMINAR
// =========================================

async function eliminarReq(id) {

    if(
        !confirm(
            '¿Eliminar requerimiento?'
        )
    ) return;

    await fetch(

        '/api/requerimientos/' + id,

        {
            method: 'DELETE'
        }
    );

    cargarRequerimientos();
}

// =========================================
// EDITAR
// =========================================

async function editar(id) {

    const res =
    await fetch(
        '/api/requerimientos/' + id
    );

const req =
    await res.json();

    if(!req) return;

    editandoId = id;

    document.getElementById(
        'nombre'
    ).value = req.nombre;

    document.getElementById(
        'tipo'
    ).value = req.tipo;

    document.getElementById(
        'responsable'
    ).value = req.responsable;

    document.getElementById(
        'descripcion'
    ).value = req.descripcion;

    document.getElementById(
        'fechaInicio'
    ).value =
        req.fechaInicio.split('T')[0];

    document.getElementById(
        'proximaFechaOculta'
    ).value =
        req.proximaFecha.split('T')[0];

    document.getElementById(
        'diaCumplimiento'
    ).value =
        req.diaCumplimiento || '';

    document.getElementById(
        'tipoRespuesta'
    ).value =
        req.tipoRespuesta || '';

    document.getElementById(
        'numeroRespuesta'
    ).value =
        req.numeroRespuesta || '';

    document.getElementById(
        'fechaRespuesta'
    ).value =

        req.fechaRespuesta

        ?

        req.fechaRespuesta
        .split('T')[0]

        :

        '';

    controlarDiaCumplimiento();
}

// =========================================
// PANEL
// =========================================

function actualizarPanel(datos) {

    let vencidos = 0;

    let urgentes = 0;

    let completados = 0;

    datos.forEach(req => {

        const hoy = new Date();

        hoy.setHours(0,0,0,0);

        const fechaReq =
            new Date(req.fechaInicio);

        fechaReq.setHours(0,0,0,0);

        const diferencia = Math.floor(

            (fechaReq - hoy)

            /

            (1000 * 60 * 60 * 24)
        );
        console.log(
                req.nombre,
                    fechaReq,
                    hoy,
                    diferencia
                );

        if(req.estado === 'Completado') {

            completados++;

        } else if(diferencia < 0) {

            vencidos++;

        } else if(

            diferencia <=
            obtenerAnticipacion(req.tipo)

        ) {

            urgentes++;
        }
    });

    document.getElementById(
        'count-vencidos'
    ).textContent = vencidos;

    document.getElementById(
        'count-urgentes'
    ).textContent = urgentes;

    document.getElementById(
        'count-completados'
    ).textContent = completados;
}

// =========================================
// INICIO
// =========================================




controlarDiaCumplimiento();

cargarRequerimientos();

// ====================================
// MAYÚSCULAS AUTOMÁTICAS
// ====================================

document.querySelectorAll(
    'input[type="text"], textarea'
).forEach(campo => {

    campo.addEventListener('input', () => {

        campo.value =
            campo.value.toUpperCase();

    });

});