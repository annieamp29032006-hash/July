require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async c => {
    try {
        const emojis = await c.application.emojis.fetch();
        console.log('App Emojis:');
        emojis.forEach(e => {
            if (e.name.startsWith('baucua_') || e.name.startsWith('app_')) {
                console.log(e.name + ': ' + e.id);
            }
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});
client.login(process.env.DISCORD_TOKEN || 'MTUwMTA0NTk3NzQwOTM4ODczNg.GeS-S3.da6SMKeWJ1a31vp9adoJlo8g9TsUdz6UVZT4rM');
