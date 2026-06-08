const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const newFunctions = `
async function updateBauCuaUI(session) {
    let desc = \`Bàn đã mở! Vui lòng chọn 1 linh vật bên dưới để đặt cược!\\n\\n*(Sẽ chốt đơn sau **<t:\${Math.floor(session.endTime/1000)}:R>**)*\\n\\n**Danh sách cược:**\\n\`;
    let hasBets = false;
    for (const [choiceId, list] of Object.entries(session.bets)) {
        if (list.length > 0) {
            hasBets = true;
            const totalAmount = list.reduce((sum, b) => sum + b.amount, 0);
            desc += \`\${BAUCUA_EMOJIS[choiceId]} **\${BAUCUA_NAMES[choiceId]}**: \${totalAmount.toLocaleString('en-US')} MLZ (\${list.length} người)\\n\`;
        }
    }
    if (!hasBets) desc += "Chưa có ai đặt cược.";
    const embed = new EmbedBuilder().setTitle('🎲 BÀN BẦU CUA TÔM CÁ').setDescription(desc).setColor('#FFA500');
    try { await session.msg.edit({ embeds: [embed] }); } catch(e) {}
}

async function endBauCuaSession(channelId) {
    const session = activeBauCuaSessions.get(channelId);
    if (!session) return;
    activeBauCuaSessions.delete(channelId); 
    
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('baucua_btn_bau').setEmoji(BAUCUA_EMOJIS.bau).setLabel('Bầu').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('baucua_btn_cua').setEmoji(BAUCUA_EMOJIS.cua).setLabel('Cua').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('baucua_btn_tom').setEmoji(BAUCUA_EMOJIS.tom).setLabel('Tôm').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('baucua_btn_ca').setEmoji(BAUCUA_EMOJIS.ca).setLabel('Cá').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('baucua_btn_ga').setEmoji(BAUCUA_EMOJIS.ga).setLabel('Gà').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('baucua_btn_nai').setEmoji(BAUCUA_EMOJIS.nai).setLabel('Nai').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    try { await session.msg.edit({ content: '🎲 **ĐÃ CHỐT ĐƠN! Bắt đầu xóc...**', components: [row1, row2] }); } catch(e){}
    await wait(2000);
    const allIds = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'];
    let resultIds = [ allIds[Math.floor(Math.random() * allIds.length)], allIds[Math.floor(Math.random() * allIds.length)], allIds[Math.floor(Math.random() * allIds.length)] ];
    try { await session.msg.edit({ content: \`🎲 Mở nắp cái đầu tiên: **\${BAUCUA_EMOJIS[resultIds[0]]}**\` }); } catch(e){}
    await wait(2000);
    try { await session.msg.edit({ content: \`🎲 Cái thứ hai là: **\${BAUCUA_EMOJIS[resultIds[1]]}**\` }); } catch(e){}
    await wait(2000);
    const hitCounts = { bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 };
    resultIds.forEach(id => hitCounts[id]++);
    let winnersList = [];
    for (const [choiceId, list] of Object.entries(session.bets)) {
        const hits = hitCounts[choiceId];
        if (hits > 0) {
            for (const bet of list) {
                const payout = bet.amount + (bet.amount * hits);
                db.addBalance(bet.userId, payout);
                winnersList.push(\`- <@\${bet.userId}>: **+\${(bet.amount * hits).toLocaleString('en-US')} MLZ** (Cược \${BAUCUA_NAMES[choiceId]} x\${hits})\`);
            }
        }
    }
    let finalDesc = \`Mở bát: **\${BAUCUA_EMOJIS[resultIds[0]]} \${BAUCUA_EMOJIS[resultIds[1]]} \${BAUCUA_EMOJIS[resultIds[2]]}**\\n\\n\`;
    if (winnersList.length > 0) {
        finalDesc += \`🎉 **DANH SÁCH TRÚNG THƯỞNG:**\\n\` + winnersList.join('\\n');
    } else {
        if (session.totalBet > 0) { finalDesc += \`💀 **KHÔNG AI TRÚNG THƯỞNG!** Nhà cái ăn trọn **\${session.totalBet.toLocaleString('en-US')} MLZ**!\`; } else { finalDesc += \`Nhạt nhẽo quá, không có ai đặt cược cả!\`; }
    }
    const embed = new EmbedBuilder().setTitle('🎲 KẾT QUẢ BẦU CUA 🎲').setDescription(finalDesc).setColor(winnersList.length > 0 ? '#00FF00' : '#FF0000').setTimestamp();
    try { await session.msg.edit({ content: '', embeds: [embed] }); } catch(e) {}
}

async function handleBauCuaUI(ctx, isSlash) {
    const channelId = ctx.channelId;
    
    if (activeBauCuaSessions.has(channelId)) {
        const msg = isSlash ? { content: 'Đang có một bàn Bầu Cua mở trong kênh này rồi!', ephemeral: true } : 'Đang có một bàn Bầu Cua mở trong kênh này rồi!';
        return await ctx.reply(msg);
    }
    
    const endTime = Date.now() + 30000;
    const embed = new EmbedBuilder()
        .setTitle('🎲 BÀN BẦU CUA TÔM CÁ')
        .setDescription(\`Bàn đã mở! Vui lòng chọn 1 linh vật bên dưới để đặt cược!\\n\\n*(Sẽ chốt đơn sau **<t:\${Math.floor(endTime / 1000)}:R>**)*\\n\\n**Danh sách cược:**\\nChưa có ai đặt cược.\`)
        .setColor('#FFA500');

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('baucua_btn_bau').setEmoji(BAUCUA_EMOJIS.bau).setLabel('Bầu').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('baucua_btn_cua').setEmoji(BAUCUA_EMOJIS.cua).setLabel('Cua').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('baucua_btn_tom').setEmoji(BAUCUA_EMOJIS.tom).setLabel('Tôm').setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('baucua_btn_ca').setEmoji(BAUCUA_EMOJIS.ca).setLabel('Cá').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('baucua_btn_ga').setEmoji(BAUCUA_EMOJIS.ga).setLabel('Gà').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('baucua_btn_nai').setEmoji(BAUCUA_EMOJIS.nai).setLabel('Nai').setStyle(ButtonStyle.Secondary)
    );

    let msg;
    if (isSlash) {
        await ctx.reply({ embeds: [embed], components: [row1, row2] });
        msg = await ctx.fetchReply();
    } else {
        msg = await ctx.reply({ embeds: [embed], components: [row1, row2] });
    }

    const session = { channelId, hostId: ctx.user ? ctx.user.id : ctx.author.id, endTime, bets: { bau: [], cua: [], tom: [], ca: [], ga: [], nai: [] }, msg, totalBet: 0 };
    activeBauCuaSessions.set(channelId, session);

    setTimeout(async () => { await endBauCuaSession(channelId); }, 30000);
}
`;

if (!code.includes('async function handleBauCuaUI')) {
    code = code.replace("const activeBauCuaSessions = new Map();", "const activeBauCuaSessions = new Map();\n" + newFunctions);
}

// 2. Insert into messageCreate
if (!code.includes("if (cmd === 'baucua' || cmd === '1baucua')")) {
    const p = code.indexOf("if (cmd === 'shop')");
    if (p !== -1) {
        code = code.substring(0, p) + "if (cmd === 'baucua' || cmd === '1baucua') return handleBauCuaUI(message, false);\n    " + code.substring(p);
    }
}

// 3. Insert into interactionCreate
if (!code.includes("if (cmd === 'baucua') return handleBauCuaUI(interaction, true);")) {
    const p2 = code.indexOf("if (cmd === 'help') return handleHelp();");
    if (p2 !== -1) {
        code = code.substring(0, p2) + "if (cmd === 'baucua') return handleBauCuaUI(interaction, true);\n    " + code.substring(p2);
    }
}

fs.writeFileSync('index.js', code);
console.log('Restored BauCua successfully');