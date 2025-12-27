
import fs from 'fs';
import path from 'path';

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

const roomsToAdd = [
    { number: '103', type: 'Simple', floor: 1, capacity: 1, baseRate: 85, pricingModel: 'fixed', occupancyPrices: { 1: 85 } },
    { number: '104', type: 'Simple', floor: 1, capacity: 1, baseRate: 85, pricingModel: 'fixed', occupancyPrices: { 1: 85 } },
    { number: '105', type: 'Simple', floor: 1, capacity: 1, baseRate: 85, pricingModel: 'fixed', occupancyPrices: { 1: 85 } },
    { number: '106', type: 'Double', floor: 1, capacity: 2, baseRate: 110, pricingModel: 'flexible', occupancyPrices: { 1: 95, 2: 110 } },
    { number: '107', type: 'Double', floor: 1, capacity: 2, baseRate: 110, pricingModel: 'flexible', occupancyPrices: { 1: 95, 2: 110 } },
    { number: '108', type: 'Double', floor: 1, capacity: 2, baseRate: 110, pricingModel: 'flexible', occupancyPrices: { 1: 95, 2: 110 } },
    { number: '109', type: 'Double', floor: 1, capacity: 2, baseRate: 110, pricingModel: 'flexible', occupancyPrices: { 1: 95, 2: 110 } },
    { number: '202', type: 'Suite', floor: 2, capacity: 4, baseRate: 250, pricingModel: 'fixed', occupancyPrices: { 4: 250 } },
    { number: '203', type: 'Suite', floor: 2, capacity: 4, baseRate: 250, pricingModel: 'fixed', occupancyPrices: { 4: 250 } },
    { number: '204', type: 'Suite', floor: 2, capacity: 4, baseRate: 250, pricingModel: 'fixed', occupancyPrices: { 4: 250 } },
];

async function run() {
    const env = parseEnv(path.join(process.cwd(), '.env.local'));
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

    for (const room of roomsToAdd) {
        console.log(`Adding room ${room.number}...`);
        const res = await fetch(`${supabaseUrl}/rest/v1/rooms`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                number: room.number,
                type: room.type,
                floor: room.floor,
                capacity: room.capacity,
                base_rate: room.baseRate,
                pricing_model: room.pricingModel,
                occupancy_prices: room.occupancyPrices,
                status: 'Propre'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`Error adding room ${room.number}:`, err);
        } else {
            console.log(`Room ${room.number} added successfully.`);
        }
    }
}

run().catch(console.error);

