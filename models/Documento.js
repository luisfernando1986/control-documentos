const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema({

    numero_documento: {
        type: String,
        required: true
    },

    descripcion: {
        type: String,
        required: true
    },

    elemento: {
        type: String,
        default: ''
    },

    seccion: {
        type: String,
        default: ''
    },

    instructor: {
        type: String,
        required: true
    },

    fecha_recepcion: {
        type: String,
        required: true
    },

    fecha_limite: {
        type: String,
        required: true
    },

    estado: {
        type: String,
        default: 'Pendiente'
    },

    oficio_respuesta: {
        type: String,
        default: ''
    },

    fecha_respuesta: {
        type: String,
        default: ''
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    'Documento',
    DocumentoSchema
);