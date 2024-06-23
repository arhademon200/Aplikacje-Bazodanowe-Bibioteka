const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookSchema = new Schema({
    isborrowed: {
        type: Boolean,
        required: true,
        default: false
    },
    borrower: {
        type: Schema.Types.ObjectId, // Define the type as ObjectId
        ref: 'User', // Reference the User model
    },
    title: {
        type: String,
        required: true,
        unique: true
    },
    year: {
        type: Number,
        required: true
    },
    author: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Book", bookSchema);