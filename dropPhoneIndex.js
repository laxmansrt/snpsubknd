const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(async () => {
    console.log('MongoDB connected');
    try {
        await mongoose.connection.collection('users').dropIndex('phone_1');
        console.log('Successfully dropped phone_1 index');
    } catch (error) {
        console.log('Error or index already dropped:', error.message);
    }
    process.exit(0);
}).catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
});
