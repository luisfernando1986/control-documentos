require('dotenv').config();
/*============================================*/

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const XLSX = require('xlsx');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');

const Documento = require('./models/Documento');
const Usuario = require('./models/Usuario');
const Requerimiento = require('./models/Requerimiento');
const Log = require('./models/Log');
const Historial = require('./models/Historial');
const Eliminado = require('./models/Eliminado');

const app = express();
// ================= MONGODB =================

console.log(process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB conectado');
    })
    .catch((error) => {
        console.log('❌ ERROR MONGODB:', error);
    });

// ================= CREAR ADMIN =================
async function crearAdminInicial() {
    const existe = await Usuario.findOne({ usuario: 'admin' });

    if (!existe) {
        const passwordHash = await bcrypt.hash('123', 10);

        const admin = new Usuario({
            usuario: 'admin',
            password: passwordHash,
            rol: 'ADMIN',
            rango: 'CAPITAN'
        });

        await admin.save();
        console.log('✅ ADMIN CREADO: admin / 123');
    }
}

crearAdminInicial();

// ================= CONFIG =================

app.use(express.json());

app.use(session({
    secret: 'secreto_militar',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60
    }
}));

app.use(express.static('public'));

// ================= SEGURIDAD LOGIN =================

let intentos = {};

// ================= SESIÓN =================

function verificarSesion(req, res, next) {
    if (req.session.usuario) {
        next();
    } else {
        res.status(401).json({ mensaje: 'No autorizado' });
    }
}

// ================= LOG =================

async function registrarLog(usuario, accion, documento = '') {
    try {
        await new Log({ usuario, accion, documento }).save();
    } catch (error) {
        console.log(error);
    }
}

// ================= HISTORIAL =================

async function registrarHistorial(usuario, documento, antes, despues) {
    try {
        await new Historial({ usuario, documento, antes, despues }).save();
    } catch (error) {
        console.log(error);
    }
}

// ================= LOGIN =================

app.post('/login', async (req, res) => {
    

    try {

        const { usuario, password } = req.body;
        const ip = req.ip;

        if(intentos[ip] >= 5){
            return res.json({ ok:false, mensaje:'Bloqueado por intentos' });
        }

        const user = await Usuario.findOne({ usuario });

        if (!user) {
            intentos[ip] = (intentos[ip] || 0) + 1;
            return res.json({ ok: false });
        }

        const coincide = await bcrypt.compare(password, user.password);

        if (coincide) {

            intentos[ip] = 0;

            req.session.usuario = user.usuario;
            req.session.rol = user.rol;
            req.session.rango = user.rango;

            await registrarLog(user.usuario, 'LOGIN');

            res.json({
                ok: true,
                usuario: user.usuario,
                rol: user.rol,
                rango: user.rango
            });

        } else {

            intentos[ip] = (intentos[ip] || 0) + 1;
            res.json({ ok: false });

        }

    } catch (error) {

        console.log(error);
        res.status(500).json({ mensaje: 'Error login' });

    }
});

// ================= LOGOUT =================

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

// ================= DOCUMENTOS =================

app.get('/documentos', verificarSesion, async (req, res) => {
    res.json(await Documento.find());
});

app.post('/documentos', verificarSesion, async (req, res) => {
    try {
        const nuevo = new Documento(req.body);

        if(nuevo.oficio_respuesta?.trim() !== ''){
            nuevo.estado = 'Cumplido';
        }

        await nuevo.save();

        registrarLog(req.session.usuario, 'CREÓ DOC', nuevo.numero_documento);

        res.json({ mensaje: 'OK' });

    } catch {
        res.status(500).json({ mensaje: 'Error' });
    }
});

app.put('/documentos/:id', verificarSesion, async (req, res) => {
    if(
    req.session.rol !== 'ADMIN' &&
    req.session.rol !== 'EDITOR'
){
    return res.status(403).json({
        mensaje:'No autorizado'
    });
}

    const antes = await Documento.findById(req.params.id);

    const actualizado = await Documento.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    registrarHistorial(req.session.usuario, actualizado.numero_documento, antes, actualizado);
    registrarLog(req.session.usuario, 'EDITÓ', actualizado.numero_documento);

    res.json({ ok:true });
});

app.delete('/documentos/:id', verificarSesion, async (req, res) => {
    if(req.session.rol !== 'ADMIN'){
    return res.status(403).json({
        mensaje:'No autorizado'
    });
}

    const eliminado = await Documento.findById(req.params.id);

    if(!eliminado) return res.status(404).json({ mensaje:'No existe' });

    await new Eliminado({
        ...eliminado.toObject(),
        eliminado_por: req.session.usuario
    }).save();

    await Documento.findByIdAndDelete(req.params.id);

    registrarLog(req.session.usuario, 'ELIMINÓ', eliminado.numero_documento);

    res.json({ ok:true });
});

// ================= HISTORIAL =================

app.get('/historial', verificarSesion, async (req, res) => {
    res.json(await Historial.find().sort({ _id:-1 }));
});

// ================= LOGS =================

app.get('/logs', verificarSesion, async (req, res) => {
    res.json(await Log.find().sort({ _id:-1 }));
});

// ================= EXPORTAR =================

app.get('/exportar-excel', verificarSesion, async (req, res) => {

    const datos = await Documento.find();

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);

    XLSX.utils.book_append_sheet(wb, ws, 'Docs');

    const ruta = `./backup_excel_${Date.now()}.xlsx`;

    XLSX.writeFile(wb, ruta);

    res.download(ruta);
});

// ================= USUARIOS =================

app.get('/usuarios', verificarSesion, async (req, res) => {

    if(req.session.rol !== 'ADMIN') return res.status(403).json({});

    res.json(await Usuario.find());
});

app.post('/usuarios', verificarSesion, async (req, res) => {

    if(req.session.rol !== 'ADMIN') return res.status(403).json({});

    const existe = await Usuario.findOne({ usuario:req.body.usuario });

    if(existe) return res.json({ ok:false });

    const hash = await bcrypt.hash(req.body.password,10);

    await new Usuario({
        usuario:req.body.usuario,
        password:hash,
        rol:req.body.rol,
        rango:req.body.rango
    }).save();

    res.json({ ok:true });
});

app.delete('/usuarios/:usuario', verificarSesion, async (req, res) => {

    if(req.session.rol !== 'ADMIN') return res.status(403).json({});

    await Usuario.findOneAndDelete({ usuario:req.params.usuario });

    res.json({ ok:true });
});

// ================= PAPELERA =================

app.get('/eliminados', verificarSesion, async (req, res) => {
    res.json(await Eliminado.find().sort({ _id:-1 }));
});

app.post('/restaurar/:id', verificarSesion, async (req, res) => {

    try {

        const doc = await Eliminado.findById(req.params.id);

        if(!doc) {
            return res.status(404).json({ mensaje: 'No encontrado' });
        }

        // 🔥 ELIMINAR _id para evitar conflicto
        const datos = doc.toObject();
        delete datos._id;

        const restaurado = new Documento(datos);

        await restaurado.save();

        await Eliminado.findByIdAndDelete(req.params.id);

        registrarLog(req.session.usuario, 'RESTAURÓ', doc.numero_documento);

        res.json({ ok: true });

    } catch(error) {

        console.log('ERROR RESTAURAR:', error);

        res.status(500).json({ mensaje: 'Error restaurando' });
    }
});

// ================= BACKUP =================

const carpeta = './backup';

if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta);
}

app.get('/backups', verificarSesion, (req, res) => {
    res.json(fs.readdirSync(carpeta));
});

app.get('/backup/:nombre', verificarSesion, (req, res) => {
    res.download(path.join(__dirname,'backup',req.params.nombre));
});

app.post('/restaurar-backup/:nombre', verificarSesion, async (req, res) => {

    const ruta = path.join(__dirname,'backup',req.params.nombre);

    const data = JSON.parse(fs.readFileSync(ruta,'utf8'));

    await Documento.deleteMany();
    await Usuario.deleteMany();
    await Log.deleteMany();
    await Historial.deleteMany();
    await Eliminado.deleteMany();

    if(data.documentos) await Documento.insertMany(data.documentos);
    if(data.usuarios) await Usuario.insertMany(data.usuarios);
    if(data.logs) await Log.insertMany(data.logs);
    if(data.historial) await Historial.insertMany(data.historial);
    if(data.eliminados) await Eliminado.insertMany(data.eliminados);

    res.json({ ok:true });
});

// ================= AUTO BACKUP =================

async function hacerBackup() {

    const data = {
        documentos: await Documento.find(),
        usuarios: await Usuario.find(),
        logs: await Log.find(),
        historial: await Historial.find(),
        eliminados: await Eliminado.find()
    };

    const nombre = `backup_${Date.now()}.json`;

    fs.writeFileSync(`${carpeta}/${nombre}`, JSON.stringify(data,null,2));

    console.log('✅ BACKUP:', nombre);
}

setInterval(hacerBackup, 24 * 60 * 60 * 1000);

app.get('/verificar-db', async (req, res) => {

    const docs = await Documento.find().limit(5);

    res.json(docs);

});

// ================= SERVIDOR =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('===================================');
    console.log('✅ SERVIDOR CORRIENDO');
    console.log('🌐 http://localhost:' + PORT);
    console.log('===================================');

});

/* =========================================
   REQUERIMIENTOS
========================================= */

/* =========================================
   API REQUERIMIENTOS
========================================= */

// OBTENER
app.get(
    '/api/requerimientos',
    verificarSesion,
    async (req, res) => {
    try {

        const datos = await Requerimiento.find()
            .sort({ proximaFecha: 1 });

        res.json(datos);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: 'Error obteniendo requerimientos'
        });
    }
});


app.get(
    '/api/requerimientos/:id',
    verificarSesion,
    async (req, res) => {

    try {

        const requerimiento =
            await Requerimiento.findById(
                req.params.id
            );

        if(!requerimiento){
            return res.status(404).json({
                mensaje:'No encontrado'
            });
        }

        res.json(requerimiento);

    } catch(error){

        console.log(error);

        res.status(500).json({
            mensaje:'Error'
        });
    }
});


// CREAR
app.post(
    '/api/requerimientos',
    verificarSesion,
    async (req, res) => {
        if(
            req.session.rol !== 'ADMIN' &&
            req.session.rol !== 'EDITOR'
        ){
            return res.status(403).json({
                mensaje:'No autorizado'
            });
        }
    try {

        if(
            req.body.tipoRespuesta?.trim() !== '' &&
            req.body.numeroRespuesta?.trim() !== '' &&
            req.body.fechaRespuesta
        ) {

            req.body.estado = 'Completado';

        } else {

            req.body.estado = 'Pendiente';
        }

        // ==========================
        // GENERAR CÓDIGO AUTOMÁTICO
        // ==========================

        const ultimo = await Requerimiento
            .findOne()
            .sort({ createdAt: -1 });

        let correlativo = 1;

        if (
            ultimo &&
            ultimo.codigoRequerimiento
        ) {

            const numero = parseInt(
                ultimo.codigoRequerimiento.replace(
                    'REQ-',
                    ''
                )
            );

            correlativo = numero + 1;
        }

        req.body.codigoRequerimiento =
            'REQ-' +
            String(correlativo).padStart(4, '0');

        const nuevo =
            new Requerimiento(req.body);

        await nuevo.save();

        res.json({
            ok: true
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            ok: false
        });
    }
});


// EDITAR
// EDITAR
app.put(
    '/api/requerimientos/:id',
    verificarSesion,
    async (req, res) => {

    if(
        req.session.rol !== 'ADMIN' &&
        req.session.rol !== 'EDITOR'
    ){
        return res.status(403).json({
            mensaje:'No autorizado'
        });
    }
    try {

        if(
            req.body.tipoRespuesta?.trim() !== '' &&
            req.body.numeroRespuesta?.trim() !== '' &&
            req.body.fechaRespuesta
        ) {

            req.body.estado = 'Completado';

        } else {

            req.body.estado = 'Pendiente';
        }

        await Requerimiento.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json({
            ok: true
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            ok: false
        });
    }
});


// ELIMINAR
app.delete(
    '/api/requerimientos/:id',
    verificarSesion,
    async (req, res) => {

        if(req.session.rol !== 'ADMIN'){
            return res.status(403).json({
                mensaje:'No autorizado'
            });
        }

        await Requerimiento.findByIdAndDelete(
            req.params.id
        );

        res.json({
            ok:true
        });
    }
);


