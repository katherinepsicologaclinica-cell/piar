const { Client } = require('pg');

const regions = [
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-us-west-2.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-eu-west-2.pooler.supabase.com',
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-ap-southeast-2.pooler.supabase.com',
  'aws-0-ap-northeast-1.pooler.supabase.com',
  'aws-0-ap-northeast-2.pooler.supabase.com',
  'aws-0-ap-south-1.pooler.supabase.com',
  'aws-0-ca-central-1.pooler.supabase.com'
];

async function bruteforceRegion() {
    console.log("Iniciando busqueda de region...");
    const projectRef = 'bddsqcullhonpzhqglxz';
    const password = 'QRrZuTDdOxycjFUs';

    for (const region of regions) {
        console.log(`Probando region: ${region}...`);
        const client = new Client({
            connectionString: `postgres://postgres.${projectRef}:${password}@${region}:6543/postgres`,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 3000
        });

        try {
            await client.connect();
            console.log(`\n\nEXITO!!! Conectado a la region: ${region}`);
            return client;
        } catch (e) {
            console.log(`Fallo: ${e.message}`);
        }
    }
    console.log("No se pudo conectar a ninguna region.");
    return null;
}

bruteforceRegion().then(client => {
    if(client) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});
