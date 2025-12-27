
import fs from 'fs';
import path from 'path';

// Basic parser for .env files
function parseEnv(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
    return env;
}

async function run() {
    const env = parseEnv(path.join(process.cwd(), '.env.local'));
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables');
        process.exit(1);
    }

    // Fetch categories
    const categoriesRes = await fetch(`${supabaseUrl}/rest/v1/room_categories?select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const categories = await categoriesRes.json();
    console.log('CATEGORIES:' + JSON.stringify(categories));

    // Fetch rooms
    const roomsRes = await fetch(`${supabaseUrl}/rest/v1/rooms?select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const rooms = await roomsRes.json();
    console.log('ROOMS:' + JSON.stringify(rooms));
}

run().catch(console.error);
