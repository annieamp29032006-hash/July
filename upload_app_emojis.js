const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const https = require('https');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const emojisToUpload = {
    tick: '1492444017810604123',
    shop: '1492460790580645990',
    gift: '1492460909765853356',
    gun: '1492460951189061662',
    meow: '1492461041567928454',
    bling: '1492839307801530498',
    money: '1492841008906637433',
    love: '1492842121919467520',
    error: '1493100511325585581',
    taixiu: '1501234540033736784'
};

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error('Failed to get ' + url + ' - Status: ' + response.statusCode));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

client.once('ready', async () => {
    console.log('Bot logged in.');
    const results = {};
    for (const [name, id] of Object.entries(emojisToUpload)) {
        try {
            const ext = 'gif';
            const url = \https://cdn.discordapp.com/emojis/\.\\;
            const dest = \./\.\\;
            console.log(\Downloading \ from \\);
            await download(url, dest);

            // Tên application emoji ph?i t? 2-32 kí t? và ch? ch?a ch?/s?/d?u g?ch du?i
            const appEmojiName = \pp_\\;
            console.log(\Uploading \ to application...\);
            const created = await client.application.emojis.create({
                attachment: dest,
                name: appEmojiName
            });
            console.log(\Success: <a:\:\>\);
            results[name] = \<a:\:\>\;
            
            // Xoá file rác
            fs.unlinkSync(dest);
        } catch (e) {
            console.error(\Failed for \:\, e.message || e);
        }
    }
    fs.writeFileSync('new_emojis.json', JSON.stringify(results, null, 2));
    console.log('Finished uploading. Saved to new_emojis.json');
    process.exit(0);
});

client.login('MTUwMTA0NTk3NzQwOTM4ODczNg.GeS-S3.da6SMKeWJ1a31vp9adoJlo8g9TsUdz6UVZT4rM');

