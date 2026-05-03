const mongoose = require('mongoose');

const HistorialSchema = new mongoose.Schema({

    usuario: {
        type: String,
        required: true
    },

    documento: {
        type: String,
        required: true
    },

    antes: {
        type: Object,
        required: true
    },

    despues: {
        type: Object,
        required: true
    },

    fecha: {
        type: String,
        default: () => new Date().toLocaleString()
    }

});

module.exports = mongoose.model(
    'Historial',
    HistorialSchema
);
