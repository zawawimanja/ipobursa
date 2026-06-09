const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\aaror\\.gemini\\antigravity-ide\\brain\\4ea41c72-0897-4532-b3b1-fed5f265b0e1\\.system_generated\\logs\\transcript.jsonl';

async function printEarlyUserInputs() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        const parsed = JSON.parse(line);
        if (parsed.type === "USER_INPUT") {
            count++;
            // Only print early inputs (first 40)
            if (count <= 40) {
                console.log(`[U#${count}] Step ${parsed.step_index}: ${parsed.content.replace(/<USER_REQUEST>|<\/USER_REQUEST>/g, '').trim().substring(0, 200)}`);
            }
        }
    }
}

printEarlyUserInputs().catch(console.error);
