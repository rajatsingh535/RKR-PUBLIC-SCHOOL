const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/rkr_school')
  .then(async () => {
    console.log('Connected to DB');
    const users = await User.find();
    console.log('Users:', users);
    
    // Check if passwords are hashed
    for (const u of users) {
        console.log(`User: ${u.email}, Password Hash: ${u.password}`);
        const isMatch = await u.comparePassword('test1234'); // Assuming test password
        console.log(`Match with 'test1234':`, isMatch);
    }
    
    process.exit();
  })
  .catch(err => console.error(err));
