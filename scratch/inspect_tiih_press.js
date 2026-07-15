const axios = require('axios');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function main() {
    try {
        const response = await axios.get('https://tiih.com.my/index.php?p=press_release', { headers: HEADERS });
        const html = response.data;
        
        const count = (html.match(/<table/gi) || []).length;
        console.log('Table tags count:', count);
        
        // Find if there is an iframe
        const iframeCount = (html.match(/<iframe/gi) || []).length;
        console.log('Iframe tags count:', iframeCount);
        if (iframeCount > 0) {
            let match;
            const regex = /<iframe[^>]*src=["']([^"']*)["']/gi;
            while ((match = regex.exec(html)) !== null) {
                console.log('Iframe src:', match[1]);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

main();
