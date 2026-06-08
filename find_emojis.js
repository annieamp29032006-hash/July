const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers] });

client.once('ready', () => {
    const baucuaEmojis = {};
    client.emojis.cache.forEach(emoji => {
        if (emoji.name.toLowerCase().includes('bau') || emoji.name.toLowerCase().includes('cua') || 
            emoji.name.toLowerCase().includes('tom') || emoji.name.toLowerCase().includes('ca') || 
            emoji.name.toLowerCase().includes('ga') || emoji.name.toLowerCase().includes('nai')) {
            console.log(`${emoji.name}: <:${emoji.name}:${emoji.id}>`);
            baucuaEmojis[emoji.name] = `<:${emoji.name}:${emoji.id}>`;
        }
    });
    console.log(baucuaEmojis);
    process.exit(0);
});

client.login(process.env.TOKEN);