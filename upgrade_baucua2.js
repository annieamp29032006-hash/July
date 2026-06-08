const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

if (!code.includes('const activeBauCuaSessions = new Map();')) {
    code = code.replace(/const BAUCUA_NAMES = \{[\s\S]*?\};/, function(match) { return match + "\nconst activeBauCuaSessions = new Map();" });
}

const p1 = code.indexOf('async function handleBauCuaUI');
const p2 = code.indexOf('async function processLevelUp');
if (p1 !== -1 && p2 !== -1) {
    const oldCode = code.substring(p1, p2);
    const newCode = sync function updateBauCuaUI(session) {
    let desc = \Bàn đã mở! Vui lòng chọn 1 linh vật bên dưới để đặt cược!\\n\\n*(Sẽ chốt đơn sau **<t:\:R>**)*\\n\\n**Danh sách cược:**\\n\;
    let hasBets = false;
    for (const [choiceId, list] of Object.entries(session.bets)) {
        if (list.length > 0) {
            hasBets = true;
            const totalAmount = list.reduce((sum, b) => sum + b.amount, 0);
            desc += \\ **\**: \ MLZ (\ người)\\n\;
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
    try { await session.msg.edit({ content: \🎲 Mở nắp cái đầu tiên: **\**\ }); } catch(e){}
    await wait(2000);
    try { await session.msg.edit({ content: \🎲 Cái thứ hai là: **\**\ }); } catch(e){}
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
                winnersList.push(\- <@\>: **+\ MLZ** (Cược \ x\)\);
            }
        }
    }
    let finalDesc = \Mở bát: **\ \ \**\\n\\n\;
    if (winnersList.length > 0) {
        finalDesc += \🎉 **DANH SÁCH TRÚNG THƯỞNG:**\\n\ + winnersList.join('\\n');
    } else {
        if (session.totalBet > 0) { finalDesc += \💀 **KHÔNG AI TRÚNG THƯỞNG!** Nhà cái ăn trọn **\ MLZ**!\; } else { finalDesc += \Nhạt nhẽo quá, không có ai đặt cược cả!\; }
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
        .setDescription(\Bàn đã mở! Vui lòng chọn 1 linh vật bên dưới để đặt cược!\\n\\n*(Sẽ chốt đơn sau **<t:\:R>**)*\\n\\n**Danh sách cược:**\\nChưa có ai đặt cược.\)
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

;
    code = code.replace(oldCode, newCode);
}

const btnBlock = code.match(/  if \(interaction\.isButton\(\) && interaction\.customId\.startsWith\('baucua_btn_'\)\) \{[\s\S]*?  \}/);
if (btnBlock) {
    const newBtnBlock =   if (interaction.isButton() && interaction.customId.startsWith('baucua_btn_')) {
      const channelId = interaction.channelId;
      if (!activeBauCuaSessions.has(channelId)) {
          return interaction.reply({ content: 'Bàn Bầu Cua này đã đóng hoặc không tồn tại!', ephemeral: true });
      }
      const choiceId = interaction.customId.replace('baucua_btn_', '');
      const choiceName = BAUCUA_NAMES[choiceId];
      const modal = new ModalBuilder().setCustomId('baucua_modal_' + choiceId).setTitle(\Đặt cược: \\);
      const betInput = new TextInputBuilder().setCustomId('baucua_bet_amount').setLabel('Nhập số tiền cược (hoặc gõ "all"):').setStyle(TextInputStyle.Short).setPlaceholder('VD: 10000, 50k, all').setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(betInput));
      await interaction.showModal(modal);
      return;
  };
    code = code.replace(btnBlock[0], newBtnBlock);
}

const modalBlock = code.match(/  if \(interaction\.isModalSubmit\(\) && interaction\.customId\.startsWith\('baucua_modal_'\)\) \{[\s\S]*?  \}/);
if (modalBlock) {
    const newModalBlock =   if (interaction.isModalSubmit() && interaction.customId.startsWith('baucua_modal_')) {
      const channelId = interaction.channelId;
      if (!activeBauCuaSessions.has(channelId)) {
          return interaction.reply({ content: 'Bàn Bầu Cua đã đóng! Tiền cược của bạn không bị trừ.', ephemeral: true });
      }
      const choiceId = interaction.customId.replace('baucua_modal_', '');
      const amountStr = interaction.fields.getTextInputValue('baucua_bet_amount');
      const user = interaction.user;
      const bet = parseBetAmount(user, amountStr, 250000);
      if (bet.error) return interaction.reply({ content: bet.error, ephemeral: true });
      const session = activeBauCuaSessions.get(channelId);
      db.addBalance(user.id, -bet.amount);
      session.bets[choiceId].push({ userId: user.id, username: user.username, amount: bet.amount });
      session.totalBet += bet.amount;
      await updateBauCuaUI(session);
      return interaction.reply({ content: \✅ Bạn đã cược thành công **\ MLZ Coin** vào **\**!\, ephemeral: true });
  };
    code = code.replace(modalBlock[0], newModalBlock);
}

fs.writeFileSync('index.js', code);
console.log('Done');