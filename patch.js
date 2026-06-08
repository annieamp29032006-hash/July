const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

// 1. Require chatbot
if (!content.includes("const chatbot = require('./chatbot');")) {
    content = content.replace("const masoi = require('./masoi');", "const masoi = require('./masoi');\nconst chatbot = require('./chatbot');");
}

// 2. Add Giveaway functions at the bottom
const giveawayCode = `
// ==================== GIVEAWAY & CHATBOT SYSTEM ====================
const GIVEAWAY_FILE = require('path').join(__dirname, 'giveaways.json');
let activeGiveaways = {};
const giveawayTimers = new Map();

function loadGiveaways() {
    try { activeGiveaways = JSON.parse(fs.readFileSync(GIVEAWAY_FILE, 'utf8')); } catch (e) { activeGiveaways = {}; }
}
function saveGiveaways() {
    fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(activeGiveaways, null, 2));
}
loadGiveaways();

function buildGiveawayEmbed(gw) {
    const endTs = Math.floor(gw.endTime / 1000);
    const embed = new EmbedBuilder().setColor(gw.color || '#FF6B6B').setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(\`⭐ **\${gw.prize}**\\n\\n> Nhấn nút **🎉 Tham Gia** bên dưới để vào!\\n\\n⏰ **Kết thúc:** <t:\${endTs}:R>\\n🏆 **Số người thắng:** \${gw.winnerCount}\\n👥 **Tham gia:** \${gw.participants.length}\`)
        .setFooter({ text: \`Tổ chức bởi \${gw.hostedBy} • ID: \${gw.messageId}\` }).setTimestamp(gw.endTime);
    if (gw.banner) { try { embed.setImage(gw.banner); } catch {} }
    return embed;
}

function pickWinners(participants, count) {
    if (participants.length === 0) return [];
    return [...participants].sort(() => Math.random() - 0.5).slice(0, Math.min(count, participants.length));
}

async function endGiveaway(messageId) {
    const gw = activeGiveaways[messageId];
    if (!gw || gw.ended) return;
    if (giveawayTimers.has(messageId)) { clearTimeout(giveawayTimers.get(messageId)); giveawayTimers.delete(messageId); }
    gw.ended = true;
    gw.winners = pickWinners(gw.participants, gw.winnerCount);
    saveGiveaways();
    try {
        const guild = client.guilds.cache.get(gw.guildId);
        if (!guild) return;
        const channel = guild.channels.cache.get(gw.channelId);
        if (!channel) return;
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg) {
            const endedEmbed = new EmbedBuilder().setColor(gw.winners.length > 0 ? '#2ECC71' : '#95A5A6').setTitle('🎊 GIVEAWAY KẾT THÚC 🎊')
                .setDescription(\`**\${gw.prize}**\\n\\n🏆 **Người thắng:** \${gw.winners.length > 0 ? gw.winners.map(id => '<@' + id + '>').join(', ') : '❌ Không có ai!'}\\n👥 **Tổng tham gia:** \${gw.participants.length}\`).setTimestamp();
            await msg.edit({ embeds: [endedEmbed], components: [] });
        }
        if (gw.winners.length > 0) {
            await channel.send({ content: \`🎊 Chúc mừng \${gw.winners.map(id => '<@' + id + '>').join(', ')} đã thắng giveaway **\${gw.prize}**!\`, allowedMentions: { users: gw.winners } });
        } else {
            await channel.send(\`😢 Giveaway **\${gw.prize}** kết thúc không có người tham gia!\`);
        }
    } catch (e) { console.error(e); }
}

client.once('ready', () => {
    const now = Date.now();
    for (const [msgId, gw] of Object.entries(activeGiveaways)) {
        if (gw.ended) continue;
        const remaining = gw.endTime - now;
        if (remaining <= 0) setTimeout(() => endGiveaway(msgId), 2000);
        else giveawayTimers.set(msgId, setTimeout(() => endGiveaway(msgId), remaining));
    }
});

async function handleGiveawayCreate(interaction) {
    const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);
    if (!checkAdmin(interaction.user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới dùng được lệnh này!', ephemeral: true });

    const prize = interaction.options.getString('phanthuong');
    const winnerCount = interaction.options.getInteger('soguinang') || 1;
    const thoigianStr = interaction.options.getString('thoigian');
    let durationMs = 0;
    const match = thoigianStr.match(/^(\d+)([smhd])$/);
    if (match) {
        const val = parseInt(match[1]);
        const unit = match[2];
        if (unit === 's') durationMs = val * 1000;
        if (unit === 'm') durationMs = val * 60000;
        if (unit === 'h') durationMs = val * 3600000;
        if (unit === 'd') durationMs = val * 86400000;
    }
    if (durationMs <= 0) return interaction.reply({ content: '❌ Thời gian không hợp lệ (VD: 10m, 1h)', ephemeral: true });

    const gw = {
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        prize, winnerCount, hostedBy: interaction.user.username,
        endTime: Date.now() + durationMs, participants: [], ended: false, messageId: null, winners: [],
        color: interaction.options.getString('mau') || '#FF6B6B',
        banner: interaction.options.getString('banner') || null
    };

    const embed = buildGiveawayEmbed(gw);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('gw_join').setLabel('🎉 Tham Gia').setStyle(ButtonStyle.Primary));

    await interaction.reply({ content: 'Đang tạo Giveaway...', ephemeral: true });
    const sentMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
    gw.messageId = sentMsg.id;
    activeGiveaways[sentMsg.id] = gw;
    saveGiveaways();
    giveawayTimers.set(sentMsg.id, setTimeout(() => endGiveaway(sentMsg.id), durationMs));
}

function handleHelpCustom() {
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('📖 Sổ Tay Hướng Dẫn Legend Main')
        .setDescription('Chào mừng bạn đến với hệ thống bot! Hãy chọn chuyên mục từ menu bên dưới để xem chi tiết.')
        .setImage('attachment://help.png');

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
        .setCustomId('help_select')
        .setPlaceholder('👉 Chọn mục cần xem')
        .addOptions([
            { label: 'Kinh Tế & Cửa Hàng', description: 'Tiền bạc, mua bán, chuyển tiền', value: 'help_economy', emoji: '💰' },
            { label: 'Ngân Hàng & Đầu Tư', description: 'Gửi/rút, đầu tư', value: 'help_bank', emoji: '🏦' },
            { label: 'Nghề Nghiệp', description: 'Câu cá, đào mỏ', value: 'help_work', emoji: '⛏️' },
            { label: 'Giải Trí & Casino', description: 'Tài xỉu, Bầu cua, Slots', value: 'help_casino', emoji: '🎲' },
            { label: 'Thú Cưng (Pet)', description: 'Săn bắt, chiến đấu', value: 'help_pet', emoji: '🐾' },
            { label: 'Tính Năng Mới', description: 'Giveaway, Chatbot', value: 'help_new', emoji: '✨' },
            { label: 'Quản Trị Viên (Admin)', description: 'Chỉ dành cho Admin', value: 'help_admin', emoji: '🛡️' }
        ])
    );
    const attachment = new AttachmentBuilder('./images/help.png');
    return { embeds: [embed], components: [row], files: [attachment] };
}
`;

if (!content.includes("GIVEAWAY & CHATBOT SYSTEM")) {
    content += "\n" + giveawayCode;
}

// Replace old handleHelp
content = content.replace("function handleHelp() {", "function handleHelp_old() {");

// Inject chat event into messageCreate
const msgCreateInject = `
    // --- Chatbot Intercept ---
    if (!message.author.bot && !message.content.startsWith(prefix)) {
        const isBotMentioned = message.mentions.has(client.user);
        if (isBotMentioned || Math.random() < 0.1) {
            chatbot.handleMessage(message);
        }
    }
`;
if (!content.includes("chatbot.handleMessage")) {
    content = content.replace(/client\.on\('messageCreate', async message => {([\s\S]*?)const prefix/m, "client.on('messageCreate', async message => {$1" + msgCreateInject + "\n    const prefix");
}

// Inject giveaway commands to interaction handler
const gwInject = `
  if (cmd === 'gcreate') return handleGiveawayCreate(interaction);
  if (cmd === 'help') return interaction.reply(handleHelpCustom());
`;
if (!content.includes("cmd === 'gcreate'")) {
    content = content.replace(/if \(cmd === 'help'\) return interaction\.reply\(handleHelp\(\)\);/m, gwInject);
}

// Inject button handler for giveaway
const btnInject = `
  if (interaction.isButton() && interaction.customId === 'gw_join') {
      const gw = activeGiveaways[interaction.message.id];
      if (!gw || gw.ended) return interaction.reply({ content: '❌ Giveaway đã kết thúc!', ephemeral: true });
      if (!gw.participants.includes(interaction.user.id)) {
          gw.participants.push(interaction.user.id);
          saveGiveaways();
          const embed = buildGiveawayEmbed(gw);
          await interaction.message.edit({ embeds: [embed] });
          return interaction.reply({ content: '✅ Bạn đã tham gia thành công!', ephemeral: true });
      } else {
          return interaction.reply({ content: 'ℹ️ Bạn đã tham gia rồi!', ephemeral: true });
      }
  }
`;
if (!content.includes("interaction.customId === 'gw_join'")) {
    content = content.replace("if (interaction.isButton() && interaction.customId.startsWith('baucua_btn_')) {", btnInject + "\n  if (interaction.isButton() && interaction.customId.startsWith('baucua_btn_')) {");
}

// Update help select interaction
const helpAdminCase = `
            case 'help_admin':
                if (interaction.user.id !== SUPER_ADMIN_ID && !db.isAdmin(interaction.user.id)) {
                    helpEmbed.setDescription('🚫 **LỖI:** Bạn không có quyền truy cập mục này!');
                    helpEmbed.setColor('#FF0000');
                } else {
                    helpEmbed.setTitle('🛡️ Bảng Điều Khiển Admin')
                             .setDescription('**Các lệnh dành cho Admin:**\\n\\n' +
                                             '• \`/admin addmoney @user <số tiền>\`: Thêm tiền\\n' +
                                             '• \`/admin removemoney @user <số tiền>\`: Trừ tiền\\n' +
                                             '• \`/jail <@user> <lý do>\`: Bỏ tù người chơi\\n' +
                                             '• \`/gcreate\`, \`/gend\`, \`/greroll\`: Quản lý Giveaway\\n' +
                                             '• \`/chatbot\` hoặc \`/autoresponder\`: Thiết lập Chatbot');
                }
                break;
            case 'help_new':
                helpEmbed.setTitle('✨ Các Tính Năng Mới').setDescription('**Hệ thống Giveaway & Chatbot:**\\n\\n• Chat với Bot: Tag @Bot hoặc nhắn tin bình thường, bot sẽ tự động học và trả lời!\\n• Giveaway: Tham gia nhận quà hấp dẫn bằng cách ấn nút khi thấy thông báo Giveaway!');
                break;
`;
if (!content.includes("case 'help_admin':")) {
    content = content.replace(/case 'help_pet':[\s\S]*?break;/m, "$&\n" + helpAdminCase);
}

fs.writeFileSync('index.js', content, 'utf8');
console.log('Patched index.js!');
