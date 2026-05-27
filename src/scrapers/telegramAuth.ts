import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import * as readline from 'readline';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const apiId = Number(process.env['TELEGRAM_API_ID']);
const apiHash = process.env['TELEGRAM_API_HASH'] ?? '';

if (!apiId || !apiHash) {
    console.error(
        'Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env\n' +
        'Get yours at https://my.telegram.org → API development tools\n\n' +
        'Add to .env:\n  TELEGRAM_API_ID=12345678\n  TELEGRAM_API_HASH=abc123...\n  TELEGRAM_PHONE=+49...'
    );
    process.exit(1);
}

const phone = process.env['TELEGRAM_PHONE'] ?? '';
if (!phone) {
    console.error('Missing TELEGRAM_PHONE in .env (e.g. +491234567890)');
    process.exit(1);
}

function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    const existingSession = process.env['TELEGRAM_SESSION'] ?? '';
    const session = new StringSession(existingSession);

    console.log('Connecting to Telegram...');
    const client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 3,
    });

    await client.start({
        phoneNumber: async () => phone,
        phoneCode: async () => prompt('Enter the code Telegram sent you: '),
        password: async () => prompt('Enter your 2FA password (if enabled): '),
        onError: (err) => console.error('Auth error:', err),
    });

    console.log('\nAuthenticated successfully!');

    // Save session string
    const sessionString = client.session.save() as unknown as string;

    // Append or update TELEGRAM_SESSION in .env
    const envPath = '.env';
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf-8');
    } catch {
        // .env doesn't exist yet
    }

    if (envContent.includes('TELEGRAM_SESSION=')) {
        envContent = envContent.replace(
            /TELEGRAM_SESSION=.*/,
            `TELEGRAM_SESSION=${sessionString}`
        );
    } else {
        envContent += `\nTELEGRAM_SESSION=${sessionString}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`Session saved to ${envPath}`);

    // List groups
    console.log('\n--- Your Groups & Channels ---\n');

    const dialogs = await client.getDialogs({ limit: 100 });

    const groups = dialogs.filter(d => d.isGroup || d.isChannel);
    groups.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    for (const dialog of groups) {
        const type = dialog.isChannel ? 'Channel' : 'Group';
        const id = dialog.id?.toString() ?? '(unknown)';
        console.log(`  [${type}]  ${dialog.title ?? dialog.name ?? '(unnamed)'}  →  ID: ${id}`);
    }

    console.log(`\n${groups.length} group(s)/channel(s) found.`);
    console.log(
        '\nCopy the IDs of the groups you want to scrape and add them to .env:\n' +
        '  TELEGRAM_GROUP_IDS=-1001234567890,-1009876543210'
    );

    await client.disconnect();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
