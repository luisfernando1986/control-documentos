const mongoose = require('mongoose');

const EliminadoSchema = new mongoose.Schema({

    numero_documento: String,

    descripcion: String,

    elemento: String,

    seccion: String,

    instructor: String,

    fecha_recepcion: String,

    fecha_limite: String,

    estado: String,

    oficio_respuesta: String,

    fecha_respuesta: String,

    eliminado_por: String,

    fecha_eliminado: {
        type: String,
        default: () => new Date().toLocaleString()
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    'Eliminado',
    EliminadoSchema
);