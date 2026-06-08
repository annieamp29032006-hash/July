const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Update EMOJIS definition
code = code.replace(/const EMOJIS = \{[\s\S]*?\};/, `const EMOJIS = {
    bank: '<a:mlz_poin:1492841008906637433>',
    shop: '<a:hgtt_hopqua9:1492460790580645990>',
    pet: '<a:meow:1492461041567928454>',
    money: '<a:mlz_poin:1492841008906637433>',
    sword: '<a:gun:1492460951189061662>',
    sell: '<a:gift:1492460909765853356>',
    help: '<a:mlz_bling:1492839307801530498>',
    pickaxe: '⛏️',
    dice: '<a:taixiu:1501234540033736784>',
    love: '<a:mlz_heart:1492842121919467520>',
    robot: '🤖',
    tick: '<a:tick:1492444017810604123>',
    error: '<a:Error:1493100511325585581>',
    bling: '<a:mlz_bling:1492839307801530498>'
};`);

// 2. Replace hardcoded emojis throughout the code
const replacements = {
    '❌': '<a:Error:1493100511325585581>',
    '🚫': '<a:Error:1493100511325585581>',
    '⚠️': '<a:Error:1493100511325585581>',
    '✅': '<a:tick:1492444017810604123>',
    '💰': '<a:mlz_poin:1492841008906637433>',
    '💵': '<a:mlz_poin:1492841008906637433>',
    '💎': '<a:mlz_poin:1492841008906637433>',
    '🪙': '<a:mlz_poin:1492841008906637433>',
    '✨': '<a:mlz_bling:1492839307801530498>',
    '🎉': '<a:mlz_bling:1492839307801530498>',
    '❤️': '<a:mlz_heart:1492842121919467520>',
    '💖': '<a:mlz_heart:1492842121919467520>',
    '🎲': '<a:taixiu:1501234540033736784>',
    '🎮': '<a:taixiu:1501234540033736784>',
    '🎵': '<a:mlz_bling:1492839307801530498>',
    '🎶': '<a:mlz_bling:1492839307801530498>',
    '🏆': '<a:mlz_bling:1492839307801530498>'
};

for (const [key, value] of Object.entries(replacements)) {
    // Global replace for all occurrences
    code = code.split(key).join(value);
}

fs.writeFileSync('index.js', code);
console.log('Done replacing emojis.');
