const fs = require('fs');

let oldCode = fs.readFileSync('old_baucua.js', 'utf8');
let newCode = fs.readFileSync('index.js', 'utf8');

// Get ROBBANK_SUCCESS_STORIES
const successStart = oldCode.indexOf("const ROBBANK_SUCCESS_STORIES = [");
const failEnd = oldCode.indexOf("function handleRobBank", successStart);
const robBankData = oldCode.substring(successStart, failEnd).trim();

// Get handleRobBank
const funcStart = oldCode.indexOf("function handleRobBank(user, targetUser) {");
const funcEndStr = "function handleTaiXiu(user, amountStr, choice) {";
const funcEnd = oldCode.indexOf(funcEndStr, funcStart);
const robBankFunc = oldCode.substring(funcStart, funcEnd).trim();

if (!newCode.includes("const ROBBANK_SUCCESS_STORIES = [")) {
    const p1 = newCode.indexOf("function handleRob(user, targetUser) {");
    if (p1 !== -1) {
        newCode = newCode.substring(0, p1) + robBankData + "\n\n" + robBankFunc + "\n\n" + newCode.substring(p1);
    }
}

// Re-register command
if (!newCode.includes("name: 'robbank'")) {
    newCode = newCode.replace(
        "const commands = [",
        "const commands = [\n  { name: 'robbank', description: 'Cướp ngân hàng của người khác', options: [{ name: 'user', type: 6, description: 'Nạn nhân', required: true }] },"
    );
}

// Add to interactionCreate
if (!newCode.includes("if (cmd === 'robbank') return interaction.reply(handleRobBank(user, interaction.options.getUser('user')));")) {
    newCode = newCode.replace(
        "if (cmd === 'rob') return interaction.reply(handleRob(user, interaction.options.getUser('user')));",
        "if (cmd === 'rob') return interaction.reply(handleRob(user, interaction.options.getUser('user')));\n  if (cmd === 'robbank') return interaction.reply(handleRobBank(user, interaction.options.getUser('user')));"
    );
}

// Add to messageCreate
if (!newCode.includes("if (cmd === 'robbank' || cmd === 'rb') {")) {
    const mStr = "if (cmd === 'rob') {\n        const targetUser = message.mentions.users.first();\n        return message.reply(handleRob(user, targetUser));\n    }";
    const newMStr = mStr + "\n\n    if (cmd === 'robbank' || cmd === 'rb') {\n        const targetUser = message.mentions.users.first();\n        return message.reply(handleRobBank(user, targetUser));\n    }";
    newCode = newCode.replace(mStr, newMStr);
}

fs.writeFileSync('index.js', newCode);
console.log("Restored robbank!");