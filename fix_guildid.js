const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');
code = code.replace(/const PREFIX = '1';/, `const PREFIX = '1';\nlet guildId = null;`);
code = code.replace(/const guildId = interaction\.guild\.id;/g, 'guildId = interaction.guild.id;');
code = code.replace(/const guildId = message\.guild\.id;/g, 'guildId = message.guild.id;');
fs.writeFileSync('index.js', code, 'utf8');
console.log('Fixed guildId declarations.');
