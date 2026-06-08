const fs = require('fs'); let code = fs.readFileSync('index.js', 'utf8'); code = code.replace(/const EMOJIS = \{[\s\S]*?\};/, `const EMOJIS = {
    bank: '🏦',
    shop: '🏪',
    pet: '🐾',
    money: '💵',
    sword: '⚔️',
    sell: '💰',
    help: '📚',
    pickaxe: '⛏️',
    dice: '🎲',
    love: '❤️',
    robot: '🤖'
};`); const replacements = { '<a:app_error:1510057420112531538>': '❌', '<a:Error:1493100511325585581>': '❌', '<a:app_tick:1510057381659283526>': '✅', '<a:tick:1492444017810604123>': '✅', '<a:app_money:1510057406166597702>': '💰', '<a:mlz_poin:1492841008906637433>': '💰', '<a:app_bling:1510057400441507891>': '✨', '<a:mlz_bling:1492839307801530498>': '✨', '<a:app_love:1510057409970704455>': '❤️', '<a:mlz_heart:1492842121919467520>': '❤️', '<a:app_taixiu:1510057423648587988>': '🎲', '<a:taixiu:1501234540033736784>': '🎲', '<a:app_shop:1510057385383956700>': '🏪', '<a:hgtt_hopqua9:1492460790580645990>': '🏪', '<a:app_meow:1510057397325004802>': '🐾', '<a:meow:1492461041567928454>': '🐾', '<a:app_gun:1510057393663246497>': '⚔️', '<a:gun:1492460951189061662>': '⚔️', '<a:app_gift:1510057390278447186>': '🎁', '<a:gift:1492460909765853356>': '🎁' }; for (const [oldStr, newStr] of Object.entries(replacements)) { code = code.split(oldStr).join(newStr); } fs.writeFileSync('index.js', code); console.log('Reverted successfully.');
