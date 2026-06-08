require('dotenv').config();
const { Client, Events } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [] });

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    try {
        const emojis = {};
        const appEmojis = await client.application.emojis.fetch();
        const files = fs.readdirSync('./baucua_images').filter(f => f.endsWith('.png'));
        
        for (const filename of files) {
            const name = filename.replace('.png', '');
            const emojiName = `baucua_${name}`;
            const dest = `./baucua_images/${filename}`;
            
            const existing = appEmojis.find(e => e.name === emojiName);
            if (existing) {
                console.log(`Already exists: <:${existing.name}:${existing.id}>`);
                emojis[name] = `<:${existing.name}:${existing.id}>`;
            } else {
                console.log(`Uploading ${name}...`);
                try {
                    const emoji = await client.application.emojis.create({ attachment: dest, name: emojiName });
                    console.log(`Uploaded! <:${emoji.name}:${emoji.id}>`);
                    emojis[name] = `<:${emoji.name}:${emoji.id}>`;
                } catch(err) {
                    console.error(`Failed to upload ${emojiName}:`, err.rawError ? err.rawError.message : err);
                }
            }
        }
        console.log('Final Mappings:');
        console.log(JSON.stringify(emojis, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.TOKEN);