const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({

    usuario: {
        type: String,
        required: true
    },

    accion: {
        type: String,
        required: true
    },

    documento: {
        type: String,
        default: ''
    },

    fecha: {
        type: String,
        default: () => new Date().toLocaleString()
    }

});

module.exports = mongoose.model(
    'Log',
    LogSchema
);
