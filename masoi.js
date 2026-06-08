const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const games = new Map();

function assignRoles(players) {
    const count = players.length;
    let numWolves = 1;
    let numSeer = 1;
    let numBodyguard = 1;
    let numWitch = 0;
    let numHunter = 0;
    let numCupid = 0;

    if (count >= 5) numWitch = 1;
    if (count >= 6) { numWolves = 2; numHunter = 1; }
    if (count >= 7) numCupid = 1;
    if (count >= 9) numWolves = 3;
    if (count >= 12) numWolves = 4;
    
    if (count <= 4) { numBodyguard = 0; numSeer = 1; }

    let roles = [];
    for (let i = 0; i < numWolves; i++) roles.push('werewolf');
    for (let i = 0; i < numSeer; i++) roles.push('seer');
    for (let i = 0; i < numBodyguard; i++) roles.push('bodyguard');
    for (let i = 0; i < numWitch; i++) roles.push('witch');
    for (let i = 0; i < numHunter; i++) roles.push('hunter');
    for (let i = 0; i < numCupid; i++) roles.push('cupid');
    
    while (roles.length < count) roles.push('villager');

    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const assigned = new Map();
    players.forEach((p, index) => {
        assigned.set(p.id, {
            user: p,
            role: roles[index],
            alive: true
        });
    });
    return assigned;
}

const roleNames = {
    werewolf: '🐺 Ma Sói',
    seer: '👁️ Tiên Tri',
    bodyguard: '🛡️ Bảo Vệ',
    villager: '👨‍🌾 Dân Làng',
    witch: '🧙‍♀️ Phù Thủy',
    hunter: '🔫 Thợ Săn',
    cupid: '💘 Thần Tình Yêu'
};

async function checkWinCondition(game) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
    const wolves = alivePlayers.filter(p => p.role === 'werewolf').length;
    const villagers = alivePlayers.length - wolves;

    if (wolves === 0) return 'villagers';
    if (wolves >= villagers) return 'wolves';
    return null;
}

// Giết 1 người, trả về danh sách những người thực sự chết đợt này (tính cả tình yêu)
function markDead(game, playerId) {
    const p = game.players.get(playerId);
    if (!p || !p.alive) return [];
    
    p.alive = false;
    let deaths = [playerId];
    
    // Kiểm tra tình yêu
    if (game.lovers.includes(playerId)) {
        const otherId = game.lovers.find(id => id !== playerId);
        const p2 = game.players.get(otherId);
        if (p2 && p2.alive) {
            p2.alive = false;
            deaths.push(otherId);
        }
    }
    return deaths;
}

async function processDeathsAndTransition(game, channel, deaths, nextPhase) {
    // Tìm xem có Hunter nào vừa chết không
    let hunterDied = deaths.find(id => game.players.get(id).role === 'hunter');
    
    if (hunterDied) {
        game.phase = 'hunter_revenge';
        game.nextPhaseAfterHunter = nextPhase;
        
        const win = await checkWinCondition(game);
        if (win) return endGame(game, channel, win);

        let msg = `🔫 **THỢ SĂN ĐÃ CHẾT!**\n<@${hunterDied}> là Thợ Săn, bạn có quyền mang theo một người chết cùng. Hãy nhấp vào Menu bên dưới để chọn mục tiêu của bạn! (Nếu không chọn ai, hãy bỏ qua hoặc báo skip)`;
        const aliveOthers = Array.from(game.players.values()).filter(p => p.alive);
        if (aliveOthers.length === 0) {
            return await proceedToPhase(game, channel, nextPhase);
        }

        const options = aliveOthers.map(p => ({
            label: p.user.username,
            value: p.user.id,
            description: 'Bắn người này'
        }));
        options.push({ label: 'Không bắn ai', value: 'skip' });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`masoi_hunter_shoot_${hunterDied}`)
                .setPlaceholder('Chọn mục tiêu để bắn...')
                .addOptions(options)
        );

        await channel.send({ content: msg, components: [row] });
    } else {
        await proceedToPhase(game, channel, nextPhase);
    }
}

async function proceedToPhase(game, channel, phase) {
    const win = await checkWinCondition(game);
    if (win) return endGame(game, channel, win);

    if (phase === 'day') {
        game.phase = 'day';
        game.dayCount++;
        let msg = `☀️ **TRỜI ĐÃ SÁNG (Ngày ${game.dayCount})**\n\n`;
        
        if (game.diedTonight.length > 0) {
            msg += `💀 Đêm qua, những người sau đã chết: ${game.diedTonight.map(id => `<@${id}>`).join(', ')}\n`;
        } else {
            msg += `🕊️ Đêm qua là một đêm bình yên, không ai bị chết!\n`;
        }
        
        msg += `Mọi người hãy thảo luận và bỏ phiếu treo cổ.`;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('masoi_vote_lynch').setLabel('Bỏ Phiếu Treo Cổ').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('masoi_view_role').setLabel('Xem Vai Trò').setStyle(ButtonStyle.Secondary)
        );
        await channel.send({ content: msg, components: [row] });
        game.dayVotes = new Map();
        game.diedTonight = []; // reset cho đêm sau

    } else if (phase === 'night') {
        game.phase = 'night';
        game.nightActions = { wolfVotes: [], protected: null, seerChecked: null };
        game.witchKillTarget = null;
        game.witchSaveTarget = false;
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('masoi_wakeup').setLabel('Mở Mắt (Hành động đêm)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('masoi_view_role').setLabel('Xem Vai Trò').setStyle(ButtonStyle.Secondary)
        );
        await channel.send({ content: `🌙 **TRỜI ĐÃ TỐI**\nMọi người đi ngủ. Các vai trò đặc biệt thức dậy.`, components: [row] });
    }
}

async function startWitchPhase(game, channel) {
    game.phase = 'night_witch';
    
    // Tính toán mục tiêu của sói
    let wolfTarget = null;
    if (game.nightActions.wolfVotes.length > 0) {
        const counts = {};
        game.nightActions.wolfVotes.forEach(v => counts[v] = (counts[v] || 0) + 1);
        let max = 0; let targets = [];
        for (const [id, c] of Object.entries(counts)) {
            if (c > max) { max = c; targets = [id]; }
            else if (c === max) { targets.push(id); }
        }
        wolfTarget = targets[Math.floor(Math.random() * targets.length)];
    }
    game.wolfTargetThisNight = wolfTarget;

    const witch = Array.from(game.players.values()).find(p => p.role === 'witch');
    if (!witch || !witch.alive) {
        // Phù thủy chết -> Qua đêm luôn
        await endNight(game, channel);
        return;
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('masoi_witch_wake').setLabel('🧙‍♀️ Lượt Phù Thủy').setStyle(ButtonStyle.Primary)
    );
    await channel.send({ content: `Đến lượt Phù Thủy hành động...`, components: [row] });
}

async function endNight(game, channel) {
    let deaths = [];
    const wolfTarget = game.wolfTargetThisNight;

    // Xét bị cắn
    if (wolfTarget && wolfTarget !== game.nightActions.protected && !game.witchSaveTarget) {
        const d = markDead(game, wolfTarget);
        deaths = deaths.concat(d);
    }
    
    // Xét bị ném bình độc
    if (game.witchKillTarget) {
        const d = markDead(game, game.witchKillTarget);
        deaths = deaths.concat(d);
    }

    game.diedTonight = Array.from(new Set(deaths)); // Xóa trùng
    await processDeathsAndTransition(game, channel, game.diedTonight, 'day');
}

async function endGame(game, channel, winner) {
    games.delete(game.channelId);
    let msg = winner === 'wolves' ? '🐺 **MA SÓI ĐÃ CHIẾN THẮNG!**' : '👨‍🌾 **DÂN LÀNG ĐÃ CHIẾN THẮNG!**';
    let rolesList = '\n\n**Vai trò của mọi người:**\n';
    game.players.forEach(p => {
        rolesList += `- <@${p.user.id}>: ${roleNames[p.role]} ${p.alive ? '' : '💀'}\n`;
    });
    
    if (game.lovers.length === 2) {
        rolesList += `\n💘 Cặp đôi: <@${game.lovers[0]}> & <@${game.lovers[1]}>`;
    }

    const embed = new EmbedBuilder()
        .setTitle('CÂU CHUYỆN KẾT THÚC')
        .setDescription(msg + rolesList)
        .setColor(winner === 'wolves' ? '#FF0000' : '#00FF00');
    await channel.send({ embeds: [embed] });
}

async function handleCommand(interaction) {
    const sub = interaction.options.getSubcommand();
    const channelId = interaction.channelId;

    if (sub === 'create') {
        if (games.has(channelId)) return interaction.reply({ content: '❌ Kênh này đang có một ván Ma Sói diễn ra rồi!', ephemeral: true });

        const game = {
            channelId,
            hostId: interaction.user.id,
            phase: 'lobby',
            players: new Map(),
            lobbyPlayers: [interaction.user],
            dayCount: 0,
            lovers: [],
            witchPotions: { save: true, kill: true }
        };
        games.set(channelId, game);

        const embed = new EmbedBuilder()
            .setTitle('🐺 LOBBY MA SÓI')
            .setDescription(`Chủ phòng: <@${interaction.user.id}>\nSố người hiện tại: 1\n\nNhấn nút **Tham Gia** để vào chơi! (Cần ít nhất 4 người)`)
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('masoi_join').setLabel('Tham Gia').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('masoi_leave').setLabel('Rời Khỏi').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    } else if (sub === 'start') {
        const game = games.get(channelId);
        if (!game || game.phase !== 'lobby') return interaction.reply({ content: '❌ Không có phòng chờ nào!', ephemeral: true });
        if (game.hostId !== interaction.user.id) return interaction.reply({ content: '❌ Chỉ chủ phòng mới có thể bắt đầu!', ephemeral: true });
        if (game.lobbyPlayers.length < 4) return interaction.reply({ content: '❌ Cần ít nhất 4 người chơi để bắt đầu!', ephemeral: true });

        game.players = assignRoles(game.lobbyPlayers);
        game.dayCount = 0;
        await proceedToPhase(game, interaction.channel, 'night');
        await interaction.reply({ content: 'Game đã bắt đầu!', ephemeral: true });
    }
}

async function handleButton(interaction) {
    const id = interaction.customId;
    const channelId = interaction.channelId;
    const game = games.get(channelId);

    if (!game) return interaction.reply({ content: 'Ván game không tồn tại hoặc đã kết thúc.', ephemeral: true });

    if (id === 'masoi_join' || id === 'masoi_leave') {
        if (game.phase !== 'lobby') return interaction.reply({ content: 'Ván game đã bắt đầu!', ephemeral: true });
        
        const isJoined = game.lobbyPlayers.find(p => p.id === interaction.user.id);
        if (id === 'masoi_join') {
            if (isJoined) return interaction.reply({ content: 'Bạn đã ở trong phòng rồi!', ephemeral: true });
            game.lobbyPlayers.push(interaction.user);
        } else {
            if (!isJoined) return interaction.reply({ content: 'Bạn chưa vào phòng!', ephemeral: true });
            if (interaction.user.id === game.hostId) return interaction.reply({ content: 'Chủ phòng không thể rời!', ephemeral: true });
            game.lobbyPlayers = game.lobbyPlayers.filter(p => p.id !== interaction.user.id);
        }

        const embed = new EmbedBuilder()
            .setTitle('🐺 LOBBY MA SÓI')
            .setDescription(`Chủ phòng: <@${game.hostId}>\nSố người hiện tại: ${game.lobbyPlayers.length}\nDanh sách:\n${game.lobbyPlayers.map(p => `- <@${p.id}>`).join('\n')}`)
            .setColor('#2b2d31');

        await interaction.update({ embeds: [embed] });
        
    } else if (id === 'masoi_view_role') {
        const player = game.players.get(interaction.user.id);
        if (!player) return interaction.reply({ content: 'Bạn không ở trong ván này.', ephemeral: true });
        let msg = `Vai trò của bạn: **${roleNames[player.role]}**\nTình trạng: ${player.alive ? '❤️ Sống' : '💀 Chết'}`;
        if (game.lovers.includes(interaction.user.id)) {
            const loverId = game.lovers.find(uid => uid !== interaction.user.id);
            msg += `\n💘 Tình yêu của bạn là: <@${loverId}>`;
        }
        return interaction.reply({ content: msg, ephemeral: true });

    } else if (id === 'masoi_wakeup') {
        if (game.phase !== 'night') return interaction.reply({ content: 'Chưa đến lúc mở mắt!', ephemeral: true });
        
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) return interaction.reply({ content: 'Người chết không được thao tác.', ephemeral: true });

        if (player.role === 'villager' || player.role === 'hunter' || player.role === 'witch') {
            return interaction.reply({ content: `Bạn là **${roleNames[player.role]}**. Bạn không cần thao tác ở giai đoạn này.`, ephemeral: true });
        }

        if (player.role === 'cupid' && game.dayCount > 0) {
            return interaction.reply({ content: `Cupid chỉ ghép đôi đêm đầu tiên thôi!`, ephemeral: true });
        }

        let targetPlayers = Array.from(game.players.values()).filter(p => p.alive);
        
        if (player.role !== 'bodyguard') {
            targetPlayers = targetPlayers.filter(p => p.user.id !== interaction.user.id);
        }
        if (targetPlayers.length === 0) return interaction.reply({ content: 'Không có mục tiêu.', ephemeral: true });

        const options = targetPlayers.map(p => ({
            label: p.user.username,
            value: p.user.id,
            description: p.user.id === interaction.user.id ? 'Bảo vệ chính mình' : 'Chọn người này'
        }));

        let placeholder = '';
        let maxValues = 1;
        if (player.role === 'werewolf') placeholder = 'Chọn con mồi để giết...';
        else if (player.role === 'seer') placeholder = 'Chọn người để soi...';
        else if (player.role === 'bodyguard') placeholder = 'Chọn người để bảo vệ...';
        else if (player.role === 'cupid') {
            placeholder = 'Chọn 2 người để ghép đôi...';
            maxValues = 2;
        }

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`masoi_night_${player.role}`)
                .setPlaceholder(placeholder)
                .setMinValues(maxValues)
                .setMaxValues(maxValues)
                .addOptions(options)
        );

        await interaction.reply({ content: `Bạn là **${roleNames[player.role]}**. Hãy chọn:`, components: [row], ephemeral: true });

    } else if (id === 'masoi_witch_wake') {
        if (game.phase !== 'night_witch') return interaction.reply({ content: 'Chưa đến lượt của bạn!', ephemeral: true });
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive || player.role !== 'witch') return interaction.reply({ content: 'Chỉ Phù Thủy sống mới xem được.', ephemeral: true });

        let msg = '';
        const target = game.wolfTargetThisNight;
        if (target) {
            msg += `Sói đã cắn <@${target}> đêm nay. `;
            if (game.witchPotions.save) {
                msg += `Bạn có Bình Cứu (1 lần). Bạn có muốn cứu không?`;
            } else {
                msg += `Bạn đã hết Bình Cứu.`;
            }
        } else {
            msg += `Sói không cắn ai đêm nay. `;
        }
        
        msg += `\nNếu muốn dùng Bình Độc (còn ${game.witchPotions.kill ? 1 : 0} bình), hãy chọn một mục tiêu bên dưới.`;

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('masoi_witch_save').setLabel('Cứu người bị cắn').setStyle(ButtonStyle.Success).setDisabled(!game.witchPotions.save || !target),
            new ButtonBuilder().setCustomId('masoi_witch_skip').setLabel('Không làm gì (Kết thúc đêm)').setStyle(ButtonStyle.Secondary)
        );

        const aliveOthers = Array.from(game.players.values()).filter(p => p.alive && p.user.id !== interaction.user.id);
        const options = aliveOthers.map(p => ({ label: p.user.username, value: p.user.id }));
        
        // Nếu còn bình độc mới cho chọn
        if (game.witchPotions.kill && aliveOthers.length > 0) {
            const row2 = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('masoi_witch_kill')
                    .setPlaceholder('Chọn người để ném bình độc...')
                    .addOptions(options)
            );
            await interaction.reply({ content: msg, components: [row1, row2], ephemeral: true });
        } else {
            await interaction.reply({ content: msg, components: [row1], ephemeral: true });
        }

    } else if (id === 'masoi_witch_save') {
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive || player.role !== 'witch') return;
        game.witchPotions.save = false;
        game.witchSaveTarget = true;
        await interaction.update({ content: '✅ Bạn đã dùng Bình Cứu.', components: [] });
        setTimeout(() => endNight(game, interaction.channel), 2000);

    } else if (id === 'masoi_witch_skip') {
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive || player.role !== 'witch') return;
        await interaction.update({ content: 'Bạn chọn không làm gì.', components: [] });
        setTimeout(() => endNight(game, interaction.channel), 2000);

    } else if (id === 'masoi_vote_lynch') {
        if (game.phase !== 'day') return interaction.reply({ content: 'Bây giờ không phải lúc bỏ phiếu!', ephemeral: true });
        
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive) return interaction.reply({ content: 'Người chết không được bỏ phiếu!', ephemeral: true });

        const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);
        const options = alivePlayers.map(p => ({
            label: p.user.username,
            value: p.user.id,
            description: p.user.id === interaction.user.id ? 'Tự Vote' : 'Treo cổ người này'
        }));
        options.push({ label: 'Skip', value: 'skip', description: 'Không treo cổ ai' });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('masoi_day_vote')
                .setPlaceholder('Chọn người bị treo cổ...')
                .addOptions(options)
        );
        await interaction.reply({ content: 'Hãy đưa ra quyết định:', components: [row], ephemeral: true });
    }
}

async function handleSelectMenu(interaction) {
    const id = interaction.customId;
    const channelId = interaction.channelId;
    const game = games.get(channelId);

    if (!game) return interaction.reply({ content: 'Ván game đã kết thúc.', ephemeral: true });

    const targetId = interaction.values[0];
    const player = game.players.get(interaction.user.id);

    if (id.startsWith('masoi_night_')) {
        if (game.phase !== 'night') return interaction.reply({ content: 'Không hợp lệ!', ephemeral: true });
        if (!player || !player.alive) return interaction.reply({ content: 'Lỗi', ephemeral: true });

        if (id === 'masoi_night_werewolf') {
            game.nightActions.wolfVotes.push(targetId);
            await interaction.update({ content: `🐺 Bạn đã vote cắn <@${targetId}>!`, components: [] });
        } else if (id === 'masoi_night_seer') {
            if (game.nightActions.seerChecked) return interaction.update({ content: `Bạn đã soi một người đêm nay rồi!`, components: [] });
            game.nightActions.seerChecked = true;
            const targetPlayer = game.players.get(targetId);
            const isWolf = targetPlayer.role === 'werewolf';
            await interaction.update({ content: `👁️ Tiên tri: <@${targetId}> **${isWolf ? 'LÀ' : 'KHÔNG PHẢI LÀ'}** Ma Sói!`, components: [] });
        } else if (id === 'masoi_night_bodyguard') {
            game.nightActions.protected = targetId;
            await interaction.update({ content: `🛡️ Bạn bảo vệ <@${targetId}> đêm nay!`, components: [] });
        } else if (id === 'masoi_night_cupid') {
            if (game.lovers.length > 0) return interaction.update({ content: `Đã chọn rồi!`, components: [] });
            game.lovers = [interaction.values[0], interaction.values[1]];
            await interaction.update({ content: `💘 Bạn đã ghép đôi <@${interaction.values[0]}> và <@${interaction.values[1]}>!`, components: [] });
        }

        const aliveWolves = Array.from(game.players.values()).filter(p => p.role === 'werewolf' && p.alive).length;
        if (id === 'masoi_night_werewolf' && game.nightActions.wolfVotes.length >= aliveWolves) {
            interaction.channel.send("Sói đã hành động xong. Đang chờ 5 giây...").catch(()=>{});
            
            setTimeout(() => {
                const aliveWitch = Array.from(game.players.values()).find(p => p.role === 'witch' && p.alive);
                if (aliveWitch) {
                    startWitchPhase(game, interaction.channel);
                } else {
                    endNight(game, interaction.channel);
                }
            }, 5000);
        }

    } else if (id === 'masoi_witch_kill') {
        const player = game.players.get(interaction.user.id);
        if (!player || !player.alive || player.role !== 'witch') return;
        game.witchPotions.kill = false;
        game.witchKillTarget = targetId;
        await interaction.update({ content: `💀 Bạn đã ném bình độc vào <@${targetId}>!`, components: [] });
        setTimeout(() => endNight(game, interaction.channel), 2000);

    } else if (id.startsWith('masoi_hunter_shoot_')) {
        if (game.phase !== 'hunter_revenge') return interaction.reply({ content: 'Đã hết lượt Thợ Săn!', ephemeral: true });
        const hunterId = id.replace('masoi_hunter_shoot_', '');
        if (interaction.user.id !== hunterId) return interaction.reply({ content: 'Chỉ Thợ Săn mới được bắn!', ephemeral: true });

        await interaction.update({ content: 'Bạn đã nổ súng!', components: [] });

        let msg = '';
        if (targetId === 'skip') {
            msg = `🔫 Thợ Săn <@${hunterId}> đã nhắm mắt mà không nổ súng vào ai.`;
            await interaction.channel.send(msg);
            await proceedToPhase(game, interaction.channel, game.nextPhaseAfterHunter);
        } else {
            msg = `🔫 **ĐÙNG!** Thợ Săn <@${hunterId}> đã nổ súng bắn chết <@${targetId}> trước khi nhắm mắt!`;
            await interaction.channel.send(msg);
            
            const d = markDead(game, targetId);
            await processDeathsAndTransition(game, interaction.channel, d, game.nextPhaseAfterHunter);
        }

    } else if (id === 'masoi_day_vote') {
        if (game.phase !== 'day') return interaction.reply({ content: 'Không phải lúc vote!', ephemeral: true });
        
        game.dayVotes.set(interaction.user.id, targetId);
        await interaction.update({ content: `Bạn đã vote ${targetId === 'skip' ? 'Skip' : `<@${targetId}>`}.`, components: [] });

        const aliveCount = Array.from(game.players.values()).filter(p => p.alive).length;
        if (game.dayVotes.size >= aliveCount) {
            const counts = {};
            let voteDetails = '🗳️ **CHI TIẾT LƯỢT BỎ PHIẾU:**\n';

            game.dayVotes.forEach((tId, voterId) => {
                counts[tId] = (counts[tId] || 0) + 1;
                voteDetails += `- <@${voterId}> đã bỏ phiếu cho ${tId === 'skip' ? 'Skip' : `<@${tId}>`}\n`;
            });

            let max = 0; let lynched = null;
            for (const [v, c] of Object.entries(counts)) {
                if (c > max) { max = c; lynched = v; }
                else if (c === max) { lynched = null; }
            }

            voteDetails += '\n';

            if (lynched && lynched !== 'skip') {
                voteDetails += `⚖️ **KẾT QUẢ:** <@${lynched}> bị treo cổ!\nVai trò của họ: **${roleNames[game.players.get(lynched).role]}**.`;
            } else {
                voteDetails += `⚖️ **KẾT QUẢ:** Hòa hoặc Skip, không ai bị treo cổ.`;
            }
            await interaction.channel.send(voteDetails);

            if (lynched && lynched !== 'skip') {
                const d = markDead(game, lynched);
                await processDeathsAndTransition(game, interaction.channel, d, 'night');
            } else {
                await processDeathsAndTransition(game, interaction.channel, [], 'night');
            }
        }
    }
}

module.exports = {
    handleCommand,
    handleButton,
    handleSelectMenu
};
