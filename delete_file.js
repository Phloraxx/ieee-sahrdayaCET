const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'events', 'page_new.tsx');

try {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('SUCCESS: File deleted -', filePath);
    } else {
        console.log('File does not exist:', filePath);
    }
    
    // List remaining files
    const dirPath = path.join(__dirname, 'src', 'app', 'events');
    const files = fs.readdirSync(dirPath);
    console.log('\nFiles in events directory:');
    files.forEach(file => console.log(' -', file));
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}
