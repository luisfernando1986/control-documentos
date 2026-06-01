const mongoose = require('mongoose');

const requerimientoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },

    tipo: {
        type: String,
        enum: ['Diario', 'Semanal', 'Mensual', 'Trimestral', 'Semestral'],
        required: true
    },

    responsable: {
        type: String,
        required: true
    },

    descripcion: {
        type: String
    },

    fechaInicio: {
        type: Date,
        required: true
    },

    proximaFecha: {
        type: Date,
        required: true
    },

    estado: {
        type: String,
        enum: ['Pendiente', 'Cumplido', 'Vencido'],
        default: 'Pendiente'
    },

        tipoRespuesta: {
            type: String,
            default: ''
        },

        numeroRespuesta: {
            type: String,
            default: ''
        },

        fechaRespuesta: {
            type: Date
        },


        diaCumplimiento: {
            type: String,
            default: ''
        },

        codigoRequerimiento: {
            type: String,
            unique: true
        },

    createdAt: {
        type: Date,
        default: Date.now
    }
});




module.exports = mongoose.model('Requerimiento', requerimientoSchema);