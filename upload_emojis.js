const { Client, Events, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const https = require('https');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = 'MTUwMTA0NTk3NzQwOTM4ODczNg.GeS-S3.da6SMKeWJ1a31vp9adoJlo8g9TsUdz6UVZT4rM';
const baseUrl = 'https://raw.githubusercontent.com/thepKz/bau-cua-tom-ca-ver-tet/main/images/';
const files = ['bau.png', 'cua.png', 'tom.png', 'ca.png', 'ga.png', 'nai.png'];

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                https.get(response.headers.location, (res2) => {
                    res2.pipe(file);
                    file.on('finish', () => { file.close(resolve); });
                }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
            } else {
                response.pipe(file);
                file.on('finish', () => { file.close(resolve); });
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    try {
        const emojis = {};
        for (const filename of files) {
            const name = filename.replace('.png', '');
            const dest = `./baucua_images/${filename}`;
            console.log(`Downloading ${filename}...`);
            await downloadFile(baseUrl + filename, dest);
            
            console.log(`Uploading ${name} as application emoji...`);
            const emoji = await client.application.emojis.create({
                attachment: dest,
                name: `baucua_${name}`
            });
            console.log(`Uploaded! <:${emoji.name}:${emoji.id}>`);
            emojis[name] = `<:${emoji.name}:${emoji.id}>`;
        }
        console.log('All done! Here are your emoji mappings:');
        console.log(emojis);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(token);
