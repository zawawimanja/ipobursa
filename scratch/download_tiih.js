const axios = require('axios');
const fs = require('fs');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function main() {
    try {
        const response = await axios.get('https://tiih.com.my/index.php?p=press_release', { headers: HEADERS });
        fs.writeFileSync('scratch/tiih_press.html', response.data);
        console.log('Saved to scratch/tiih_press.html');
    } catch (e) {
        console.error(e);
    }
}

main();
