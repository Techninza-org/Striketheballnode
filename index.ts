import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = 3000; 

app.listen(PORT, () => {
    console.log(`HTTP Server running on http://localhost:${PORT}`);
});
