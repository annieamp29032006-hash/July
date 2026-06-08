require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, NoSubscriberBehavior } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const { spawn } = require('child_process');
const YTDLP_PATH = youtubedl.constants.YOUTUBE_DL_PATH;
const db = require('./database');
const masoi = require('./masoi');
const chatbot = require('./chatbot');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ] 
});

// ID của CHỦ BOT (Super Admin) - Người duy nhất có quyền thêm/xóa Admin khác
const SUPER_ADMIN_ID = '1204627726254997546';
const DEALER_ROLE_ID = 'THAY_ID_ROLE_DAI_LY_VAO_DAY';
const ROLE_FOR_SALE_ID = 'THAY_ID_ROLE_MUON_BAN_VAO_DAY'; // ID của role người chơi có thể mua
const ROLE_PRICE = 10000000; // Giá tiền để mua role (VD: 10,000,000 JC)
const PREFIX = '1';
let guildId = null;

// Cấu hình Emoji (Thay bằng Emoji Động <a:ten:id> của bạn nếu có)
const EMOJIS = {
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
};

const SHOP_ITEMS = {
  // Tiệm Kim Hoàn
  'Nhẫn Bạc': { category: 'Tiệm Kim Hoàn', type: 'ring', price: 20000000, desc: 'Nhẫn đính hôn đơn giản' },
  'Nhẫn Vàng': { category: 'Tiệm Kim Hoàn', type: 'ring', price: 40000000, desc: 'Nhẫn cưới sang trọng' },
  'Nhẫn Bạch Kim': { category: 'Tiệm Kim Hoàn', type: 'ring', price: 60000000, desc: 'Biểu tượng tình yêu' },
  'Nhẫn Kim Cương': { category: 'Tiệm Kim Hoàn', type: 'ring', price: 80000000, desc: 'Đẳng cấp hoàng gia' },
  'Nhẫn Kim Cương Vĩnh Cửu': { category: 'Tiệm Kim Hoàn', type: 'ring', price: 100000000, desc: 'Kỷ vật vĩnh hằng' },
  
  // Cửa Hàng Bảo Hiểm
  'Khiên Gỗ (1 Ngày)': { category: 'Cửa Hàng Bảo Hiểm', type: 'shield', duration: 1 * 24 * 60 * 60 * 1000, price: 50000, desc: 'Bảo vệ khỏi bị trộm trong 1 ngày' },
  'Khiên Sắt (7 Ngày)': { category: 'Cửa Hàng Bảo Hiểm', type: 'shield', duration: 7 * 24 * 60 * 60 * 1000, price: 250000, desc: 'Bảo vệ khỏi bị trộm trong 7 ngày' },
  'Khiên Vàng (30 Ngày)': { category: 'Cửa Hàng Bảo Hiểm', type: 'shield', duration: 30 * 24 * 60 * 60 * 1000, price: 1000000, desc: 'Bảo vệ khỏi bị trộm trong 30 ngày' },
  
  // Tiệm Đồ Câu
  'Mồi Câu': { category: 'Tiệm Đồ Câu', type: 'bait', price: 50, desc: 'Vật phẩm tiêu hao để câu cá' },
  'Cần Câu Gỗ': { category: 'Tiệm Đồ Câu', type: 'rod', price: 50000, desc: 'Mở khóa Ao Làng' },
  'Cần Câu Sắt': { category: 'Tiệm Đồ Câu', type: 'rod', price: 250000, desc: 'Mở khóa Sông Lớn' },
  'Cần Câu Vàng': { category: 'Tiệm Đồ Câu', type: 'rod', price: 1500000, desc: 'Mở khóa Đại Dương' },
  
  // Trạm Khai Khoáng
  'Đèn Khai Khoáng': { category: 'Trạm Khai Khoáng', type: 'lamp', price: 150, desc: 'Vật phẩm tiêu hao để vào mỏ' },
  'Cúp Gỗ': { category: 'Trạm Khai Khoáng', type: 'pick', price: 50000, desc: 'Mở khóa Mỏ Lộ Thiên' },
  'Cúp Sắt': { category: 'Trạm Khai Khoáng', type: 'pick', price: 350000, desc: 'Mở khóa Hang Động Sâu' },
  'Cúp Kim Cương': { category: 'Trạm Khai Khoáng', type: 'pick', price: 2500000, desc: 'Mở khóa Lõi Trái Đất' },
  
  // Trạm Thú Y
  'Bóng Bắt Pet': { category: 'Trạm Thú Y', type: 'ball', price: 100000, desc: 'Vật phẩm dùng để ném bắt Pet' }
};

const PRICES = {
  'Rác': 5, 'Giày rách': 5, 'Cá Cơm': 50, 'Cá Chép': 150, 'Cá Trê': 180, 'Cá Rô': 200, 'Cua': 250, 'Cá Hồi': 400, 
  'Mực': 750, 'Rùa': 1500, 'Bạch Tuộc': 2500, 'Cá Mặt Trăng': 3000, 'Cá Mập': 5000, 'Thủy Quái': 12000, 'Nàng Tiên Cá': 25000,
  'Đất': 10, 'Cát': 15, 'Đá': 25, 'Than': 75, 'Sắt': 200, 'Đồng': 250, 'Quặng Titan': 500,
  'Bạc': 750, 'Vàng': 2000, 'Thạch Anh': 3500, 'Ngọc Lục Bảo': 5000, 'Saphire': 8000, 'Ruby': 10000, 'Kim Cương': 15000, 'Mảnh Thiên Thạch': 50000
};

const ITEM_CODES = {
  'Rác': 1, 'Giày rách': 2, 'Cá Cơm': 3, 'Cá Chép': 4, 'Cá Trê': 5, 'Cá Rô': 6, 'Cua': 7, 'Cá Hồi': 8, 
  'Mực': 9, 'Rùa': 10, 'Bạch Tuộc': 11, 'Cá Mặt Trăng': 12, 'Cá Mập': 13, 'Thủy Quái': 14, 'Nàng Tiên Cá': 15,
  'Đất': 16, 'Cát': 17, 'Đá': 18, 'Than': 19, 'Sắt': 20, 'Đồng': 21, 'Quặng Titan': 22,
  'Bạc': 23, 'Vàng': 24, 'Thạch Anh': 25, 'Ngọc Lục Bảo': 26, 'Saphire': 27, 'Ruby': 28, 'Kim Cương': 29, 'Mảnh Thiên Thạch': 30,
  'Nhẫn Bạc': 31, 'Nhẫn Vàng': 32, 'Nhẫn Bạch Kim': 33, 'Nhẫn Kim Cương': 34, 'Nhẫn Kim Cương Vĩnh Cửu': 35,
  'Khiên Gỗ (1 Ngày)': 36, 'Khiên Sắt (7 Ngày)': 37, 'Khiên Vàng (30 Ngày)': 38,
  'Mồi Câu': 39, 'Cần Câu Gỗ': 40, 'Cần Câu Sắt': 41, 'Cần Câu Vàng': 42,
  'Đèn Khai Khoáng': 43, 'Cúp Gỗ': 44, 'Cúp Sắt': 45, 'Cúp Kim Cương': 46,
  'Bóng Bắt Pet': 47
};

const ITEM_BY_CODE = {};
for (const [name, code] of Object.entries(ITEM_CODES)) {
    ITEM_BY_CODE[code] = name;
}

const FISH_ZONES = {
  'Ao Làng': { req: 'Cần Câu Gỗ', level: 1, drops: [{n:'Rác',p:0.3},{n:'Cá Cơm',p:0.6},{n:'Cá Chép',p:0.8},{n:'Cá Rô',p:0.95},{n:'Cua',p:1}] },
  'Sông Lớn': { req: 'Cần Câu Sắt', level: 2, drops: [{n:'Cá Chép',p:0.2},{n:'Cá Trê',p:0.5},{n:'Cá Hồi',p:0.8},{n:'Mực',p:0.95},{n:'Rùa',p:1}] },
  'Đại Dương': { req: 'Cần Câu Vàng', level: 3, drops: [{n:'Mực',p:0.2},{n:'Cá Mặt Trăng',p:0.5},{n:'Bạch Tuộc',p:0.7},{n:'Cá Mập',p:0.9},{n:'Thủy Quái',p:0.98},{n:'Nàng Tiên Cá',p:1}] }
};

const MINE_ZONES = {
  'Mỏ Lộ Thiên': { req: 'Cúp Gỗ', level: 1, drops: [{n:'Đá',p:0.5},{n:'Than',p:0.85},{n:'Đồng',p:0.95},{n:'Sắt',p:1}] },
  'Hang Động Sâu': { req: 'Cúp Sắt', level: 2, drops: [{n:'Than',p:0.3},{n:'Sắt',p:0.6},{n:'Quặng Titan',p:0.8},{n:'Bạc',p:0.95},{n:'Vàng',p:1}] },
  'Lõi Trái Đất': { req: 'Cúp Kim Cương', level: 3, drops: [{n:'Vàng',p:0.3},{n:'Thạch Anh',p:0.5},{n:'Ngọc Lục Bảo',p:0.7},{n:'Saphire',p:0.85},{n:'Ruby',p:0.95},{n:'Kim Cương',p:0.99},{n:'Mảnh Thiên Thạch',p:1}] }
};

// Bạn có thể thay đổi thành Emoji tùy chỉnh của server bằng cú pháp: '<:ten_emoji:id_emoji>' hoặc '<a:ten_emoji_dong:id>'
const DICE_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

const PET_RARITIES = [
    { name: 'Thường', prob: 0.50, minHp: 80, maxHp: 120, minAtk: 10, maxAtk: 20, priceMin: 20000, priceMax: 50000 },
    { name: 'Hiếm', prob: 0.30, minHp: 200, maxHp: 300, minAtk: 30, maxAtk: 50, priceMin: 150000, priceMax: 300000 },
    { name: 'Siêu Hiếm', prob: 0.15, minHp: 700, maxHp: 900, minAtk: 100, maxAtk: 140, priceMin: 800000, priceMax: 1500000 },
    { name: 'Thần Thoại', prob: 0.049, minHp: 2200, maxHp: 2800, minAtk: 350, maxAtk: 450, priceMin: 5000000, priceMax: 10000000 },
    { name: 'Truyền Thuyết', prob: 0.001, minHp: 7500, maxHp: 8500, minAtk: 1400, maxAtk: 1600, priceMin: 50000000, priceMax: 100000000 }
];

const PET_SPECIES = {
    'Thường': ['Chó Cỏ', 'Mèo Mướp', 'Gà Trống', 'Vịt Bầu', 'Lợn Đất'],
    'Hiếm': ['Chó Husky', 'Mèo Anh Lông Ngắn', 'Cáo Đỏ', 'Thỏ Trắng'],
    'Siêu Hiếm': ['Sói Bạc', 'Hổ Bengal', 'Báo Gấm', 'Gấu Trúc'],
    'Thần Thoại': ['Kỳ Lân', 'Phượng Hoàng Lửa', 'Rồng Đất'],
    'Truyền Thuyết': ['Rồng Thần Ánh Sáng', 'Cửu Vĩ Hồ', 'Thần Thú Leviathan']
};

const PET_BUY_PRICES = {
    'Thường': 50000,
    'Hiếm': 300000,
    'Siêu Hiếm': 1500000,
    'Thần Thoại': 10000000,
    'Truyền Thuyết': 100000000
};

const ENEMY_BOTS = [
    { name: 'Slime Nhỏ', hpMult: 0.8, atkMult: 0.8, expBase: 20, goldMult: 0.5 },
    { name: 'Yêu Tinh Rừng', hpMult: 1.0, atkMult: 1.0, expBase: 35, goldMult: 1.0 },
    { name: 'Sói Đột Biến', hpMult: 1.2, atkMult: 1.3, expBase: 60, goldMult: 1.5 },
    { name: 'Rồng Lửa Nhỏ', hpMult: 1.5, atkMult: 1.5, expBase: 100, goldMult: 2.5 },
    { name: 'Chúa Tể Bóng Tối', hpMult: 2.0, atkMult: 2.0, expBase: 200, goldMult: 5.0 }
];

function getRandomDrop(dropArray) {
  const r = Math.random();
  for (const drop of dropArray) {
    if (r < drop.p) return drop.n;
  }
  return dropArray[dropArray.length - 1].n;
}

function getBestZone(userId, zonesMap) {
    let bestZone = null;
    let maxLevel = 0;
    for (const [zoneName, zoneData] of Object.entries(zonesMap)) {
        if (db.getItemAmount(userId, guildId, zoneData.req) > 0) {
            if (zoneData.level > maxLevel) {
                maxLevel = zoneData.level;
                bestZone = zoneName;
            }
        }
    }
    return bestZone;
}

const commands = [
  { 
      name: 'masoi', 
      description: 'Chơi Ma Sói (Werewolf)', 
      options: [
          { name: 'create', description: 'Tạo phòng chơi Ma Sói', type: 1 },
          { name: 'start', description: 'Bắt đầu ván Ma Sói', type: 1 }
      ] 
  },
  { name: 'setwelcome', description: 'Cài đặt kênh chào mừng thành viên mới (Admin)', options: [{ name: 'channel', type: 7, description: 'Chọn kênh', required: true }] },
  { name: 'robbank', description: 'Cướp ngân hàng của người khác', options: [{ name: 'user', type: 6, description: 'Nạn nhân', required: true }] },
  { name: 'baucua', description: 'Chơi Bầu Cua Tôm Cá (Nhiều người)' },
  { name: 'balance', description: 'Xem tài sản (Viết tắt: /bal)', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'bal', description: 'Xem tài sản (Lệnh tắt)', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'inv', description: 'Xem chi tiết kho đồ, nhẫn và mã số vật phẩm để bán', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'shop', description: 'Xem Cửa hàng dụng cụ' },
  { name: 'buy', description: 'Mua đồ', options: [{ name: 'item', type: 3, description: 'Tên vật phẩm', required: true, autocomplete: true }, { name: 'amount', type: 4, description: 'Số lượng (mặc định 1)', required: false }] },
  { name: 'sell', description: 'Bán đồ (Viết tắt: /s)', options: [{ name: 'item', type: 3, description: 'Vật phẩm hoặc mã số muốn bán', required: false, autocomplete: true }, { name: 'amount', type: 4, description: 'Số lượng muốn bán (mặc định bán hết)', required: false }] },
  { name: 's', description: 'Bán đồ (Lệnh tắt)', options: [{ name: 'item', type: 3, description: 'Vật phẩm hoặc mã số muốn bán', required: false, autocomplete: true }, { name: 'amount', type: 4, description: 'Số lượng muốn bán (mặc định bán hết)', required: false }] },
  { name: 'sellall', description: 'Bán mọi vật phẩm (Viết tắt: /sa)' },
  { name: 'sa', description: 'Bán mọi vật phẩm (Lệnh tắt)' },
  { name: 'fish', description: 'Đi câu cá (Viết tắt: /f)', options: [{ name: 'zone', type: 3, description: 'Chọn khu vực (bỏ trống để hiện menu)', required: false, choices: Object.keys(FISH_ZONES).map(z => ({name: z, value: z})) }] },
  { name: 'f', description: 'Đi câu cá (Lệnh tắt)', options: [{ name: 'zone', type: 3, description: 'Chọn khu vực (bỏ trống để hiện menu)', required: false, choices: Object.keys(FISH_ZONES).map(z => ({name: z, value: z})) }] },
  { name: 'mine', description: 'Đi đào quặng (Viết tắt: /m)', options: [{ name: 'zone', type: 3, description: 'Chọn khu vực (bỏ trống để hiện menu)', required: false, choices: Object.keys(MINE_ZONES).map(z => ({name: z, value: z})) }] },
  { name: 'm', description: 'Đi đào quặng (Lệnh tắt)', options: [{ name: 'zone', type: 3, description: 'Chọn khu vực (bỏ trống để hiện menu)', required: false, choices: Object.keys(MINE_ZONES).map(z => ({name: z, value: z})) }] },
  { name: 'give', description: 'Chuyển tiền cho người khác', options: [{ name: 'user', type: 6, description: 'Người nhận', required: true }, { name: 'amount', type: 4, description: 'Số tiền', required: true }] },
  { name: 'top', description: 'Xem bảng xếp hạng đại gia' },
  { name: 'work', description: 'Đi tìm việc làm' },
  { name: 'claim', description: 'Nhận lương sau khi làm việc xong' },
  { name: 'daily', description: 'Nhận phần thưởng điểm danh hàng ngày' },
  { name: 'deposit', description: 'Gửi tiền vào ngân hàng (Viết tắt: /dep, /gui)', options: [{ name: 'amount', type: 3, description: 'Số tiền muốn gửi (nhập số hoặc chữ all)', required: true }] },
  { name: 'withdraw', description: 'Rút tiền từ ngân hàng (Viết tắt: /with, /rut)', options: [{ name: 'amount', type: 3, description: 'Số tiền muốn rút (nhập số hoặc chữ all)', required: true }] },
  { name: 'bank', description: 'Mở giao diện Ngân Hàng Trung Ương' },
  { name: 'buyrole', description: 'Mua Role VIP bằng tiền trong game' },
  { name: 'rob', description: 'Ăn trộm tiền của người khác', options: [{ name: 'user', type: 6, description: 'Nạn nhân', required: true }] },
  { name: 'bj', description: 'Chơi Xì Dách (Blackjack)', options: [{ name: 'amount', type: 3, description: 'Số tiền cược (nhập số hoặc chữ all)', required: true }] },
  { name: 'tx', description: 'Chơi Tài Xỉu ăn tiền', options: [
      { name: 'chon', type: 3, description: 'Chọn Tài (t) hoặc Xỉu (x)', required: true, choices: [{name:'Tài', value:'t'}, {name:'Xỉu', value:'x'}] },
      { name: 'tien', type: 3, description: 'Số tiền cược (nhập số hoặc chữ all)', required: true }
  ]},
  { name: 'cl', description: 'Chơi Chẵn Lẻ ăn tiền', options: [
      { name: 'chon', type: 3, description: 'Chọn Chẵn (c) hoặc Lẻ (l)', required: true, choices: [{name:'Chẵn', value:'c'}, {name:'Lẻ', value:'l'}] },
      { name: 'tien', type: 3, description: 'Số tiền cược (nhập số hoặc chữ all)', required: true }
  ]},
  { name: 'hunt', description: 'Đi săn Pet (Viết tắt: /sanpet)' },
  { name: 'pets', description: 'Mở Trung Tâm Quản Lý Thú Cưng' },
  { name: 'pb', description: 'Đem Pet đi đánh quái (Viết tắt: /pb)', options: [{ name: 'pet_id', type: 3, description: 'Mã Pet (ID) muốn đem đi đấu', required: true }] },
  { name: 'profile', description: 'Xem hồ sơ của ai đó (Viết tắt: /info, /pf)', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'info', description: 'Xem hồ sơ của ai đó (Lệnh tắt)', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'pf', description: 'Xem hồ sơ của ai đó (Lệnh tắt)', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'rank', description: 'Xem cấp độ Chat và Voice của bạn hoặc ai đó', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'toprank', description: 'Bảng xếp hạng Cấp độ Chat và Voice' },
  { name: 'help', description: 'Xem danh sách các lệnh và chức năng' },
  { name: 'ping', description: 'Kiểm tra độ trễ (ping) của bot' },
  { name: 'jail', description: 'Bắt giam người chơi (Chỉ Admin)', options: [
      { name: 'user', type: 6, description: 'Người vi phạm', required: true },
      { name: 'messages', type: 4, description: 'Số tin nhắn cần spam để được thả', required: false }
  ]},
  { name: 'unjail', description: 'Ân xá người chơi (Chỉ Admin)', options: [{ name: 'user', type: 6, description: 'Người được ân xá', required: true }] },
  { name: 'av', description: 'Xem ảnh đại diện của ai đó', options: [{ name: 'user', type: 6, description: 'Người muốn xem', required: false }] },
  { name: 'setwinrate', description: 'Chỉnh tỉ lệ thắng Casino (Chỉ Admin)', options: [{ name: 'user', type: 6, description: 'Người chơi', required: true }, { name: 'rate', type: 4, description: 'Tỉ lệ % (0-100)', required: true }] },
  { name: 'setpayout', description: 'Chỉnh hệ số trả thưởng Casino (Chỉ Admin)', options: [{ name: 'user', type: 6, description: 'Người chơi', required: true }, { name: 'rate', type: 10, description: 'Hệ số (VD: 5.0, 0 là tắt)', required: true }] },
  { name: 'checkbuff', description: 'Kiểm tra buff Casino (Chỉ Admin)', options: [{ name: 'user', type: 6, description: 'Người chơi', required: true }] },
  { name: 'petshop', description: 'Mở cửa hàng mua Thú Cưng' },
  { name: 'henho', description: 'Hẹn hò ngẫu nhiên - Bot sẽ ghép bạn với một người độc thân trong server!' },
  { name: 'ghepdoi', description: 'Ghép đôi ngẫu nhiên với một người độc thân trong server!' },
  { name: 'dautu', description: 'Đầu tư sản phẩm HDPE sinh lãi 2%/ngày', options: [{ name: 'tien', type: 3, description: 'Số tiền muốn đầu tư (nhập số hoặc chữ all)', required: false }] },
  { name: 'rutdautu', description: 'Xem và rút tiền đầu tư HDPE (gốc + lãi 2%/ngày)', options: [{ name: 'id', type: 4, description: 'ID gói đầu tư muốn rút (bỏ trống = rút tất cả)', required: false }] },
  { name: 'blockbot', description: 'Chặn/Bỏ chặn bot trong kênh này (Chỉ Admin)', options: [{ name: 'channel', type: 7, description: 'Kênh muốn chặn/bỏ chặn (bỏ trống = kênh hiện tại)', required: false }] },
  { name: 'treoroom', description: '🔇 Treo room (cấm vào Voice) của người dùng (Chỉ Admin)', options: [
      { name: 'user', type: 6, description: 'Người bị treo room', required: true },
      { name: 'thoigian', type: 3, description: 'Thời gian treo (VD: 1h, 30m, 7d, 0 = vĩnh viễn)', required: false },
      { name: 'lydo', type: 3, description: 'Lý do treo room', required: false }
  ]},
  { name: 'botreo', description: '🔊 Gỡ treo room cho người dùng (Chỉ Admin)', options: [
      { name: 'user', type: 6, description: 'Người được gỡ treo', required: true }
  ]},
  { name: 'admindivorce', description: 'Cưỡng chế ly hôn một cặp đôi (Chỉ Admin)', options: [
      { name: 'user', type: 6, description: 'Một trong hai người trong cặp đôi', required: true }
  ]},
  { name: 'listtreo', description: '📋 Xem danh sách người đang bị treo room (Chỉ Admin)' },
  // --- Giveaway Commands ---
  { name: 'gcreate', description: '🎉 Tạo Giveaway mới (Chỉ Admin)', options: [
      { name: 'thoigian', type: 3, description: 'Thời gian (VD: 10m, 1h, 2d)', required: true },
      { name: 'phanthuong', type: 3, description: 'Phần thưởng giveaway', required: true },
      { name: 'soguinang', type: 4, description: 'Số người thắng (mặc định 1)', required: false },
      { name: 'banner', type: 3, description: 'URL ảnh banner', required: false },
      { name: 'mota', type: 3, description: 'Mô tả thêm cho giveaway', required: false },
      { name: 'mau', type: 3, description: 'Màu embed (hex, VD: #FF6B6B)', required: false },
  ]},
  { name: 'gend', description: '🛑 Kết thúc sớm Giveaway (Chỉ Admin)', options: [{ name: 'id', type: 3, description: 'Message ID của Giveaway', required: true }] },
  { name: 'greroll', description: '🔄 Chọn lại người thắng (Chỉ Admin)', options: [{ name: 'id', type: 3, description: 'Message ID của Giveaway', required: true }] },
  { name: 'glist', description: '📋 Xem danh sách Giveaway đang chạy' },
  { name: 'gedit', description: '✏️ Chỉnh sửa Giveaway (Chỉ Admin)', options: [{ name: 'id', type: 3, description: 'Message ID của Giveaway', required: true }] }
];

// ===== AUTO JOIN VOICE CHANNEL (ở lại kênh thoại mãi mãi, dùng lệnh 1join) =====
let autoVoiceConnection = null;
let autoVoiceChannelId = null;  // ID kênh thoại bot đang ở
let autoVoiceGuildId = null;    // ID guild chứa kênh đó

async function botPermanentJoin(guild, channelId) {
    // Nếu đã có connection cũ thì destroy trước
    if (autoVoiceConnection) {
        try { autoVoiceConnection.destroy(); } catch {}
        autoVoiceConnection = null;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        console.log(`[AutoVoice] Không tìm thấy kênh thoại ID: ${channelId}`);
        return false;
    }

    try {
        console.log(`[AutoVoice] Bot đang vào kênh: ${channel.name} (${guild.name})`);

        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,  // Bot điếc (không nghe)
            selfMute: true,  // Bot câm (không nói)
        });

        autoVoiceConnection = connection;
        autoVoiceChannelId = channelId;
        autoVoiceGuildId = guild.id;

        // Lắng nghe disconnect — rejoin tự động
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log(`[AutoVoice] Bị disconnect, thử reconnect...`);
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                console.log(`[AutoVoice] Reconnect thành công!`);
            } catch {
                console.log(`[AutoVoice] Reconnect thất bại, rejoin sau 3 giây...`);
                try { connection.destroy(); } catch {}
                autoVoiceConnection = null;
                // Chỉ rejoin nếu vẫn còn lưu channelId (chưa bị 1leave)
                if (autoVoiceChannelId) {
                    setTimeout(async () => {
                        if (autoVoiceChannelId) {
                            const g = client.guilds.cache.get(autoVoiceGuildId);
                            if (g) botPermanentJoin(g, autoVoiceChannelId);
                        }
                    }, 3000);
                }
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            if (autoVoiceConnection === connection) {
                console.log(`[AutoVoice] Connection bị destroyed, rejoin sau 3 giây...`);
                autoVoiceConnection = null;
                if (autoVoiceChannelId) {
                    setTimeout(async () => {
                        if (autoVoiceChannelId) {
                            const g = client.guilds.cache.get(autoVoiceGuildId);
                            if (g) botPermanentJoin(g, autoVoiceChannelId);
                        }
                    }, 3000);
                }
            }
        });

        console.log(`[AutoVoice] ✅ Đã vào kênh "${channel.name}" và sẽ ở đây mãi mãi!`);
        return true;
    } catch (e) {
        console.error('[AutoVoice] Lỗi khi vào kênh:', e.message);
        return false;
    }
}

function botPermanentLeave() {
    // Dừng nhạc nếu đang phát trước khi rời
    if (autoVoiceGuildId) {
        const queue = musicQueues.get(autoVoiceGuildId);
        if (queue) {
            queue.songs = [];
            queue.player.stop();
            musicQueues.delete(autoVoiceGuildId);
        }
    }
    autoVoiceChannelId = null;
    autoVoiceGuildId = null;
    if (autoVoiceConnection) {
        try { autoVoiceConnection.destroy(); } catch {}
        autoVoiceConnection = null;
    }
}

// ===== HỆ THỐNG PHÁT NHẠC =====
// Map lưu queue nhạc theo guildId
const musicQueues = new Map();

function getMusicQueue(guildId) {
    return musicQueues.get(guildId);
}

function createMusicQueue(guild, textChannel, voiceConnection) {
    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    const queue = {
        guild,
        textChannel,
        connection: voiceConnection,
        player,
        songs: [],      // [{ title, url, duration, thumbnail, requestedBy }]
        playing: false,
        volume: 100,
        loop: false,
    };

    voiceConnection.subscribe(player);

    // Khi bài hát kết thúc → phát bài tiếp theo
    player.on(AudioPlayerStatus.Idle, () => {
        if (queue.loop && queue.songs.length > 0) {
            // Loop: đẩy bài đầu xuống cuối
            queue.songs.push(queue.songs.shift());
        } else {
            queue.songs.shift();
        }

        if (queue.songs.length > 0) {
            playSong(queue);
        } else {
            queue.playing = false;
            queue.textChannel.send('📭 Hết nhạc trong hàng đợi! Bot vẫn ở lại kênh thoại.').catch(() => {});
            // KHÔNG disconnect — bot ở lại kênh
        }
    });

    player.on('error', (error) => {
        console.error('[Music] Player Error:', error.message);
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(queue);
        } else {
            queue.playing = false;
            queue.textChannel.send('❌ Lỗi phát nhạc! Hàng đợi đã hết.').catch(() => {});
        }
    });

    musicQueues.set(guild.id, queue);
    return queue;
}

// Tạo row nút điều khiển nhạc
function createMusicButtons(queue) {
    const isPaused = queue.player.state.status === AudioPlayerStatus.Paused;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_pause')
            .setEmoji(isPaused ? '▶️' : '⏸️')
            .setLabel(isPaused ? 'Tiếp tục' : 'Tạm dừng')
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_skip')
            .setEmoji('⏭️')
            .setLabel('Bỏ qua')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('music_stop')
            .setEmoji('⏹️')
            .setLabel('Dừng')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('music_loop')
            .setEmoji('🔁')
            .setLabel(queue.loop ? 'Lặp: BẬT' : 'Lặp: TẮT')
            .setStyle(queue.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setEmoji('📋')
            .setLabel('Hàng đợi')
            .setStyle(ButtonStyle.Secondary)
    );
}

async function playSong(queue) {
    if (!queue.songs || queue.songs.length === 0) {
        queue.playing = false;
        return;
    }

    const song = queue.songs[0];
    queue.playing = true;

    try {
        // Dùng yt-dlp subprocess để stream audio trực tiếp
        const proc = spawn(YTDLP_PATH, [
            song.url,
            '-f', 'bestaudio[ext=webm]/bestaudio/best',
            '-o', '-',           // output to stdout
            '--no-warnings',
            '--no-check-certificates',
            '--prefer-free-formats',
            '--no-playlist',
        ], { stdio: ['ignore', 'pipe', 'ignore'] });

        // Tạo audio resource từ stdout của yt-dlp
        const resource = createAudioResource(proc.stdout, {
            inputType: StreamType.Arbitrary,
            inlinevolume: true,
        });

        if (resource.volume) {
            resource.volume.setVolume(queue.volume / 100);
        }

        queue.player.play(resource);

        const embed = new EmbedBuilder()
            .setColor('#e91e63')
            .setTitle('🎵 Đang Phát Nhạc')
            .setDescription(`[**${song.title}**](${song.url})`)
            .addFields(
                { name: '⏱️ Thời lượng', value: song.duration || 'N/A', inline: true },
                { name: '🔊 Âm lượng', value: `${queue.volume}%`, inline: true },
                { name: '👤 Yêu cầu bởi', value: `<@${song.requestedBy}>`, inline: true }
            )
            .setFooter({ text: `🎶 Hàng đợi: ${queue.songs.length} bài | Dùng các nút bên dưới để điều khiển` });

        if (song.thumbnail) embed.setThumbnail(song.thumbnail);

        const buttons = createMusicButtons(queue);

        // Xóa message cũ nếu có
        if (queue.nowPlayingMsg) {
            queue.nowPlayingMsg.delete().catch(() => {});
        }

        const msg = await queue.textChannel.send({ embeds: [embed], components: [buttons] }).catch(() => null);
        queue.nowPlayingMsg = msg;
    } catch (e) {
        console.error('[Music] Stream Error:', e.message);
        queue.textChannel.send(`❌ Không thể phát: **${song.title}** — ${e.message}`).catch(() => {});
        queue.songs.shift();
        if (queue.songs.length > 0) {
            setTimeout(() => playSong(queue), 1000);
        } else {
            queue.playing = false;
        }
    }
}

function formatDurationSecs(seconds) {
    if (!seconds || isNaN(seconds)) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Hàm đảm bảo bot ở trong voice channel (dùng cho music)
async function ensureBotInVoice(guild, voiceChannelId) {
    // Nếu bot đã ở trong kênh (auto join) → dùng connection hiện có
    if (autoVoiceConnection && autoVoiceChannelId === voiceChannelId) {
        return autoVoiceConnection;
    }
    if (autoVoiceConnection && autoVoiceGuildId === guild.id) {
        // Bot đang ở kênh khác trong cùng guild → chuyển sang kênh mới
        try { autoVoiceConnection.destroy(); } catch {}
        autoVoiceConnection = null;
    }

    // Join kênh mới
    const connection = joinVoiceChannel({
        channelId: voiceChannelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    autoVoiceConnection = connection;
    autoVoiceChannelId = voiceChannelId;
    autoVoiceGuildId = guild.id;

    // Rejoin logic cho music
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            if (autoVoiceChannelId) {
                try { connection.destroy(); } catch {}
                autoVoiceConnection = null;
                setTimeout(async () => {
                    if (autoVoiceChannelId) {
                        const g = client.guilds.cache.get(autoVoiceGuildId);
                        if (g) {
                            const newConn = await ensureBotInVoice(g, autoVoiceChannelId);
                            const q = musicQueues.get(g.id);
                            if (q) {
                                q.connection = newConn;
                                newConn.subscribe(q.player);
                            }
                        }
                    }
                }, 3000);
            }
        }
    });

    return connection;
}

client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}!`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try { await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); } catch (error) { console.error(error); }
});

client.on('error', (error) => {
    console.error('Discord Client Error:', error.message);
});

const cooldowns = new Map();
const xpCooldowns = new Set();
const voiceJoinTimes = new Map();

// ===== QUẢN LÝ VOICE BOT (TREO ROOM) =====
// Map lưu { guildId: { connection, channelId, suspendedUserId } }
const botVoiceMap = new Map();

// Hàm cho bot join voice channel để canh treo room
async function botJoinSuspensionChannel(guild, channelId, suspendedUserId) {
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;
        // Nếu đang join kênh khác cùng guild, rời trước
        const existingConn = getVoiceConnection(guild.id);
        if (existingConn) existingConn.destroy();

        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,   // Bot tắt tai (deaf)
            selfMute: true,   // Bot tắt mic
        });

        botVoiceMap.set(guild.id, { connection, channelId, suspendedUserId });

        // Lắng nghe khi bị disconnect (bởi bất kỳ lý do nào)
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                // Thử reconnect nếu bị ngắt mạng tạm thời
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                // Không reconnect được → kiểm tra có nên rejoin không
                const entry = botVoiceMap.get(guild.id);
                if (!entry) return; // Admin đã dùng /botreo (map đã xóa) → KHÔNG rejoin

                // Vẫn còn trong map (phòng trống / bị kick) → REJOIN sau 3s
                console.log(`[BotVoice] Disconnect khỏi ${channelId} (phòng trống hoặc bị kick), rejoin sau 3s...`);
                try { connection.destroy(); } catch {}

                setTimeout(() => {
                    if (botVoiceMap.has(guild.id)) { // kiểm tra lại trước khi rejoin
                        botJoinSuspensionChannel(guild, channelId, suspendedUserId);
                    }
                }, 3000);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            // Không tự xóa map ở đây – để Disconnected handler quyết định rejoin hay không
        });

    } catch (e) {
        console.error('[BotVoice] Lỗi join:', e.message);
    }
}

// Hàm cho bot rời voice channel — CHỈ gọi khi admin dùng /botreo
function botLeaveSuspensionChannel(guildId) {
    const entry = botVoiceMap.get(guildId);
    if (entry) {
        // XÓA MAP TRƯỚC → Disconnected handler thấy map rỗng → không rejoin
        botVoiceMap.delete(guildId);
        try { entry.connection.destroy(); } catch {}
        console.log(`[BotVoice] Bot rời kênh theo lệnh Admin (guild: ${guildId})`);
    }
}

// --- KÊNH BỊ CHẶN BOT ---
const fs = require('fs');

const BAUCUA_EMOJIS = {
    bau: '<:baucua_bau:1510113323969020074>', 
    cua: '<:baucua_cua:1510113473508409454>', 
    tom: '<:baucua_tom:1510113482039889942>', 
    ca: '<:baucua_ca:1510113470853681302>', 
    ga: '<:baucua_ga:1510113477199401000>', 
    nai: '<:baucua_nai:1510113480143802398>'
};
const BAUCUA_NAMES = {
    bau: 'Bầu', cua: 'Cua', tom: 'Tôm', ca: 'Cá', ga: 'Gà', nai: 'Nai'
};
const activeBauCuaSessions = new Map();

function parseBetAmount(user, amountStr, maxLimit) {
    const userData = db.getUser(user.id, guildId);
    let amount = 0;
    if (amountStr.toLowerCase() === 'all') {
        amount = Math.min(userData.balance, maxLimit);
    } else {
        amount = parseInt(amountStr);
    }
    if (isNaN(amount) || amount <= 0) return { error: 'Số tiền không hợp lệ!' };
    if (userData.balance < amount) return { error: `Bạn không đủ tiền mặt! Trong ví chỉ có **${userData.balance.toLocaleString('en-US')} JC**.` };
    if (amount > maxLimit) return { error: `Cược tối đa là **${maxLimit.toLocaleString('en-US')} JC** một ván!` };
    return { amount };
}


async function updateBauCuaUI(session) {
    let desc = `Bàn đã mở! Vui lòng chọn 1 linh vật bên dưới để đặt cược!\n\n*(Sẽ chốt đơn sau **<t:${Math.floor(session.endTime/1000)}:R>**)*\n\n**Danh sách cược:**\n`;
    let hasBets = false;
    for (const [choiceId, list] of Object.entries(session.bets)) {
        if (list.length > 0) {
            hasBets = true;
            const totalAmount = list.reduce((sum, b) => sum + b.amount, 0);
            desc += `${BAUCUA_EMOJIS[choiceId]} **${BAUCUA_NAMES[choiceId]}**: ${totalAmount.toLocaleString('en-US')} JC (${list.length} người)\n`;
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
    try { await session.msg.edit({ content: `🎲 Mở nắp cái đầu tiên: **${BAUCUA_EMOJIS[resultIds[0]]}**` }); } catch(e){}
    await wait(2000);
    try { await session.msg.edit({ content: `🎲 Cái thứ hai là: **${BAUCUA_EMOJIS[resultIds[1]]}**` }); } catch(e){}
    await wait(2000);
    const hitCounts = { bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 };
    resultIds.forEach(id => hitCounts[id]++);
    let winnersList = [];
    for (const [choiceId, list] of Object.entries(session.bets)) {
        const hits = hitCounts[choiceId];
        if (hits > 0) {
            for (const bet of list) {
                const payout = bet.amount + (bet.amount * hits);
                db.addBalance(bet.userId, guildId, payout);
                winnersList.push(`- <@${bet.userId}>: **+${(bet.amount * hits).toLocaleString('en-US')} JC** (Cược ${BAUCUA_NAMES[choiceId]} x${hits})`);
            }
        }
    }
    let finalDesc = `Mở bát: **${BAUCUA_EMOJIS[resultIds[0]]} ${BAUCUA_EMOJIS[resultIds[1]]} ${BAUCUA_EMOJIS[resultIds[2]]}**\n\n`;
    if (winnersList.length > 0) {
        finalDesc += `🎉 **DANH SÁCH TRÚNG THƯỞNG:**\n` + winnersList.join('\n');
    } else {
        if (session.totalBet > 0) { finalDesc += `💀 **KHÔNG AI TRÚNG THƯỞNG!** Nhà cái ăn trọn **${session.totalBet.toLocaleString('en-US')} JC**!`; } else { finalDesc += `Nhạt nhẽo quá, không có ai đặt cược cả!`; }
    }
    const embed = new EmbedBuilder().setTitle('🎲 KẾT QUẢ BẦU CUA 🎲').setDescription(finalDesc).setColor(winnersList.length > 0 ? '#00FF00' : '#FF0000').setTimestamp();
    const files = resultIds.map(id => new AttachmentBuilder('./baucua_images/' + id + '.png'));
    try { await session.msg.edit({ content: '', embeds: [embed], files: files }); } catch(e) {}
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
        .setDescription(`Bàn đã mở! Vui lòng chọn 1 linh vật bên dưới để đặt cược!\n\n*(Sẽ chốt đơn sau **<t:${Math.floor(endTime / 1000)}:R>**)*\n\n**Danh sách cược:**\nChưa có ai đặt cược.`)
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


const BLOCKED_CHANNELS_FILE = require('path').join(__dirname, 'blocked_channels.json');
let blockedChannels = new Set();
try {
    const raw = fs.readFileSync(BLOCKED_CHANNELS_FILE, 'utf8');
    blockedChannels = new Set(JSON.parse(raw));
} catch (e) { /* file chưa tồn tại, bỏ qua */ }

function saveBlockedChannels() {
    fs.writeFileSync(BLOCKED_CHANNELS_FILE, JSON.stringify([...blockedChannels]));
}

function isChannelBlocked(channelId) {
    return blockedChannels.has(channelId);
}

// --- HỆ THỐNG AUTO-RESPONDER ---
const AUTORESPONDER_FILE = require('path').join(__dirname, 'autoresponder.json');
let autoResponders = [];
try {
    autoResponders = JSON.parse(fs.readFileSync(AUTORESPONDER_FILE, 'utf8'));
} catch (e) { autoResponders = []; }

function saveAutoResponders() {
    fs.writeFileSync(AUTORESPONDER_FILE, JSON.stringify(autoResponders, null, 2));
}

function getNextARId() {
    return autoResponders.length === 0 ? 1 : Math.max(...autoResponders.map(r => r.id)) + 1;
}

// Kiểm tra message có khớp trigger nào không, trả về response hoặc null
function checkAutoResponder(content) {
    const lowerContent = content.toLowerCase();
    for (const rule of autoResponders) {
        const trigger = rule.trigger.toLowerCase();
        const matched = rule.matchType === 'exact'
            ? lowerContent === trigger
            : rule.matchType === 'startsWith'
                ? lowerContent.startsWith(trigger)
                : lowerContent.includes(trigger); // 'contains' (default)
        if (matched) return rule.response;
    }
    return null;
}

// --- TRẢNG THÁI TREO ROOM ---
// Hàm parse thời gian từ string VD: "1h", "30m", "7d", "0"
// Trả về milliseconds, 0 = vĩnh viễn
function parseDuration(str) {
    if (!str || str === '0' || str.toLowerCase() === 'vinh vien' || str.toLowerCase() === 'vĩnh viễn') return 0;
    const match = str.match(/^(\d+)([smhd]?)$/i);
    if (!match) return -1; // Không hợp lệ
    const value = parseInt(match[1]);
    const unit = (match[2] || 'm').toLowerCase();
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return value * (multipliers[unit] || multipliers['m']);
}

function formatDuration(ms) {
    if (ms <= 0) return 'Vĩnh viễn';
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    return parts.length > 0 ? parts.join(' ') : 'Dưới 1 phút';
}

async function handleTreoRoom(isSlash, ctx, adminUser, targetUser, thoigianStr, lydo) {
    const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);
    if (!checkAdmin(adminUser.id)) {
        const msg = { content: '🚫 Chỉ Admin mới có quyền treo room!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }
    if (!targetUser) {
        const msg = { content: 'Vui lòng tag người muốn treo room!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }
    if (checkAdmin(targetUser.id)) {
        const msg = { content: '❌ Không thể treo room Admin!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const durationMs = parseDuration(thoigianStr || '0');
    if (durationMs === -1) {
        const msg = { content: '❌ Thời gian không hợp lệ! Ví dụ: `30m`, `1h`, `7d`, `0` (vĩnh viễn)', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const reason = lydo || 'Vi phạm nội quy';
    const expiresAt = db.suspendVoice(targetUser.id, guildId, adminUser.id, reason, durationMs);

    // Nếu user đang trong voice channel, kick ra ngay
    const guild = isSlash ? ctx.guild : ctx.guild;
    if (guild) {
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (member && member.voice.channelId) {
            await member.voice.disconnect().catch(() => {});
        }
    }

    const durationText = durationMs > 0 ? formatDuration(durationMs) : 'Vĩnh viễn';
    const expiresText = expiresAt > 0 ? `<t:${Math.floor(expiresAt / 1000)}:F>` : 'Không có thời hạn';

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🔇 Treo Room Kênh Voice')
        .setDescription(`<@${targetUser.id}> đã bị treo room bởi <@${adminUser.id}>`)
        .addFields(
            { name: '📝 Lý do', value: reason, inline: false },
            { name: '⏱️ Thời gian', value: durationText, inline: true },
            { name: '📅 Hết hạn', value: expiresText, inline: true }
        )
        .setTimestamp();

    return isSlash ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

async function handleBoTreo(isSlash, ctx, adminUser, targetUser) {
    const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);
    if (!checkAdmin(adminUser.id)) {
        const msg = { content: '🚫 Chỉ Admin mới có quyền gỡ treo room!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }
    if (!targetUser) {
        const msg = { content: 'Vui lòng tag người muốn gỡ treo!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const existing = db.getVoiceSuspension(targetUser.id, guildId);
    if (!existing) {
        const msg = { content: `❌ **${targetUser.username}** hiện không bị treo room!` };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    db.unsuspendVoice(targetUser.id, guildId);

    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🔊 Gỡ Treo Room Thành Công')
        .setDescription(`✅ <@${targetUser.id}> đã được gỡ treo room bởi <@${adminUser.id}>. Họ có thể tham gia kênh Voice trở lại!`)
        .setTimestamp();

    return isSlash ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

async function handleListTreo(isSlash, ctx, adminUser) {
    const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);
    if (!checkAdmin(adminUser.id)) {
        const msg = { content: '🚫 Chỉ Admin mới có quyền xem danh sách treo room!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const list = db.getAllSuspendedVoice(guildId);

    if (list.length === 0) {
        const msg = { content: '✅ Hiện không có ai bị treo room!' };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('📋 Danh Sách Treo Room Hiện Tại')
        .setDescription(`Tổng cộng: **${list.length}** người đang bị treo room`);

    for (const record of list.slice(0, 10)) {
        const expiresText = record.expires_at > 0
            ? `<t:${Math.floor(record.expires_at / 1000)}:R>`
            : 'Vĩnh viễn';
        embed.addFields({
            name: `\`${record.user_id}\``,
            value: `👤 <@${record.user_id}> | 🔒 Bởi: <@${record.suspended_by}>\n📝 Lý do: ${record.reason}\n⏰ Hết hạn: ${expiresText}`,
            inline: false
        });
    }

    if (list.length > 10) {
        embed.setFooter({ text: `Và ${list.length - 10} người khác...` });
    }

    return isSlash ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

function handleBalance(user) {
    const userData = db.getUser(user.id, guildId);
    const inventory = db.getInventory(user.id, guildId);
    let invText = inventory.length > 0 ? inventory.map(i => `- **${i.item}**: ${i.amount}`).join('\n') : 'Trống.';
    if (invText.length > 900) {
        invText = invText.substring(0, 900) + `\n... (Dùng lệnh ${PREFIX}inv để xem toàn bộ kho đồ)`;
    }
    const bankBal = userData.bank || 0;
    
    let relText = 'Độc thân vui tính 🥲';
    const rel = db.getRelationship(user.id, guildId);
    if (rel) {
        const partnerId = rel.user_id === user.id ? rel.partner_id : rel.user_id;
        if (rel.status === 'engaged') relText = `💍 Đã đính hôn với <@${partnerId}>`;
        else if (rel.status === 'married') relText = `❤️ Đã kết hôn với <@${partnerId}>`;
    }

    return new EmbedBuilder().setColor('#0099ff').setTitle(`Tài khoản Legend Main của ${user.username}`).setDescription(`**Tình trạng:** ${relText}`).addFields(
        { name: `${EMOJIS.money} Tiền mặt`, value: `${userData.balance.toLocaleString()} G`, inline: true },
        { name: `${EMOJIS.bank} Ngân hàng`, value: `${bankBal.toLocaleString()} G`, inline: true },
        { name: '🎒 Vật phẩm', value: invText }
    );
}

function handleShop() {
    const embed = new EmbedBuilder().setColor('#ffaa00').setTitle(`${EMOJIS.shop} Chợ Đêm Legend Main`).setDescription('Nơi giao thương sầm uất bậc nhất server! Hãy chọn gian hàng bên dưới.').setImage('attachment://shop.png');
    
    const categories = {};
    for (const [name, data] of Object.entries(SHOP_ITEMS)) {
        if (!categories[data.category]) categories[data.category] = [];
        categories[data.category].push({ name, data });
    }
    
    const components = [];
    let i = 1;
    for (const [catName, items] of Object.entries(categories)) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`shop_select_${i}`)
            .setPlaceholder(`🛒 ${catName}`)
            .addOptions(items.map(item => ({
                label: item.name,
                description: `Giá: ${item.data.price.toLocaleString()} G`,
                value: item.name
            })));
        components.push(new ActionRowBuilder().addComponents(select));
        i++;
    }
    
    return { embeds: [embed], components };
}

function handleBuy(user, itemName, amount = 1) {
    if (!itemName) return { content: 'Vui lòng nhập tên vật phẩm cần mua!', ephemeral: true };
    const itemKey = Object.keys(SHOP_ITEMS).find(k => k.toLowerCase() === itemName.toLowerCase());
    if (!itemKey) return { content: 'Món đồ này không có bán!', ephemeral: true };
    const itemData = SHOP_ITEMS[itemKey];
    
    if (amount < 1) amount = 1;
    
    // Items that can only be bought once
    if (itemData.type !== 'bait' && itemData.type !== 'lamp' && itemData.type !== 'ball' && amount > 1) {
        amount = 1;
    }
    
    const totalPrice = itemData.price * amount;
    const userData = db.getUser(user.id, guildId);
    
    if (userData.balance < totalPrice) return { content: `Bạn không đủ tiền! Cần **${totalPrice.toLocaleString()} G** cho ${amount}x ${itemKey}.`, ephemeral: true };
    
    if (itemData.type !== 'bait' && itemData.type !== 'lamp' && itemData.type !== 'ball' && db.getItemAmount(user.id, guildId, itemKey) > 0) {
        return { content: `Bạn đã sở hữu dụng cụ ${itemKey} này rồi!`, ephemeral: true };
    }
    
    db.addBalance(user.id, guildId, -totalPrice);
    
    if (itemData.type === 'shield') {
        const newExpiry = db.setShield(user.id, guildId, itemData.duration);
        const date = new Date(newExpiry).toLocaleString('vi-VN');
        return { content: `🛡️ Bạn đã mua **${itemKey}** với giá **${totalPrice.toLocaleString()} G**! Khiên đã được tự động kích hoạt và bảo vệ bạn đến **${date}**!`, ephemeral: true };
    }
    
    db.addItem(user.id, guildId, itemKey, amount);
    return { content: `🛒 Bạn đã mua **${amount}x ${itemKey}** thành công với giá **${totalPrice.toLocaleString()} G**!`, ephemeral: true };
}

function handleSell(user, itemInput, specifiedAmount) {
    const inv = db.getInventory(user.id, guildId);
    
    if (!itemInput) {
        if (inv.length === 0) return { content: 'Túi đồ của bạn không có gì để bán!', ephemeral: true };
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Thương Nhân Thu Mua')
            .setDescription('Hãy chọn vật phẩm bạn muốn bán từ danh sách bên dưới (nhận lại 75% giá trị với đồ Shop/Nhẫn):');
        
        const options = inv.slice(0, 25).map(i => {
            let price = PRICES[i.item];
            if (price === undefined) {
                price = SHOP_ITEMS[i.item] ? Math.floor(SHOP_ITEMS[i.item].price * 0.75) : 5;
            }
            const code = ITEM_CODES[i.item] ? `#${ITEM_CODES[i.item]}` : '';
            return {
                label: `${i.item} ${code}`.trim(),
                description: `Số lượng: ${i.amount} | Giá bán: ${price.toLocaleString()} G/cái`,
                value: i.item
            };
        });
        
        const select = new StringSelectMenuBuilder().setCustomId('sell_select').setPlaceholder('Chọn vật phẩm để bán...').addOptions(options);
        const row = new ActionRowBuilder().addComponents(select);
        
        return { embeds: [embed], components: [row] };
    }

    itemInput = itemInput.trim();
    let amountToSell = specifiedAmount;
    let itemKey = null;

    if (amountToSell === undefined || amountToSell === null) {
        const parts = itemInput.split(/ +/);
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (/^\d+$/.test(lastPart)) {
                const possibleItemName = parts.slice(0, -1).join(' ');
                const possibleCode = parseInt(parts[0]);
                
                const matchByName = Object.keys(ITEM_CODES).find(k => k.toLowerCase() === possibleItemName.toLowerCase());
                if (matchByName) {
                    itemKey = matchByName;
                    amountToSell = parseInt(lastPart);
                } else if (parts.length === 2 && !isNaN(possibleCode) && ITEM_BY_CODE[possibleCode]) {
                    itemKey = ITEM_BY_CODE[possibleCode];
                    amountToSell = parseInt(lastPart);
                }
            }
        }
    }

    if (!itemKey) {
        const codeNum = parseInt(itemInput);
        if (/^\d+$/.test(itemInput) && ITEM_BY_CODE[codeNum]) {
            itemKey = ITEM_BY_CODE[codeNum];
        } else {
            itemKey = Object.keys(ITEM_CODES).find(k => k.toLowerCase() === itemInput.toLowerCase());
            if (!itemKey) {
                itemKey = Object.keys(PRICES).find(k => k.toLowerCase() === itemInput.toLowerCase()) ||
                          Object.keys(SHOP_ITEMS).find(k => k.toLowerCase() === itemInput.toLowerCase());
            }
        }
    }

    if (!itemKey) {
        return { content: `❌ Không tìm thấy vật phẩm nào có tên hoặc mã số là **${itemInput}**!` };
    }

    const ownedAmount = db.getItemAmount(user.id, guildId, itemKey);
    if (ownedAmount < 1) {
        return { content: `❌ Bạn không sở hữu vật phẩm **${itemKey}** để bán!` };
    }

    if (amountToSell === undefined || amountToSell === null || isNaN(amountToSell) || amountToSell <= 0) {
        amountToSell = ownedAmount;
    } else if (amountToSell > ownedAmount) {
        return { content: `❌ Bạn chỉ có **${ownedAmount}**x **${itemKey}**, không đủ để bán **${amountToSell}**x!` };
    }

    let unitPrice = PRICES[itemKey];
    if (unitPrice === undefined) {
        unitPrice = SHOP_ITEMS[itemKey] ? Math.floor(SHOP_ITEMS[itemKey].price * 0.75) : 5;
    }

    const totalRevenue = unitPrice * amountToSell;
    db.removeItem(user.id, guildId, itemKey, amountToSell);
    db.addBalance(user.id, guildId, totalRevenue);

    const codeStr = ITEM_CODES[itemKey] ? ` (Mã: #${ITEM_CODES[itemKey]})` : '';
    return { content: `💸 Bạn đã bán thành công **${amountToSell}x ${itemKey}**${codeStr} và thu về **${totalRevenue.toLocaleString()} JC**!` };
}

function handleInventory(user) {
    const inv = db.getInventory(user.id, guildId);
    const userData = db.getUser(user.id, guildId);
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🎒 Kho Đồ Chi Tiết của ${user.username}`)
        .setDescription(`💡 **Hướng dẫn bán đồ:**\nDùng lệnh \`/sell <mã số>\` hoặc \`${PREFIX}sell <mã số> [số lượng]\` để bán.\n*Ví dụ: \`${PREFIX}sell 4\` (bán tất cả Cá Chép) hoặc \`${PREFIX}sell 31 1\` (bán 1 Nhẫn Bạc).*\n*Đồ Shop/Nhẫn khi bán lại sẽ nhận được 75% giá gốc.*`)
        .setFooter({ text: `Legend Main • Ví: ${userData.balance.toLocaleString()} G` });

    if (inv.length === 0) {
        embed.addFields({ name: '📭 Trạng thái', value: 'Kho đồ của bạn hiện đang trống không!' });
        return { embeds: [embed] };
    }

    const fishItems = [];
    const mineItems = [];
    const shopAndRings = [];
    const otherItems = [];

    const fishNames = new Set(['Rác', 'Giày rách', 'Cá Cơm', 'Cá Chép', 'Cá Trê', 'Cá Rô', 'Cua', 'Cá Hồi', 'Mực', 'Rùa', 'Bạch Tuộc', 'Cá Mặt Trăng', 'Cá Mập', 'Thủy Quái', 'Nàng Tiên Cá']);
    const mineNames = new Set(['Đất', 'Cát', 'Đá', 'Than', 'Sắt', 'Đồng', 'Quặng Titan', 'Bạc', 'Vàng', 'Thạch Anh', 'Ngọc Lục Bảo', 'Saphire', 'Ruby', 'Kim Cương', 'Mảnh Thiên Thạch']);

    for (const item of inv) {
        const code = ITEM_CODES[item.item] ? `\`#${ITEM_CODES[item.item]}\`` : '`#?`';
        let price = PRICES[item.item];
        let isShopItem = false;
        if (price === undefined) {
            if (SHOP_ITEMS[item.item]) {
                price = Math.floor(SHOP_ITEMS[item.item].price * 0.75);
                isShopItem = true;
            } else {
                price = 5;
            }
        }

        const line = `🏷️ ${code} **${item.item}**: ${item.amount} cái *(Bán: ${price.toLocaleString()} G/cái)*`;

        if (fishNames.has(item.item)) {
            fishItems.push(line);
        } else if (mineNames.has(item.item)) {
            mineItems.push(line);
        } else if (isShopItem || item.item.toLowerCase().includes('nhẫn')) {
            shopAndRings.push(line);
        } else {
            otherItems.push(line);
        }
    }

    const addSectionFields = (title, itemsArray) => {
        if (itemsArray.length === 0) return;
        let currentText = '';
        let part = 1;
        for (const line of itemsArray) {
            if (currentText.length + line.length + 2 > 1000) {
                embed.addFields({ name: `${title} ${part > 1 ? `(P${part})` : ''}`, value: currentText });
                currentText = line + '\n';
                part++;
            } else {
                currentText += line + '\n';
            }
        }
        if (currentText.trim().length > 0) {
            embed.addFields({ name: `${title} ${part > 1 ? `(P${part})` : ''}`, value: currentText.trim() });
        }
    };

    addSectionFields('🐟 Thành Quả Câu Cá', fishItems);
    addSectionFields('💎 Khoáng Sản Đào Mỏ', mineItems);
    addSectionFields('💍 Trang Sức & Dụng Cụ', shopAndRings);
    addSectionFields('📦 Vật Phẩm Khác', otherItems);

    return { embeds: [embed] };
}

function handleSellAll(user) {
    const inv = db.getInventory(user.id, guildId);
    let total = 0; let count = 0;
    for (const i of inv) {
      if (!SHOP_ITEMS[i.item]) {
        const price = (PRICES[i.item] || 5) * i.amount;
        total += price; count += i.amount;
      }
    }
    if (total === 0) return { content: 'Túi đồ của bạn không có gì để bán!' };
    db.removeAllItems(user.id, guildId, Object.keys(SHOP_ITEMS));
    db.addBalance(user.id, guildId, total);
    return { content: `💸 Bạn đã dọn sạch túi đồ: bán **${count} vật phẩm rác** và thu về **${total.toLocaleString('en-US')} JC**!` };
}

function handleDaily(user) {
    const lastClaim = db.getDailyTime(user.id, guildId);
    let streak = db.getDailyStreak(user.id, guildId);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours
    const breakTime = 48 * 60 * 60 * 1000; // 48 hours to break streak

    if (lastClaim > 0 && now - lastClaim < cooldown) {
        const timeLeft = cooldown - (now - lastClaim);
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return { content: `⏳ Bạn đã nhận điểm danh rồi! Hãy quay lại sau **${hours} giờ ${mins} phút** nữa nhé.\n🔥 Chuỗi hiện tại: **${streak} ngày**` };
    }

    if (lastClaim > 0 && now - lastClaim > breakTime) {
        streak = 1; // Broken streak
    } else if (lastClaim > 0) {
        streak += 1;
    } else {
        streak = 1;
    }

    // Base 50k, +10k per streak day (cap at 7 days)
    const effectiveStreak = Math.min(streak, 7);
    const reward = 50000 + (effectiveStreak - 1) * 10000;
    
    db.addBalance(user.id, guildId, reward);
    db.setDailyTime(user.id, guildId, now, streak);
    
    let msg = `🎁 Chúc mừng! Bạn đã điểm danh thành công và nhận được **${reward.toLocaleString('en-US')} JC**!`;
    if (streak > 1) {
        msg += `\n🔥 Bạn đang duy trì chuỗi **${streak} ngày** điểm danh liên tiếp!`;
        if (streak === 7) msg += `\n👑 Đạt mốc thưởng tối đa của chuỗi (110,000 JC/ngày)!`;
        else if (streak > 7) msg += `\n👑 Chuỗi cực dài, tiếp tục phát huy nhé!`;
    } else if (lastClaim > 0 && now - lastClaim > breakTime) {
        msg += `\n⚠️ Bạn đã bỏ lỡ 1 ngày nên chuỗi điểm danh đã bị reset về 1!`;
    }
    msg += `\n*(Hãy quay lại vào ngày mai để nhận tiếp nhé)*`;

    return { content: msg };
}

const JOBS = [
    { name: "dọn rác bãi biển", duration: 5, reward: 25000 },
    { name: "phát tờ rơi", duration: 10, reward: 55000 },
    { name: "rửa bát thuê", duration: 15, reward: 85000 },
    { name: "đi hát kẹo kéo", duration: 20, reward: 120000 },
    { name: "chạy xe ôm", duration: 30, reward: 200000 },
    { name: "bốc vác", duration: 40, reward: 300000 },
    { name: "đòi nợ thuê", duration: 45, reward: 380000 },
    { name: "code dạo", duration: 60, reward: 550000 },
    { name: "làm Sugar Baby", duration: 120, reward: 1500000 }
];

function handleWork(user) {
    const workData = db.getWorkTime(user.id, guildId);
    const lastWork = workData.time;
    const now = Date.now();
    let jobIndex = workData.jobIndex;
    
    // Check cooldown if they have claimed
    if (lastWork > 0 && jobIndex === -1) {
        const cooldownLeft = (lastWork + 5 * 60 * 1000) - now;
        if (cooldownLeft > 0) {
            const mins = Math.floor(cooldownLeft / 60000);
            const secs = Math.floor((cooldownLeft % 60000) / 1000);
            return { content: `🥵 Bạn vừa tan ca xong, đang rất mệt! Hãy nghỉ ngơi thêm **${mins} phút ${secs} giây** nữa rồi mới đi xin việc tiếp nhé.` };
        }
    }

    if (lastWork === 0 || (lastWork > 0 && jobIndex === -1)) {
        const newJobIndex = Math.floor(Math.random() * JOBS.length);
        const job = JOBS[newJobIndex];
        db.setWorkTime(user.id, guildId, now, newJobIndex);
        return { content: `⏱️ Bạn đã xách ba lô lên và đi **${job.name}**! Công việc này cần đúng **${job.duration} phút** để hoàn thành và nhận **${job.reward.toLocaleString('en-US')} JC**. Khi nào làm xong thì gõ \`${PREFIX}claim\` nhé.` };
    }

    if (jobIndex === -1) jobIndex = 0; // Fallback
    const job = JOBS[jobIndex] || JOBS[0];
    
    const diffMins = (now - lastWork) / 60000;
    let timeLeft = job.duration - diffMins;
    if (timeLeft <= 0) {
        return { content: `✅ Bạn đã hoàn thành công việc **${job.name}**! Hãy gõ \`${PREFIX}claim\` ngay để nhận lương nhé!` };
    }
    
    return { content: `⚠️ Bạn đang đi **${job.name}** rồi! Đã trôi qua **${diffMins.toFixed(1)} phút**. Còn lại: **${timeLeft.toFixed(1)} phút**. Phải làm xong mới được nhận lương!` };
}

function handleClaim(user) {
    const workData = db.getWorkTime(user.id, guildId);
    const lastWork = workData.time;
    const now = Date.now();
    let jobIndex = workData.jobIndex;
    
    if (lastWork === 0 || (lastWork > 0 && jobIndex === -1)) {
        return { content: `❌ Bạn đang thất nghiệp mà đòi nhận lương gì? Gõ \`${PREFIX}work\` để đi xin việc trước đã!` };
    }

    if (jobIndex === -1) jobIndex = 0; // Fallback
    const job = JOBS[jobIndex] || JOBS[0];

    const diffMins = (now - lastWork) / 60000;

    if (diffMins < job.duration) {
        return { content: `⏳ Công việc **${job.name}** yêu cầu làm đủ **${job.duration} phút**, nhưng bạn mới làm được ${(diffMins).toFixed(1)} phút. Sếp chưa cho nhận lương đâu, hãy quay lại sau!` };
    }

    const earned = job.reward;
    db.addBalance(user.id, guildId, earned);
    db.setWorkTime(user.id, guildId, now, -1); // Bắt đầu tính hồi chiêu 5 phút từ bây giờ

    return { content: `💵 Bạn đã đi **${job.name}** cật lực trong **${job.duration} phút** và được trả công **${earned.toLocaleString('en-US')} JC**!\n*(Bạn đã tan ca! Vui lòng nghỉ ngơi 5 phút trước khi bắt đầu ca làm mới nhé)*` };
}

// handleDaily đã được định nghĩa đầy đủ với streak ở trên (dòng ~1252), bỏ bản trùng này

const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function createDeck() {
    let deck = [];
    for (let s of SUITS) {
        for (let r of RANKS) {
            deck.push({ suit: s, rank: r });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        if (['J', 'Q', 'K'].includes(card.rank)) score += 10;
        else if (card.rank === 'A') { score += 11; aces += 1; }
        else score += parseInt(card.rank);
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }
    return score;
}

function formatHand(hand, hideFirst = false) {
    if (hideFirst) {
        return `[?] ` + hand.slice(1).map(c => `${c.rank}${c.suit}`).join(' ');
    }
    return hand.map(c => `${c.rank}${c.suit}`).join(' ');
}

async function handleBlackjack(isSlash, ctx, user, amountStr) {
    if (!amountStr) return await (isSlash ? ctx.reply({ content: `Vui lòng nhập tiền cược! \`${PREFIX}bj <tiền>\``, ephemeral: true }) : ctx.reply(`Vui lòng nhập tiền cược! \`${PREFIX}bj <tiền>\``));

    let amount = 0;
    const userData = db.getUser(user.id, guildId);
    if (amountStr.toLowerCase() === 'all') amount = Math.min(userData.balance, 250000);
    else amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) return await (isSlash ? ctx.reply({ content: 'Số tiền cược không hợp lệ!', ephemeral: true }) : ctx.reply('Số tiền cược không hợp lệ!'));
    if (amount > 250000) return await (isSlash ? ctx.reply({ content: 'Cược tối đa là **250,000 G** một ván!', ephemeral: true }) : ctx.reply('Cược tối đa là **250,000 G** một ván!'));
    if (userData.balance < amount) return await (isSlash ? ctx.reply({ content: `Bạn không đủ tiền! Trong ví chỉ có **${userData.balance.toLocaleString()} G**.`, ephemeral: true }) : ctx.reply(`Bạn không đủ tiền! Trong ví chỉ có **${userData.balance.toLocaleString()} G**.`));

    db.addBalance(user.id, guildId, -amount);
    
    let deck = createDeck();
    let playerHand = [deck.pop(), deck.pop()];
    let dealerHand = [deck.pop(), deck.pop()];

    const userBuff = db.getCasinoBuff(user.id, guildId);
    if (userBuff.winRate > 0 && Math.random() * 100 < userBuff.winRate) {
        // Force player win with 21 and dealer 15
        playerHand = [{ suit: '♠', rank: 'A' }, { suit: '♥', rank: 'K' }];
        dealerHand = [{ suit: '♣', rank: '7' }, { suit: '♦', rank: '8' }];
    }

    const renderGame = (isOver = false) => {
        let pScore = calculateScore(playerHand);
        let dScore = calculateScore(dealerHand);
        let dDisplayScore = isOver ? dScore : calculateScore([dealerHand[1]]);
        
        let embed = new EmbedBuilder()
            .setColor(isOver ? (pScore > 21 || (pScore < dScore && dScore <= 21) ? '#ff0000' : (pScore === dScore ? '#aaaaaa' : '#00ff00')) : '#0099ff')
            .setTitle(`🃏 Blackjack (Cược: ${amount.toLocaleString()} G)`)
            .addFields(
                { name: `Bài của Nhà Cái (Điểm: ${isOver ? dScore : '?'})`, value: formatHand(dealerHand, !isOver) },
                { name: `Bài của Bạn (Điểm: ${pScore})`, value: formatHand(playerHand, false) }
            );
        return embed;
    };

    let pScore = calculateScore(playerHand);
    let dScore = calculateScore(dealerHand);

    if (pScore === 21 || dScore === 21) {
        let embed = renderGame(true);
        let msgStr = '';
        if (pScore === 21 && dScore !== 21) {
            let winAmount = Math.floor(amount * 2.5);
            db.addBalance(user.id, guildId, winAmount);
            msgStr = `🎉 **BLACKJACK!** Bạn nhận được **${(winAmount - amount).toLocaleString()} JC**!`;
        } else if (pScore === 21 && dScore === 21) {
            db.addBalance(user.id, guildId, amount);
            msgStr = `🤝 **HÒA!** Cả hai đều có Blackjack. Trả lại tiền cược.`;
        } else {
            msgStr = `💀 Nhà cái có Blackjack! Bạn mất **${amount.toLocaleString()} JC**!`;
        }
        return await (isSlash ? ctx.reply({ content: msgStr, embeds: [embed] }) : ctx.reply({ content: msgStr, embeds: [embed] }));
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hit').setLabel('Rút Bài').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('stand').setLabel('Dằn Bài').setStyle(ButtonStyle.Danger)
    );

    let msg;
    const sendOptions = { content: `Tới lượt của bạn, <@${user.id}>! Bấm nút bên dưới để chơi.`, embeds: [renderGame(false)], components: [row] };
    if (isSlash) msg = await ctx.reply({ ...sendOptions, fetchReply: true });
    else msg = await ctx.reply(sendOptions);

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== user.id) return i.reply({ content: 'Đây không phải ván bài của bạn!', ephemeral: true });
        
        await i.deferUpdate();

        if (i.customId === 'hit') {
            playerHand.push(deck.pop());
            if (calculateScore(playerHand) > 21) {
                collector.stop('bust');
            } else if (calculateScore(playerHand) === 21) {
                collector.stop('stand');
            } else {
                await msg.edit({ embeds: [renderGame(false)], components: [row] });
            }
        } else if (i.customId === 'stand') {
            collector.stop('stand');
        }
    });

    collector.on('end', async (collected, reason) => {
        let pFinal = calculateScore(playerHand);
        let msgStr = '';

        if (reason === 'bust') {
            msgStr = `💥 **QUẮC!** Bạn đã vượt quá 21 điểm. Mất trắng **${amount.toLocaleString()} JC**!`;
            await msg.edit({ content: msgStr, embeds: [renderGame(true)], components: [] }).catch(() => {});
            return;
        }

        if (reason === 'time') {
            msgStr = `⏳ Hết thời gian! Bạn tự động dằn bài.`;
        }

        let dFinal = calculateScore(dealerHand);
        while (dFinal < 17) {
            dealerHand.push(deck.pop());
            dFinal = calculateScore(dealerHand);
        }

        if (dFinal > 21 || pFinal > dFinal) {
            let payoutMult = 2;
            let displayPayout = 2;
            if (userBuff && userBuff.payout > 0) {
                payoutMult = userBuff.payout;
                displayPayout = userBuff.payout;
            }
            let winAmount = Math.floor(amount * payoutMult);
            let profit = winAmount - amount;
            db.addBalance(user.id, guildId, winAmount);
            msgStr += `\n🎉 **THẮNG!** Bạn ăn được **${profit.toLocaleString()} JC** (Tỷ lệ x${displayPayout})!`;
        } else if (pFinal < dFinal) {
            msgStr += `\n💀 **THUA!** Bạn mất **${amount.toLocaleString()} JC**!`;
        } else {
            db.addBalance(user.id, guildId, amount);
            msgStr += `\n🤝 **HÒA!** Trả lại tiền cược.`;
        }

        await msg.edit({ content: msgStr, embeds: [renderGame(true)], components: [] }).catch(() => {});
    });
}

async function doTaiXiuAnimation(isSlash, ctx, user, choice, amountStr) {
    if (!choice || !amountStr) {
        return await (isSlash ? ctx.reply({ content: `Vui lòng nhập đầy đủ: \`${PREFIX}tx <tài/xỉu> <tiền cược>\``, ephemeral: true }) : ctx.reply(`Vui lòng nhập đầy đủ: \`${PREFIX}tx <tài/xỉu> <tiền cược>\``));
    }

    let amount = 0;
    const userData = db.getUser(user.id, guildId);
    if (amountStr.toLowerCase() === 'all') {
        amount = Math.min(userData.balance, 250000);
    } else {
        amount = parseInt(amountStr);
    }

    // Error checks
    if (isNaN(amount) || amount <= 0) return await (isSlash ? ctx.reply({ content: 'Số tiền cược không hợp lệ!', ephemeral: true }) : ctx.reply('Số tiền cược không hợp lệ!'));
    if (amount > 250000) return await (isSlash ? ctx.reply({ content: 'Cược tối đa là **250,000 G** một ván!', ephemeral: true }) : ctx.reply('Cược tối đa là **250,000 G** một ván!'));
    if (userData.balance < amount) return await (isSlash ? ctx.reply({ content: `Bạn không đủ tiền! Trong ví chỉ có **${userData.balance} G**.`, ephemeral: true }) : ctx.reply(`Bạn không đủ tiền! Trong ví chỉ có **${userData.balance} G**.`));

    choice = choice.toLowerCase();
    if (choice !== 'tài' && choice !== 'tai' && choice !== 't' && choice !== 'xỉu' && choice !== 'xiu' && choice !== 'x') {
        return await (isSlash ? ctx.reply({ content: 'Hãy chọn `tài` (t) hoặc `xỉu` (x)!', ephemeral: true }) : ctx.reply('Hãy chọn `tài` (t) hoặc `xỉu` (x)!'));
    }
    const isTai = choice === 'tài' || choice === 'tai' || choice === 't';
    const choiceName = isTai ? 'TÀI' : 'XỈU';

    // Start animation
    let msg;
    if (isSlash) {
        await ctx.reply("🎲 Cốc cốc cốc... Đang lắc xúc xắc trong bát! ⏳");
    } else {
        msg = await ctx.reply("🎲 Cốc cốc cốc... Đang lắc xúc xắc trong bát! ⏳");
    }

    const editMsg = async (text) => {
        if (isSlash) await ctx.editReply(text);
        else await msg.edit(text);
    };

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let dice1 = Math.floor(Math.random() * 6) + 1;
    let dice2 = Math.floor(Math.random() * 6) + 1;
    let dice3 = Math.floor(Math.random() * 6) + 1;

    const userBuff = db.getCasinoBuff(user.id, guildId);
    if (userBuff.winRate > 0 && Math.random() * 100 < userBuff.winRate) {
        if (isTai) {
            while (dice1 + dice2 + dice3 < 11) {
                dice1 = Math.floor(Math.random() * 6) + 1; dice2 = Math.floor(Math.random() * 6) + 1; dice3 = Math.floor(Math.random() * 6) + 1;
            }
        } else {
            while (dice1 + dice2 + dice3 > 10) {
                dice1 = Math.floor(Math.random() * 6) + 1; dice2 = Math.floor(Math.random() * 6) + 1; dice3 = Math.floor(Math.random() * 6) + 1;
            }
        }
    }

    const sum = dice1 + dice2 + dice3;

    await wait(1500);
    await editMsg(`🎲 Lộ diện viên đầu tiên: **${DICE_EMOJIS[dice1-1]}**`);
    
    await wait(1500);
    await editMsg(`🎲 Viên đầu tiên: **${DICE_EMOJIS[dice1-1]}** | Viên thứ hai: **${DICE_EMOJIS[dice2-1]}**`);

    await wait(1500);

    let result = '';
    let win = false;
    if (sum >= 11 && sum <= 18) {
        result = 'TÀI';
        win = isTai;
    } else {
        result = 'XỈU';
        win = !isTai;
    }

    let finalMsg = `🎲 Lắc xúc xắc: **${DICE_EMOJIS[dice1-1]} ${DICE_EMOJIS[dice2-1]} ${DICE_EMOJIS[dice3-1]}** ( Điểm: **${sum}** )\n👉 Kết quả: **${result}**\n\n`;

    if (win) {
        let payoutMult = 0.95;
        let displayPayout = 1.95;
        if (userBuff && userBuff.payout > 0) {
            payoutMult = userBuff.payout - 1;
            displayPayout = userBuff.payout;
        }
        const profit = Math.floor(amount * payoutMult);
        db.addBalance(user.id, guildId, profit);
        finalMsg += `🎉 Xin chúc mừng! Bạn cược **${choiceName}** và nhận được **${profit} JC** tiền lời (Tỷ lệ x${displayPayout})!`;
    } else {
        db.addBalance(user.id, guildId, -amount);
        finalMsg += `💀 Rất tiếc! Bạn cược **${choiceName}** và đã mất sạch **${amount} JC**. Ra đê ở rồi!`;
    }

    await editMsg(finalMsg);
}

async function doChanLeAnimation(isSlash, ctx, user, choice, amountStr) {
    if (!choice || !amountStr) {
        return await (isSlash ? ctx.reply({ content: `Vui lòng nhập đầy đủ: \`${PREFIX}cl <chẵn/lẻ> <tiền cược>\``, ephemeral: true }) : ctx.reply(`Vui lòng nhập đầy đủ: \`${PREFIX}cl <chẵn/lẻ> <tiền cược>\``));
    }

    let amount = 0;
    const userData = db.getUser(user.id, guildId);
    if (amountStr.toLowerCase() === 'all') {
        amount = Math.min(userData.balance, 250000);
    } else {
        amount = parseInt(amountStr);
    }

    // Error checks
    if (isNaN(amount) || amount <= 0) return await (isSlash ? ctx.reply({ content: 'Số tiền cược không hợp lệ!', ephemeral: true }) : ctx.reply('Số tiền cược không hợp lệ!'));
    if (amount > 250000) return await (isSlash ? ctx.reply({ content: 'Cược tối đa là **250,000 G** một ván!', ephemeral: true }) : ctx.reply('Cược tối đa là **250,000 G** một ván!'));
    if (userData.balance < amount) return await (isSlash ? ctx.reply({ content: `Bạn không đủ tiền! Trong ví chỉ có **${userData.balance} G**.`, ephemeral: true }) : ctx.reply(`Bạn không đủ tiền! Trong ví chỉ có **${userData.balance} G**.`));

    choice = choice.toLowerCase();
    if (choice !== 'chẵn' && choice !== 'chan' && choice !== 'c' && choice !== 'lẻ' && choice !== 'le' && choice !== 'l') {
        return await (isSlash ? ctx.reply({ content: 'Hãy chọn `chẵn` (c) hoặc `lẻ` (l)!', ephemeral: true }) : ctx.reply('Hãy chọn `chẵn` (c) hoặc `lẻ` (l)!'));
    }
    const isChan = choice === 'chẵn' || choice === 'chan' || choice === 'c';
    const choiceName = isChan ? 'CHẴN' : 'LẺ';

    // Start animation
    let msg;
    if (isSlash) {
        await ctx.reply("🎲 Cốc cốc cốc... Đang lắc xúc xắc trong bát! ⏳");
    } else {
        msg = await ctx.reply("🎲 Cốc cốc cốc... Đang lắc xúc xắc trong bát! ⏳");
    }

    const editMsg = async (text) => {
        if (isSlash) await ctx.editReply(text);
        else await msg.edit(text);
    };

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let dice1 = Math.floor(Math.random() * 6) + 1;
    let dice2 = Math.floor(Math.random() * 6) + 1;
    let dice3 = Math.floor(Math.random() * 6) + 1;

    const userBuff = db.getCasinoBuff(user.id, guildId);
    if (userBuff.winRate > 0 && Math.random() * 100 < userBuff.winRate) {
        if (isChan) {
            while ((dice1 + dice2 + dice3) % 2 !== 0) {
                dice1 = Math.floor(Math.random() * 6) + 1; dice2 = Math.floor(Math.random() * 6) + 1; dice3 = Math.floor(Math.random() * 6) + 1;
            }
        } else {
            while ((dice1 + dice2 + dice3) % 2 === 0) {
                dice1 = Math.floor(Math.random() * 6) + 1; dice2 = Math.floor(Math.random() * 6) + 1; dice3 = Math.floor(Math.random() * 6) + 1;
            }
        }
    }

    const sum = dice1 + dice2 + dice3;

    await wait(1500);
    await editMsg(`🎲 Lộ diện viên đầu tiên: **${DICE_EMOJIS[dice1-1]}**`);
    
    await wait(1500);
    await editMsg(`🎲 Viên đầu tiên: **${DICE_EMOJIS[dice1-1]}** | Viên thứ hai: **${DICE_EMOJIS[dice2-1]}**`);

    await wait(1500);

    let result = '';
    let win = false;
    if (sum % 2 === 0) {
        result = 'CHẴN';
        win = isChan;
    } else {
        result = 'LẺ';
        win = !isChan;
    }

    let finalMsg = `🎲 Lắc xúc xắc: **${DICE_EMOJIS[dice1-1]} ${DICE_EMOJIS[dice2-1]} ${DICE_EMOJIS[dice3-1]}** ( Điểm: **${sum}** )\n👉 Kết quả: **${result}**\n\n`;

    if (win) {
        let payoutMult = 1.95;
        let profit = Math.floor(amount * payoutMult);
        let displayPayout = 1.95;
        if (userBuff && userBuff.payout > 0) {
            payoutMult = userBuff.payout;
            displayPayout = userBuff.payout;
            profit = Math.floor(amount * payoutMult);
        }
        // Tiền đã bị trừ trước rồi, chỉ trả lại tiền thắng
        db.addBalance(user.id, guildId, profit);
        const netProfit = profit - amount;
        finalMsg += `🎉 Xin chúc mừng! Bạn cược **${choiceName}** và nhận được **${netProfit.toLocaleString()} JC** tiền lời (Tỷ lệ x${displayPayout})!`;
    } else {
        // Tiền đã bị trừ trước rồi khi bắt đầu animation, không trừ lại
        finalMsg += `💀 Rất tiếc! Bạn cược **${choiceName}** và đã mất sạch **${amount.toLocaleString()} JC**. Ra đê ở rồi!`;
    }

    await editMsg(finalMsg);
}

function handleHunt(user) {
    const cdKey = `hunt_${user.id}`;
    if (cooldowns.has(cdKey) && Date.now() < cooldowns.get(cdKey)) {
        return { content: `Hãy đợi thêm ${((cooldowns.get(cdKey) - Date.now()) / 1000).toFixed(1)}s!`, ephemeral: true };
    }

    if (db.getItemAmount(user.id, guildId, 'Bóng Bắt Pet') < 1) {
        return { content: `🔴 Bạn không có **Bóng Bắt Pet**! Hãy vào shop để mua.`, ephemeral: true };
    }
    db.removeItem(user.id, guildId, 'Bóng Bắt Pet', 1);
    cooldowns.set(cdKey, Date.now() + 5000); 

    const r = Math.random();
    let cumulative = 0;
    let chosenRarity = PET_RARITIES[0];
    for (const rarity of PET_RARITIES) {
        cumulative += rarity.prob;
        if (r < cumulative) {
            chosenRarity = rarity;
            break;
        }
    }

    const speciesList = PET_SPECIES[chosenRarity.name];
    const species = speciesList[Math.floor(Math.random() * speciesList.length)];
    
    const hp = Math.floor(Math.random() * (chosenRarity.maxHp - chosenRarity.minHp + 1)) + chosenRarity.minHp;
    const atk = Math.floor(Math.random() * (chosenRarity.maxAtk - chosenRarity.minAtk + 1)) + chosenRarity.minAtk;

    const petId = db.addPet(user.id, guildId, species, chosenRarity.name, hp, atk);

    let emoji = '🐕';
    if (chosenRarity.name === 'Hiếm') emoji = '✨';
    else if (chosenRarity.name === 'Siêu Hiếm') emoji = '🌟';
    else if (chosenRarity.name === 'Thần Thoại') emoji = '🔥';
    else if (chosenRarity.name === 'Truyền Thuyết') emoji = '👑';

    return { content: `🔴 Đã ném Bóng Bắt Pet... 1... 2... 3... BẮT ĐƯỢC RỒI!\n${emoji} Bạn vừa thu phục thành công **${species}** (${chosenRarity.name})!\n- Mã Pet: **#${petId}**\n- HP: **${hp}** | ATK: **${atk}**\n*(Dùng lệnh \`${PREFIX}pets\` để xem và \`${PREFIX}pb <Mã Pet>\` để đem đi đánh nhau)*` };
}

function handlePetsUI(user) {
    const pets = db.getPets(user.id, guildId);
    if (!pets || pets.length === 0) {
        const embed = new EmbedBuilder().setColor('#e74c3c').setTitle(`🐾 Trang trại Pet của ${user.username}`).setDescription('Bạn chưa có con Pet nào cả! Hãy đi săn để thu thập thêm.');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pet_hunt_btn').setLabel('Bắt Pet Ngẫu Nhiên').setStyle(ButtonStyle.Success).setEmoji('🐾')
        );
        return { embeds: [embed], components: [row] };
    }

    const ownedRarities = new Set(pets.map(p => p.rarity));
    const strongest = pets.sort((a,b) => (b.hp+b.attack) - (a.hp+a.attack))[0];
    
    const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle(`${EMOJIS.pet} Vườn Thú Legend Main của ${user.username}`)
        .setDescription(`Bạn đang sở hữu **${pets.length}** Thú Cưng.\n🔥 Pet ưu tú nhất: **${strongest.species}** (${strongest.rarity}) - Lv ${strongest.level}\n\nHãy chọn một **Độ Hiếm** bên dưới để xem danh sách Pet tương ứng.`)
        .setImage('attachment://pets.png');

    const selectOptions = [];
    for (const r of PET_RARITIES) {
        if (ownedRarities.has(r.name)) {
            let emojiStr = '🐕';
            if (r.name === 'Hiếm') emojiStr = '✨';
            else if (r.name === 'Siêu Hiếm') emojiStr = '🌟';
            else if (r.name === 'Thần Thoại') emojiStr = '🔥';
            else if (r.name === 'Truyền Thuyết') emojiStr = '👑';
            
            selectOptions.push({
                label: r.name,
                description: `Danh sách Thú Cưng hạng ${r.name}`,
                value: `rarity_${r.name}`,
                emoji: emojiStr
            });
        }
    }
    
    const select = new StringSelectMenuBuilder()
        .setCustomId('pet_rarity_select')
        .setPlaceholder('Lọc Pet theo độ hiếm...')
        .addOptions(selectOptions);

    const row1 = new ActionRowBuilder().addComponents(select);
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pet_hunt_btn').setLabel('Săn Pet Mới').setStyle(ButtonStyle.Success).setEmoji(EMOJIS.pet)
    );

    const attachment = new AttachmentBuilder('./images/pets.png');
    return { embeds: [embed], components: [row1, row2], files: [attachment] };
}

function handlePetShop(user) {
    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`🏪 Chợ đen Thú Cưng (Mua Pet Trực Tiếp)`)
        .setDescription(`Chào mừng đại gia **${user.username}**!\nBạn không thích săn bắt hên xui? Hãy dùng tiền giải quyết mọi vấn đề!\n\nChọn một loại Pet bên dưới để mua thẳng:`)
        .addFields(
            { name: '📦 Pet Thường', value: `Giá: **50,000 G**\n*Random 1 bé Chó, Mèo...*`, inline: true },
            { name: '✨ Pet Hiếm', value: `Giá: **300,000 G**\n*Random Husky, Cáo đỏ...*`, inline: true },
            { name: '🌟 Pet Siêu Hiếm', value: `Giá: **1,500,000 G**\n*Random Hổ, Báo, Sói...*`, inline: false },
            { name: '🔥 Pet Thần Thoại', value: `Giá: **10,000,000 G**\n*Random Kỳ Lân, Phượng Hoàng...*`, inline: true },
            { name: '👑 Pet Truyền Thuyết', value: `Giá: **100,000,000 G**\n*Sức mạnh tối thượng của Rồng Thần...*`, inline: true }
        );

    const selectOptions = [];
    for (const r of PET_RARITIES) {
        let emojiStr = '📦';
        if (r.name === 'Hiếm') emojiStr = '✨';
        else if (r.name === 'Siêu Hiếm') emojiStr = '🌟';
        else if (r.name === 'Thần Thoại') emojiStr = '🔥';
        else if (r.name === 'Truyền Thuyết') emojiStr = '👑';
        
        selectOptions.push({
            label: `Mua Pet ${r.name}`,
            description: `Giá: ${PET_BUY_PRICES[r.name].toLocaleString()} JC`,
            value: `buy_pet_${r.name}`,
            emoji: emojiStr
        });
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('buy_pet_select')
        .setPlaceholder('Chọn độ hiếm Pet muốn mua...')
        .addOptions(selectOptions);

    const row = new ActionRowBuilder().addComponents(select);
    return { embeds: [embed], components: [row] };
}

async function processPetBuy(isSlash, ctx, user, rarityName) {
    const price = PET_BUY_PRICES[rarityName];
    if (!price) return await (isSlash ? ctx.reply({ content: 'Độ hiếm không hợp lệ!', ephemeral: true }) : ctx.reply('Độ hiếm không hợp lệ!'));
    
    const userData = db.getUser(user.id, guildId);
    if (userData.balance < price) {
        return await (isSlash ? ctx.reply({ content: `Bạn không đủ tiền! Cần **${price.toLocaleString()} JC** để mua Pet **${rarityName}**.`, ephemeral: true }) : ctx.reply(`Bạn không đủ tiền! Cần **${price.toLocaleString()} JC** để mua Pet **${rarityName}**.`));
    }

    const text = `⚠️ Bạn có chắc chắn muốn mua 1 bé Pet **${rarityName}** với giá **${price.toLocaleString()} JC** không?`;
    
    await requestConfirmation(ctx, user, text, () => {
        const currentData = db.getUser(user.id, guildId);
        if (currentData.balance < price) return `❌ Giao dịch thất bại! Bạn không đủ tiền!`;
        
        db.addBalance(user.id, guildId, -price);
        
        const rarityInfo = PET_RARITIES.find(r => r.name === rarityName);
        const speciesList = PET_SPECIES[rarityName];
        const species = speciesList[Math.floor(Math.random() * speciesList.length)];
        
        const hp = Math.floor(Math.random() * (rarityInfo.maxHp - rarityInfo.minHp + 1)) + rarityInfo.minHp;
        const atk = Math.floor(Math.random() * (rarityInfo.maxAtk - rarityInfo.minAtk + 1)) + rarityInfo.minAtk;
        
        const petId = db.addPet(user.id, guildId, species, rarityName, hp, atk);
        
        let emoji = '📦';
        if (rarityName === 'Hiếm') emoji = '✨';
        else if (rarityName === 'Siêu Hiếm') emoji = '🌟';
        else if (rarityName === 'Thần Thoại') emoji = '🔥';
        else if (rarityName === 'Truyền Thuyết') emoji = '👑';
        
        return `🎉 **Giao Dịch Thành Công!** 🎉\n${emoji} Bạn đã chi **${price.toLocaleString()} JC** và rước về một bé **${species}** (${rarityName}) cực chất!\n- Mã Pet: **#${petId}**\n- HP: **${hp}** | ATK: **${atk}**\n*(Dùng lệnh \`${PREFIX}pets\` để chiêm ngưỡng ngay!)*`;
    }, () => `❌ Đã hủy mua Pet.`, isSlash);
}

async function doPetSellConfirmation(isSlash, ctx, user, petIdStr) {
    const petId = parseInt(petIdStr);
    if (isNaN(petId)) return await (isSlash ? ctx.reply({ content: 'Mã Pet không hợp lệ!', ephemeral: true }) : ctx.reply('Mã Pet không hợp lệ!'));
    
    const pet = db.getPet(petId);
    if (!pet) return await (isSlash ? ctx.reply({ content: 'Không tìm thấy Pet này!', ephemeral: true }) : ctx.reply('Không tìm thấy Pet này!'));
    if (pet.user_id !== user.id) return await (isSlash ? ctx.reply({ content: 'Con Pet này không phải của bạn!', ephemeral: true }) : ctx.reply('Con Pet này không phải của bạn!'));

    const rarityInfo = PET_RARITIES.find(r => r.name === pet.rarity) || PET_RARITIES[0];
    const basePrice = Math.floor(Math.random() * (rarityInfo.priceMax - rarityInfo.priceMin + 1)) + rarityInfo.priceMin;
    const levelBonus = (pet.level - 1) * 0.1 * basePrice; // +10% price per level
    const sellPrice = Math.floor(basePrice + levelBonus);

    const text = `⚠️ Bạn có chắc chắn muốn bán **${pet.species}** (Lv ${pet.level} - ID: #${pet.id}) với giá **${sellPrice.toLocaleString()} JC** không? Hành động này không thể hoàn tác!`;
    
    await requestConfirmation(ctx, user, text, () => {
        const checkPet = db.getPet(petId);
        if (!checkPet || checkPet.user_id !== user.id) return `❌ Giao dịch thất bại!`;
        db.deletePet(petId);
        db.addBalance(user.id, guildId, sellPrice);
        return `💸 Bạn đã bán **${pet.species}** và thu về **${sellPrice.toLocaleString()} JC**!`;
    }, () => `❌ Đã hủy bán Pet.`, isSlash);
}

function handlePetBattle(user, petIdStr) {
    const cdKey = `petbattle_${user.id}`;
    if (cooldowns.has(cdKey) && Date.now() < cooldowns.get(cdKey)) {
        return { content: `Pet của bạn đang cần nghỉ ngơi! Hãy đợi thêm ${Math.ceil((cooldowns.get(cdKey) - Date.now()) / 60000)} phút nữa.`, ephemeral: true };
    }

    const petId = parseInt(petIdStr);
    if (isNaN(petId)) return { content: 'Mã Pet không hợp lệ!' };
    
    const pet = db.getPet(petId);
    if (!pet || pet.user_id !== user.id) return { content: 'Không tìm thấy Pet này hoặc nó không phải của bạn!' };

    // Set cooldown 5 phút
    cooldowns.set(cdKey, Date.now() + 5 * 60000);

    // Random enemy
    const enemyTemplate = ENEMY_BOTS[Math.floor(Math.random() * ENEMY_BOTS.length)];
    
    // Scale enemy to pet's level
    const baseEnemyHp = pet.hp * enemyTemplate.hpMult * (0.8 + Math.random() * 0.4);
    const baseEnemyAtk = pet.attack * enemyTemplate.atkMult * (0.8 + Math.random() * 0.4);
    
    const enemyHp = Math.floor(baseEnemyHp);
    const enemyAtk = Math.floor(baseEnemyAtk);

    let currentPetHp = pet.hp;
    let currentEnemyHp = enemyHp;
    let rounds = 0;
    
    // Simulate battle
    while (currentPetHp > 0 && currentEnemyHp > 0) {
        rounds++;
        currentEnemyHp -= pet.attack;
        if (currentEnemyHp > 0) {
            currentPetHp -= enemyAtk;
        }
        if (rounds > 100) break; // timeout safety
    }

    const win = currentPetHp > 0;
    let battleLog = `⚔️ **${pet.species} (Lv ${pet.level})** khiêu chiến với **${enemyTemplate.name}**!\n`;
    battleLog += `📊 Chỉ số địch: HP ${enemyHp} | ATK ${enemyAtk}\n\n`;
    
    if (win) {
        const expGained = Math.floor(enemyTemplate.expBase * (1 + (pet.level * 0.1)));
        const goldBase = pet.level * 5000 + pet.attack * 10;
        const goldGained = Math.floor(goldBase * enemyTemplate.goldMult * (0.8 + Math.random() * 0.4));
        
        db.addBalance(user.id, guildId, goldGained);
        
        let newExp = pet.exp + expGained;
        let newLevel = pet.level;
        let newHp = pet.hp;
        let newAtk = pet.attack;
        
        const expNeeded = pet.level * 100;
        let levelUpMsg = '';
        if (newExp >= expNeeded) {
            newLevel++;
            newExp -= expNeeded;
            const hpGain = Math.floor(pet.hp * 0.15);
            const atkGain = Math.floor(pet.attack * 0.15);
            newHp += hpGain;
            newAtk += atkGain;
            levelUpMsg = `\n🌟 **LEVEL UP!** Pet của bạn đã lên cấp **${newLevel}**! (HP +${hpGain}, ATK +${atkGain})`;
        }
        
        db.updatePet(pet.id, newLevel, newExp, newHp, newAtk);
        
        battleLog += `🎉 Trận đấu kết thúc sau **${rounds} hiệp**! Bạn giành **Chiến Thắng**! (Pet còn ${currentPetHp} HP)\n`;
        battleLog += `🎁 Phần thưởng: **${goldGained.toLocaleString()} JC** & **${expGained} EXP**${levelUpMsg}\n`;
        battleLog += `*(Vui lòng đợi 5 phút trước khi cho Pet đánh trận tiếp theo)*`;
        
        return { content: battleLog };
    } else {
        battleLog += `💀 Trận đấu kết thúc sau **${rounds} hiệp**! Pet của bạn bị đánh bại (Địch còn ${currentEnemyHp} HP).\n`;
        battleLog += `🚑 Hãy mang Pet đi nghỉ ngơi và thử lại sau!\n`;
        battleLog += `*(Vui lòng đợi 5 phút trước khi cho Pet đánh trận tiếp theo)*`;
        
        return { content: battleLog };
    }
}

function processAction(user, type, zoneName) {
    const cdKey = `${type}_${user.id}`;
    if (cooldowns.has(cdKey) && Date.now() < cooldowns.get(cdKey)) {
        return { content: `Hãy đợi thêm ${((cooldowns.get(cdKey) - Date.now()) / 1000).toFixed(1)}s!`, ephemeral: true };
    }
    const system = (type === 'fish') ? FISH_ZONES : MINE_ZONES;
    const zoneData = system[zoneName];
    if (!zoneData) return { content: 'Khu vực không hợp lệ!', ephemeral: true };
    if (db.getItemAmount(user.id, guildId, zoneData.req) < 1) return { content: `Bạn cần trang bị **${zoneData.req}** để vào khu vực này!`, ephemeral: true };

    if (type === 'fish') {
        if (db.getItemAmount(user.id, guildId, 'Mồi Câu') < 1) return { content: `🎣 Bạn không có **Mồi Câu**! Hãy vào shop để mua mồi trước khi đi câu.`, ephemeral: true };
        db.removeItem(user.id, guildId, 'Mồi Câu', 1);
    } else if (type === 'mine') {
        if (db.getItemAmount(user.id, guildId, 'Đèn Khai Khoáng') < 1) return { content: `⛏️ Hang động rất tối! Bạn cần mua **Đèn Khai Khoáng** trong shop để vào mỏ.`, ephemeral: true };
        db.removeItem(user.id, guildId, 'Đèn Khai Khoáng', 1);
    }

    db.setZonePreference(user.id, guildId, type, zoneName);

    cooldowns.set(cdKey, Date.now() + 2000); 
    const drop = getRandomDrop(zoneData.drops);
    db.addItem(user.id, guildId, drop, 1);
    const action = (type === 'fish') ? 'câu được' : 'đào được';
    const emoji = (type === 'fish') ? '🎣' : '⛏️';
    
    let extraMsg = '';
    if (type === 'fish') extraMsg = ` (Đã tiêu hao 1 Mồi Câu)`;
    if (type === 'mine') extraMsg = ` (Đã tiêu hao 1 Đèn Khai Khoáng)`;
    return { content: `${emoji} Bạn vừa ${action} **${drop}** tại ${zoneName}!${extraMsg}` };
}

function handleAction(user, type, explicitZone) {
    const system = (type === 'fish') ? FISH_ZONES : MINE_ZONES;
    const userData = db.getUser(user.id, guildId);
    
    if (explicitZone && explicitZone.toLowerCase() === 'menu') {
        explicitZone = null;
    } else if (!explicitZone) {
        const prefZone = type === 'fish' ? userData.last_fish_zone : userData.last_mine_zone;
        if (prefZone && system[prefZone] && db.getItemAmount(user.id, guildId, system[prefZone].req) > 0) {
            explicitZone = prefZone;
        }
    }
    
    if (!explicitZone) {
        const availableZones = [];
        for (const [zName, zData] of Object.entries(system)) {
            if (db.getItemAmount(user.id, guildId, zData.req) > 0) availableZones.push(zName);
        }
        
        if (availableZones.length === 0) return { content: `Bạn chưa có dụng cụ nào! Hãy gõ lệnh shop để mua.` };
        
        const actionText = type === 'fish' ? 'Câu Cá' : 'Khai Khoáng';
        const embed = new EmbedBuilder().setColor('#0099ff').setTitle(`🗺️ Chọn khu vực ${actionText}`).setDescription('Bạn muốn đi đến khu vực nào?');
        const select = new StringSelectMenuBuilder().setCustomId(`zone_select_${type}`).setPlaceholder('Chọn một khu vực...').addOptions(availableZones.map(z => ({
            label: z,
            description: `Yêu cầu: ${system[z].req}`,
            value: z
        })));
        const row = new ActionRowBuilder().addComponents(select);
        return { embeds: [embed], components: [row] };
    }

    return processAction(user, type, explicitZone);
}

async function requestConfirmation(ctx, user, text, onConfirm, onCancel, isSlash = false, targetUserId = null, extraOptions = {}) {
    const targetId = targetUserId || user.id;
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('confirm').setLabel('Đồng ý').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancel').setLabel('Từ chối').setStyle(ButtonStyle.Danger)
        );
        
    let msg;
    const sendOptions = { content: text, components: [row], ...extraOptions };
    if (isSlash) {
        msg = await ctx.reply({ ...sendOptions, fetchReply: true });
    } else {
        msg = await ctx.reply(sendOptions);
    }

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async i => {
        if (i.user.id !== targetId) {
            return i.reply({ content: 'Bạn không phải là người được hỏi!', ephemeral: true });
        }
        
        collector.stop('clicked');
        
        if (i.customId === 'confirm') {
            await i.deferUpdate();
            const resultText = onConfirm();
            await msg.edit({ content: resultText, components: [], files: [] });
        } else {
            await i.deferUpdate();
            const cancelText = onCancel ? onCancel() : '❌ Giao dịch đã bị hủy.';
            await msg.edit({ content: cancelText, components: [], files: [] });
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            msg.edit({ content: '⏳ Giao dịch đã hết hạn do không phản hồi.', components: [], files: [] }).catch(console.error);
        }
    });
}

function handleDeposit(user, amountStr) {
    if (!amountStr) return { content: `Vui lòng nhập số tiền muốn gửi!` };
    const userData = db.getUser(user.id, guildId);
    let amount = 0;
    if (amountStr.toLowerCase() === 'all') {
        amount = userData.balance;
    } else {
        amount = parseInt(amountStr);
    }
    if (isNaN(amount) || amount <= 0) return { content: 'Số tiền không hợp lệ!' };
    if (userData.balance < amount) return { content: `Bạn không đủ tiền mặt! Trong ví chỉ có **${userData.balance} G**.` };
    
    db.addBalance(user.id, guildId, -amount);
    db.addBankBalance(user.id, guildId, amount);
    return { content: `🏦 Bạn đã gửi thành công **${amount} G** vào ngân hàng!` };
}

function handleWithdraw(user, amountStr) {
    if (!amountStr) return { content: `Vui lòng nhập số tiền muốn rút!` };
    const userData = db.getUser(user.id, guildId);
    let amount = 0;
    const bankBal = userData.bank || 0;
    if (amountStr.toLowerCase() === 'all') {
        amount = bankBal;
    } else {
        amount = parseInt(amountStr);
    }
    if (isNaN(amount) || amount <= 0) return { content: 'Số tiền không hợp lệ!' };
    if (bankBal < amount) return { content: `Ngân hàng của bạn không đủ tiền! Số dư ngân hàng: **${bankBal} G**.` };
    
    db.addBankBalance(user.id, guildId, -amount);
    db.addBalance(user.id, guildId, amount);
    return { content: `💸 Bạn đã rút thành công **${amount} G** từ ngân hàng!` };
}

function handleBankUI(user) {
    const userData = db.getUser(user.id, guildId);
    const bankBal = userData.bank || 0;
    
    const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle(`${EMOJIS.bank} Ngân Hàng Legend Main`)
        .setDescription(`Xin chào **${user.username}**!\n*Tiền cất trong ngân hàng được bảo vệ 100% khỏi trộm cắp.*\n\n${EMOJIS.money} **Ví tiền:** ${userData.balance.toLocaleString()} G\n💳 **Số dư ngân hàng:** ${bankBal.toLocaleString()} G`)
        .setImage('attachment://bank.png')
        .setFooter({ text: 'Uy tín, An toàn, Nhanh chóng!' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bank_deposit_btn').setLabel('Gửi Tiền').setStyle(ButtonStyle.Success).setEmoji('📥'),
        new ButtonBuilder().setCustomId('bank_withdraw_btn').setLabel('Rút Tiền').setStyle(ButtonStyle.Danger).setEmoji('📤')
    );

    const attachment = new AttachmentBuilder('./images/bank.png');
    return { embeds: [embed], components: [row], files: [attachment] };
}

async function handleBuyRole(isSlash, ctx, member, user) {
    if (member.roles.cache.has(ROLE_FOR_SALE_ID)) {
        return { content: `Bạn đã sở hữu Role này rồi, không cần mua lại nữa!`, ephemeral: true };
    }

    const userData = db.getUser(user.id, guildId);
    if (userData.balance < ROLE_PRICE) {
        return { content: `Bạn không đủ tiền mặt! Cần **${ROLE_PRICE.toLocaleString('en-US')} G** để mua Role này.`, ephemeral: true };
    }

    const text = `⚠️ Bạn có chắc chắn muốn dùng **${ROLE_PRICE.toLocaleString('en-US')} JC** để mua Role VIP không?`;
    
    await requestConfirmation(ctx, user, text, () => {
        const currentData = db.getUser(user.id, guildId);
        if (currentData.balance < ROLE_PRICE) return `❌ Giao dịch thất bại! Bạn không đủ tiền!`;
        
        try {
            member.roles.add(ROLE_FOR_SALE_ID);
            db.addBalance(user.id, guildId, -ROLE_PRICE);
            return `🎉 Chúc mừng! Bạn đã mua thành công Role VIP với giá **${ROLE_PRICE.toLocaleString('en-US')} JC**!`;
        } catch (e) {
            console.error(e);
            return `❌ Có lỗi xảy ra khi cấp Role! Hãy báo cho Admin kiểm tra quyền hạn của Bot (Bot cần quyền Manage Roles và Role của Bot phải đứng trên Role muốn bán).`;
        }
    }, () => `❌ Đã hủy giao dịch mua Role.`, isSlash);
}

async function handleHenHo(isSlash, ctx, user, guild) {
    // Kiểm tra người dùng đã có người yêu chưa
    const existingRel = db.getRelationship(user.id, guildId);
    if (existingRel) {
        const partnerId = existingRel.user_id === user.id ? existingRel.partner_id : existingRel.user_id;
        const statusText = existingRel.status === 'married' ? 'đã kết hôn' : 'đã đính hôn';
        return await (isSlash ? ctx.reply({ content: `💘 Bạn ${statusText} với <@${partnerId}> rồi! Không được tìm kiếm người khác đâu nhé! 👀`, ephemeral: true }) : ctx.reply(`💘 Bạn ${statusText} với <@${partnerId}> rồi! Không được tìm kiếm người khác đâu nhé! 👀`));
    }

    // Kiểm tra cooldown hẹn hò
    const cdKey = `henho_${user.id}`;
    if (cooldowns.has(cdKey) && Date.now() < cooldowns.get(cdKey)) {
        const timeLeft = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 60000);
        return await (isSlash ? ctx.reply({ content: `💔 Ôi bạn vừa bị từ chối xong rồi... Hãy bình tĩnh lại và thử lại sau **${timeLeft} phút** nhé!`, ephemeral: true }) : ctx.reply(`💔 Ôi bạn vừa bị từ chối xong rồi... Hãy bình tĩnh lại và thử lại sau **${timeLeft} phút** nhé!`));
    }

    // Lấy danh sách thành viên server
    let members;
    try {
        members = await guild.members.fetch();
    } catch (e) {
        return await (isSlash ? ctx.reply({ content: 'Không thể lấy danh sách thành viên server!', ephemeral: true }) : ctx.reply('Không thể lấy danh sách thành viên server!'));
    }

    // Lọc những người độc thân, không phải bot, không phải bản thân
    const singles = members.filter(m => {
        if (m.user.bot || m.user.id === user.id) return false;
        const rel = db.getRelationship(m.user.id, guildId);
        return !rel;
    });

    if (singles.size === 0) {
        return await (isSlash ? ctx.reply({ content: '💔 Ôi không! Trên server này không còn ai độc thân nữa cả! Bạn cô đơn một mình thôi...', ephemeral: true }) : ctx.reply('💔 Ôi không! Trên server này không còn ai độc thân nữa cả! Bạn cô đơn một mình thôi...'));
    }

    // Random chọn một người
    const singlesArray = [...singles.values()];
    const targetMember = singlesArray[Math.floor(Math.random() * singlesArray.length)];
    const targetUser = targetMember.user;

    // Các tin nhắn tỏ tình ngẫu nhiên hài hước
    const loveMessages = [
        `💌 Bạn đã bắn tim vào **${targetUser.username}**! Không biết người ta có bắt được không ta? 🏹`,
        `🌹 **${user.username}** đang run rẩy cầm bó hoa hướng về phía **${targetUser.username}**...`,
        `💘 Số phận đã an bài! Bot đã chọn **${targetUser.username}** làm đối tượng ghép đôi với bạn!`,
        `🎯 Hôm nay là ngày định mệnh! **${targetUser.username}** đã bị "thả thính" bởi **${user.username}**!`,
        `🍀 Chúc may mắn! Bot tìm được **${targetUser.username}** - người độc thân tiếp theo trong server!`
    ];
    const randomMsg = loveMessages[Math.floor(Math.random() * loveMessages.length)];

    const embed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setTitle('💕 HẸN HÒ MÙ QUÁNG 💕')
        .setDescription(`${randomMsg}\n\n<@${targetUser.id}> ơi, <@${user.id}> muốn hẹn hò với bạn!\nBạn có **60 giây** để quyết định nhé! 💝`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Trả lời bằng nút bên dưới nhé!' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('henho_accept').setLabel('💖 Đồng ý!').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('henho_reject').setLabel('💔 Từ chối').setStyle(ButtonStyle.Danger)
    );

    let msg;
    if (isSlash) {
        msg = await ctx.reply({ embeds: [embed], components: [row], fetchReply: true });
    } else {
        msg = await ctx.reply({ embeds: [embed], components: [row] });
    }

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== targetUser.id) {
            return i.reply({ content: '❌ Bạn không phải người được hỏi trong cuộc hẹn hò này!', ephemeral: true });
        }

        collector.stop('clicked');

        if (i.customId === 'henho_accept') {
            await i.deferUpdate();
            // Kiểm tra lại xem cả 2 vẫn còn độc thân không
            const rel1 = db.getRelationship(user.id, guildId);
            const rel2 = db.getRelationship(targetUser.id, guildId);
            if (rel1 || rel2) {
                await msg.edit({ content: '⚠️ Có lỗi xảy ra! Một trong hai người đã có người khác mất rồi...', embeds: [], components: [] });
                return;
            }
            db.setRelationship(user.id, targetUser.id, guildId, 'married');
            const successEmbed = new EmbedBuilder()
                .setColor('#ff1493')
                .setTitle('🎉 GHÉP ĐÔI THÀNH CÔNG! 🎉')
                .setDescription(`💞 **CHÍNH THỨC RỒI!** 💞\n\n<@${user.id}> và <@${targetUser.id}> đã chính thức thành **đôi** trên server!\n\n🌹 Chúc hai bạn mãi mãi hạnh phúc bên nhau!\n💌 Hãy dùng lệnh \`${PREFIX}profile\` để xem tình trạng mới nhé!`)
                .setFooter({ text: 'Legend Main - Hẹn Hò Mù Quáng 💕' });
            await msg.edit({ embeds: [successEmbed], components: [] });
        } else {
            await i.deferUpdate();
            cooldowns.set(cdKey, Date.now() + 5 * 60000); // Phạt cooldown 5 phút nếu bị từ chối
            const rejectEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('💔 Bị Từ Chối Rồi...')
                .setDescription(`<@${targetUser.id}> đã từ chối lời hẹn hò của <@${user.id}>...\n\n😢 Đừng nản lòng! Hãy thử lại sau **5 phút** nhé!`);
            await msg.edit({ embeds: [rejectEmbed], components: [] });
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            cooldowns.set(cdKey, Date.now() + 5 * 60000);
            msg.edit({ content: `⏳ <@${targetUser.id}> đã không trả lời trong 60 giây... <@${user.id}> ơi, người ta chắc đang bận lắm! Thử lại sau **5 phút** nhé.`, embeds: [], components: [] }).catch(() => {});
        }
    });
}



async function handleGhepDoi(isSlash, ctx, user) {
    const guild = isSlash ? ctx.guild : ctx.guild;
    if (!guild) {
        const msg = { content: 'Bạn chỉ có thể tìm đối tượng ghép đôi trong Server!', ephemeral: true };
        return await (isSlash ? ctx.reply(msg) : ctx.reply(msg.content));
    }
    await guild.members.fetch();
    const validMembers = guild.members.cache.filter(m => 
        !m.user.bot && 
        m.user.id !== user.id && 
        !db.getRelationship(m.user.id, guildId)
    );
    if (validMembers.size === 0) {
        const msg = { content: 'Server hiện tại không còn ai độc thân để ghép đôi cả! 😢', ephemeral: true };
        return await (isSlash ? ctx.reply(msg) : ctx.reply(msg.content));
    }
    
    const targetUser = validMembers.random().user;
    const infoMsg = await ctx.channel.send(`💘 Hệ thống đang tìm kiếm một nửa cho <@${user.id}>...`);
    
    setTimeout(async () => {
        await infoMsg.delete().catch(()=>{});
        // Gọi lại hàm cầu hôn với target ngẫu nhiên
        await handleMarry(isSlash, ctx, user, targetUser, true);
    }, 2000);
}


async function handleMarry(isSlash, ctx, user, targetUser, isRandom = false) {

    if (!targetUser) return await (isSlash ? ctx.reply({ content: 'Bạn muốn cầu hôn không khí à? Hãy tag một người!', ephemeral: true }) : ctx.reply('Bạn muốn cầu hôn không khí à? Hãy tag một người!'));

    if (user.id === targetUser.id) return await (isSlash ? ctx.reply({ content: 'Bạn không thể tự kết hôn với chính mình!', ephemeral: true }) : ctx.reply('Bạn không thể tự kết hôn với chính mình!'));
    if (targetUser.bot) return await (isSlash ? ctx.reply({ content: 'Bạn không thể cưới bot!', ephemeral: true }) : ctx.reply('Bạn không thể cưới bot!'));

    const existingRel1 = db.getRelationship(user.id, guildId);
    if (existingRel1) return await (isSlash ? ctx.reply({ content: 'Bạn đã có người thương rồi, không được lăng nhăng!', ephemeral: true }) : ctx.reply('Bạn đã có người thương rồi, không được lăng nhăng!'));
    
    const existingRel2 = db.getRelationship(targetUser.id, guildId);
    if (existingRel2) return await (isSlash ? ctx.reply({ content: 'Người ấy đã thuộc về người khác rồi! 💔', ephemeral: true }) : ctx.reply('Người ấy đã thuộc về người khác rồi! 💔'));

    const rings = Object.entries(SHOP_ITEMS)
        .filter(([_, data]) => data.type === 'ring')
        .map(([name, data]) => ({ name, price: data.price }))
        .sort((a, b) => b.price - a.price);
        
    let bestRing = null;
    for (const ring of rings) {
        if (db.getItemAmount(user.id, guildId, ring.name) > 0) {
            bestRing = ring.name;
            break;
        }
    }

    if (!bestRing) return await (isSlash ? ctx.reply({ content: 'Bạn cần mua **Nhẫn Cưới** trong Shop trước khi đi cầu hôn nhé!', ephemeral: true }) : ctx.reply('Bạn cần mua **Nhẫn Cưới** trong Shop trước khi đi cầu hôn nhé!'));

    const text = `💍 **LỜI CẦU HÔN** 💍\n<@${targetUser.id}> ơi, <@${user.id}> đang quỳ gối trao chiếc **${bestRing}** và muốn hỏi cưới bạn! Bạn có đồng ý không?`;
    
    let attachment;
    try {
        let imgPath = './ring.png';
        if (bestRing === 'Nhẫn Bạc') imgPath = './images/nhan_bac.png';
        else if (bestRing === 'Nhẫn Vàng') imgPath = './images/nhan_vang.png';
        else if (bestRing === 'Nhẫn Bạch Kim') imgPath = './images/nhan_bach_kim.png';
        else if (bestRing === 'Nhẫn Kim Cương') imgPath = './images/nhan_kim_cuong.png';
        else if (bestRing === 'Nhẫn Kim Cương Vĩnh Cửu') imgPath = './images/nhan_kim_cuong_vinh_cuu.png';
        attachment = new AttachmentBuilder(imgPath);
    } catch(e) {}
    
    const extra = attachment ? { files: [attachment] } : {};
    
    await requestConfirmation(ctx, user, text, () => {
        const ringCheck = db.getItemAmount(user.id, guildId, bestRing);
        if (ringCheck < 1) return `❌ Giao dịch thất bại! Ai đó đã trộm mất Nhẫn Cưới!`;
        
        db.removeItem(user.id, guildId, bestRing, 1);
        db.setRelationship(user.id, targetUser.id, guildId, 'married');
        return `🎉 **CHÚC MỪNG HẠNH PHÚC!** 🎉\n<@${targetUser.id}> đã đồng ý! Toàn thể server xin chúc mừng đôi uyên ương <@${user.id}> và <@${targetUser.id}>! ❤️ Trăm năm hạnh phúc nhé!`;
    }, () => `💔 <@${targetUser.id}> đã phũ phàng từ chối lời cầu hôn của <@${user.id}>... Người buồn cảnh có vui đâu bao giờ.`, isSlash, targetUser.id, extra);
}

async function handleDivorce(isSlash, ctx, user, targetUser) {
    if (!targetUser) return await (isSlash ? ctx.reply({ content: 'Bạn muốn ly hôn với ai? Hãy tag họ!', ephemeral: true }) : ctx.reply('Bạn muốn ly hôn với ai? Hãy tag họ!'));

    const rel = db.getRelationship(user.id, guildId);
    if (!rel || (rel.partner_id !== targetUser.id && rel.user_id !== targetUser.id)) {
         return await (isSlash ? ctx.reply({ content: 'Hai người có phải là vợ chồng đâu mà đòi ly hôn!', ephemeral: true }) : ctx.reply('Hai người có phải là vợ chồng đâu mà đòi ly hôn!'));
    }

    const text = `💔 **YÊU CẦU LY HÔN** 💔\n<@${targetUser.id}> ơi, <@${user.id}> muốn đệ đơn ly hôn. Bạn có đồng ý ký đơn không?`;
    
    await requestConfirmation(ctx, user, text, () => {
        db.removeRelationship(user.id, guildId);
        return `🌩️ **ĐƯỜNG AI NẤY ĐI** 🌩️\n<@${targetUser.id}> đã ký đơn. Kể từ nay <@${user.id}> và <@${targetUser.id}> chính thức trở thành người dưng ngược lối.`;
    }, () => `❌ <@${targetUser.id}> không chịu ký đơn ly hôn! Hai người hãy bình tĩnh nói chuyện lại nhé.`, isSlash, targetUser.id);
}

async function handleAdminDivorce(isSlash, ctx, adminUser, targetUser) {
    const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);
    if (!checkAdmin(adminUser.id)) {
        const msg = { content: '🚫 Chỉ Admin mới có quyền cưỡng chế ly hôn!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    if (!targetUser) {
        const msg = { content: 'Vui lòng tag người trong cặp đôi muốn ly hôn!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const rel = db.getRelationship(targetUser.id, guildId);
    if (!rel) {
        const msg = { content: `❌ <@${targetUser.id}> hiện đang độc thân!`, ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const p1 = rel.user_id;
    const p2 = rel.partner_id;

    db.removeRelationship(targetUser.id, guildId);

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⚖️ Cưỡng Chế Ly Hôn Thành Công')
        .setDescription(`Admin <@${adminUser.id}> đã cưỡng chế ly hôn cặp đôi này!`)
        .addFields(
            { name: '👤 Người thứ nhất', value: `<@${p1}>`, inline: true },
            { name: '👤 Người thứ hai', value: `<@${p2}>`, inline: true }
        )
        .setTimestamp();

    return isSlash ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}


async function doGiveConfirmation(isSlash, ctx, user, targetUser, amountStr) {
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return await (isSlash ? ctx.reply({ content: 'Số tiền không hợp lệ! Hãy nhập một số dương.', ephemeral: true }) : ctx.reply('Số tiền không hợp lệ! Hãy nhập một số dương.'));
    if (!targetUser) return await (isSlash ? ctx.reply({ content: 'Không tìm thấy người nhận!', ephemeral: true }) : ctx.reply('Không tìm thấy người nhận!'));
    if (user.id === targetUser.id) return await (isSlash ? ctx.reply({ content: 'Bạn không thể tự chuyển tiền cho chính mình!', ephemeral: true }) : ctx.reply('Bạn không thể tự chuyển tiền cho chính mình!'));

    const senderData = db.getUser(user.id, guildId);
    if (senderData.balance < amount) return await (isSlash ? ctx.reply({ content: `Bạn không đủ tiền! Trong ví chỉ có **${senderData.balance} G**.`, ephemeral: true }) : ctx.reply(`Bạn không đủ tiền! Trong ví chỉ có **${senderData.balance} G**.`));

    const text = `⚠️ Bạn có chắc chắn muốn chuyển **${amount} JC** cho **${targetUser.username}** không?`;
    
    await requestConfirmation(ctx, user, text, () => {
        const currentSenderData = db.getUser(user.id, guildId);
        if (currentSenderData.balance < amount) return `❌ Giao dịch thất bại! Bạn không đủ tiền!`;
        db.addBalance(user.id, guildId, -amount);
        db.addBalance(targetUser.id, guildId, amount);
        return `💸 Bạn đã chuyển thành công **${amount} G** cho **${targetUser.username}**!`;
    }, () => `❌ Đã hủy chuyển tiền cho **${targetUser.username}**.`, isSlash);
}






function handleRobBank(user, targetUser) {
    if (!targetUser) return { content: 'Bạn định đi ăn trộm ngân hàng của ai? Hãy tag một người!' };
    if (user.id === targetUser.id) return { content: 'Bạn bị điên à mà tự đi cướp ngân hàng của chính mình?' };

    const cdKey = `robbank_${user.id}`;
    if (cooldowns.has(cdKey) && Date.now() < cooldowns.get(cdKey)) {
        return { content: `FBI đang truy nã! Hãy đợi thêm ${Math.ceil((cooldowns.get(cdKey) - Date.now()) / 60000)} phút nữa mới được đi cướp tiếp.` };
    }

    const attacker = db.getUser(user.id, guildId);
    const victim = db.getUser(targetUser.id, guildId);

    if (attacker.balance < 5000) return { content: 'Bạn cần có ít nhất **5,000 JC** để sắm vũ khí đi cướp ngân hàng!' };
    if (!victim.bank || victim.bank < 10000) return { content: 'Ngân hàng người ta nghèo rớt mồng tơi (dưới 10000 JC) cướp bõ bèn gì?' };

    if (targetUser.id === SUPER_ADMIN_ID) {
        const penaltyAmount = Math.floor(attacker.balance * 0.50);
        db.addBalance(user.id, guildId, -penaltyAmount);
        cooldowns.set(cdKey, Date.now() + 10 * 60000);
        return { content: `🚨 **ĐẠI HỌA: CƯỚP NHẦM TỔNG BỘ CỦA CHỦ SERVER!**\n<@${user.id}> dám kéo quân đi cướp Tổng Bộ Ngân Hàng của Chủ Server <@${targetUser.id}>?!\nCảnh sát cơ động đã tóm gọn bạn! Phạt tịch thu **${penaltyAmount.toLocaleString('en-US')} JC** (50% tài sản) và ngồi tù 10 phút!` };
    }
    
    if (db.isAdmin(targetUser.id)) {
        const penaltyAmount = Math.floor(attacker.balance * 0.50);
        db.addBalance(user.id, guildId, -penaltyAmount);
        cooldowns.set(cdKey, Date.now() + 10 * 60000);
        return { content: `🚨 **ĐẠI HỌA: CƯỚP NHẦM TỔNG BỘ!**\n<@${user.id}> dám kéo quân đi cướp Tổng Bộ Ngân Hàng của Admin <@${targetUser.id}>?!\nCảnh sát cơ động đã tóm gọn bạn! Phạt tịch thu **${penaltyAmount.toLocaleString('en-US')} JC** (50% tài sản) và ngồi tù 10 phút!` };
    }

    const victimShield = db.getShield(targetUser.id, guildId);
    if (Date.now() < victimShield) {
        return { content: `🛡️ Keng! Hệ thống két sắt của **${targetUser.username}** đang được bảo vệ bởi lớp khiên kiên cố. Cướp thất bại!` };
    }

    cooldowns.set(cdKey, Date.now() + 10 * 60000);
    const successRate = 0.25; 

    if (Math.random() < successRate) {
        const stealPercent = (Math.random() * (0.20 - 0.05) + 0.05);
        const stolenAmount = Math.floor(victim.bank * stealPercent);
        db.addBankBalance(targetUser.id, guildId, -stolenAmount);
        db.addBalance(user.id, guildId, stolenAmount);
        return { content: `🏦 Bùm! Bạn đã giật sập két sắt nhà **${targetUser.username}** và cuỗm mất **${stolenAmount.toLocaleString('en-US')} JC** từ ngân hàng!` };
    } else {
        const penaltyAmount = Math.floor(attacker.balance * 0.20);
        db.addBalance(user.id, guildId, -penaltyAmount);
        db.addBankBalance(targetUser.id, guildId, penaltyAmount);
        return { content: `🚔 Bíp Bíp! FBI open the door! Bạn bị tóm gọn khi đang cậy két nhà **${targetUser.username}**. Phạt **${penaltyAmount.toLocaleString('en-US')} JC**, chuyển thẳng vào két nạn nhân!` };
    }
}


function handleRob(user, targetUser) {
    if (!targetUser) return { content: 'Bạn định đi ăn trộm không khí à? Hãy tag một người!' };
    if (user.id === targetUser.id) return { content: 'Bạn bị điên à mà tự đi ăn trộm tiền của chính mình?' };

    const cdKey = `rob_${user.id}`;
    if (cooldowns.has(cdKey) && Date.now() < cooldowns.get(cdKey)) {
        return { content: `Cảnh sát đang đi tuần! Hãy đợi thêm ${Math.ceil((cooldowns.get(cdKey) - Date.now()) / 60000)} phút nữa mới được đi ăn trộm tiếp.` };
    }

    const attacker = db.getUser(user.id, guildId);
    const victim = db.getUser(targetUser.id, guildId);

    if (targetUser.id === SUPER_ADMIN_ID) {
        const penaltyAmount = Math.floor(attacker.balance * 0.30);
        db.addBalance(user.id, guildId, -penaltyAmount);
        cooldowns.set(cdKey, Date.now() + 5 * 60000);
        return { content: `🚨 **BÁO ĐỘNG ĐỎ: ĐỤNG NHẦM TỔ KIẾN LỬA!**\n<@${user.id}> dám cả gan cướp của Chủ Server <@${targetUser.id}>?!\nHệ thống an ninh đã giật điện khiến bạn mất trắng **${penaltyAmount.toLocaleString('en-US')} JC** (30% tài sản) và bị cấm túc 5 phút!` };
    }
    
    if (db.isAdmin(targetUser.id)) {
        const penaltyAmount = Math.floor(attacker.balance * 0.30);
        db.addBalance(user.id, guildId, -penaltyAmount);
        cooldowns.set(cdKey, Date.now() + 5 * 60000);
        return { content: `🚨 **BÁO ĐỘNG ĐỎ: ĐỤNG NHẦM TỔ KIẾN LỬA!**\n<@${user.id}> dám cả gan cướp của Admin <@${targetUser.id}>?!\nHệ thống an ninh đã giật điện khiến bạn mất trắng **${penaltyAmount.toLocaleString('en-US')} JC** (30% tài sản) và bị cấm túc 5 phút!` };
    }

    if (attacker.balance < 1000) return { content: 'Bạn cần có ít nhất **1,000 JC** làm lộ phí đi đường mới đi ăn trộm được!' };
    if (victim.balance < 1000) return { content: 'Người ta nghèo rớt mồng tơi (dưới 1000 JC) mà bạn nỡ lòng nào ăn trộm?' };

    const victimShield = db.getShield(targetUser.id, guildId);
    if (Date.now() < victimShield) {
        const date = new Date(victimShield).toLocaleString('vi-VN');
        return { content: `🛡️ Keng! Ngôi nhà của **${targetUser.username}** đang được bảo vệ bởi Khiên Chống Trộm (có hiệu lực đến **${date}**). Bạn không thể vào được!` };
    }

    // Set cooldown 5 phút
    cooldowns.set(cdKey, Date.now() + 5 * 60000);

    const successRate = 0.40; // 40%
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
        // Trộm được từ 5% đến 15% số tiền của nạn nhân
        const stealPercent = (Math.random() * (0.15 - 0.05) + 0.05);
        const stolenAmount = Math.floor(victim.balance * stealPercent);

        db.addBalance(targetUser.id, guildId, -stolenAmount);
        db.addBalance(user.id, guildId, stolenAmount);

        return { content: `🥷 Trộm vía! Bạn đã lẻn vào nhà **${targetUser.username}** và cuỗm mất **${stolenAmount} JC**!` };
    } else {
        // Bị bắt, phạt 10% tiền bản thân
        const penaltyAmount = Math.floor(attacker.balance * 0.10);
        db.addBalance(user.id, guildId, -penaltyAmount);
        db.addBalance(targetUser.id, guildId, penaltyAmount);

        return { content: `🚔 Bíp Bíp! Còi báo động kêu! Bạn bị **${targetUser.username}** bắt quả tang và giao cho công an. Bạn bị nộp phạt mất trắng **${penaltyAmount.toLocaleString()} JC**, và số tiền này được đền bù cho **${targetUser.username}**!` };
    }
}

function generateProgressBar(current, max, length = 15) {
    const progress = Math.min(Math.max(current / max, 0), 1);
    const filledCount = Math.round(progress * length);
    const emptyCount = length - filledCount;
    const filledChar = '█';
    const emptyChar = '░';
    return `[${filledChar.repeat(filledCount)}${emptyChar.repeat(emptyCount)}] ${Math.round(progress * 100)}%`;
}

function handleAvatar(targetUser) {
    let avatarUrl = null;
    try {
        avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
    } catch(e) {}
    
    if (!avatarUrl) {
        avatarUrl = targetUser.defaultAvatarURL;
    }

    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`Ảnh đại diện của ${targetUser.username}`);
        
    if (avatarUrl) {
        embed.setImage(avatarUrl);
    } else {
        embed.setDescription('Người dùng này không có ảnh đại diện hợp lệ.');
    }
    
    return { embeds: [embed] };
}

function handleProfile(targetUser) {
    const userData = db.getUser(targetUser.id, guildId);
    const bankBal = userData.bank || 0;
    const totalWealth = userData.balance + bankBal;

    const levelData = db.getUserLevel(targetUser.id, guildId);
    const nextLevelExp = 5 * (levelData.level * levelData.level) + 50 * levelData.level + 100;
    const progressBar = generateProgressBar(levelData.exp, nextLevelExp, 10);

    const inventory = db.getInventory(targetUser.id, guildId);
    let invText = inventory.length > 0 ? inventory.map(i => `${i.item} (x${i.amount})`).join(', ') : 'Túi rỗng.';
    if (invText.length > 200) invText = invText.substring(0, 197) + '...';

    const pets = db.getPets(targetUser.id, guildId);
    let petText = pets.length > 0 ? `Sở hữu ${pets.length} Thú Cưng` : 'Chưa có Thú Cưng nào.';
    if (pets.length > 0) {
        const strongest = pets.sort((a,b) => (b.attack + b.hp) - (a.attack + a.hp))[0];
        petText += `\n🔥 Mạnh nhất: **${strongest.species}** (Lv ${strongest.level})`;
    }

    let relText = 'Độc thân vui tính 🥲';
    const rel = db.getRelationship(targetUser.id, guildId);
    if (rel) {
        const partnerId = rel.user_id === targetUser.id ? rel.partner_id : rel.user_id;
        if (rel.status === 'engaged') relText = `💍 Đã đính hôn với <@${partnerId}>`;
        else if (rel.status === 'married') relText = `❤️ Đã kết hôn với <@${partnerId}>`;
    }

    let avatarUrl = null;
    try {
        avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 256 });
    } catch(e) {}

    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`📝 Thẻ Định Danh Legend Main: ${targetUser.username}`)
        .setImage('attachment://profile.png')
        .addFields(
            { name: `${EMOJIS.money} Tài Sản Kinh Tế`, value: `Ví: **${userData.balance.toLocaleString()} G**\nBank: **${bankBal.toLocaleString()} G**\nTổng: **${totalWealth.toLocaleString()} G**`, inline: true },
            { name: '🌟 Cấp Độ Tương Tác', value: `Level: **${levelData.level}**\nEXP: ${levelData.exp} / ${nextLevelExp}\n${progressBar}`, inline: true },
            { name: `${EMOJIS.love} Tình Trạng`, value: relText, inline: false },
            { name: `${EMOJIS.pet} Thú Cưng`, value: petText, inline: true },
            { name: '🎒 Túi Đồ', value: invText, inline: false }
        );
        
    if (avatarUrl) embed.setThumbnail(avatarUrl);
        
    const attachment = new AttachmentBuilder('./images/profile.png');
    return { embeds: [embed], files: [attachment] };
}

function handleRank(targetUser) {
    const levelData = db.getUserLevel(targetUser.id, guildId);
    const nextLevelExp = 5 * (levelData.level * levelData.level) + 50 * levelData.level + 100;

    const voiceData = db.getUserVoiceLevel(targetUser.id, guildId);
    const nextVoiceLevelExp = 5 * (voiceData.level * voiceData.level) + 50 * voiceData.level + 100;
    
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📈 Thẻ Cấp Độ của ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '💬 Chat Level', value: `**Level ${levelData.level}**\n${levelData.exp} / ${nextLevelExp} EXP\n${generateProgressBar(levelData.exp, nextLevelExp, 15)}`, inline: true },
            { name: '🎤 Voice Level', value: `**Level ${voiceData.level}**\n${voiceData.exp} / ${nextVoiceLevelExp} EXP\n${generateProgressBar(voiceData.exp, nextVoiceLevelExp, 15)}`, inline: true }
        )
        .setFooter({ text: 'Chat để nhận EXP Chat • Vào kênh Voice để nhận EXP Voice' });
    return { embeds: [embed] };
}

async function handleTopRank() {
    const topChat = db.getTopLevels(guildId);
    const topVoice = db.getTopVoiceLevels(guildId);
    const medals = ['🥇', '🥈', '🥉'];

    // Build chat top
    let chatDesc = '';
    for (let i = 0; i < topChat.length; i++) {
        const uInfo = topChat[i];
        let username = 'Unknown';
        try { const fetched = await client.users.fetch(uInfo.user_id); username = fetched.username; } catch(e) {}
        const rank = i < 3 ? medals[i] : `**#${i+1}**`;
        chatDesc += `${rank} **${username}** - Lv ${uInfo.level} (${uInfo.exp} EXP)\n`;
    }
    if (!chatDesc) chatDesc = 'Chưa có ai chat cả!';

    // Build voice top
    let voiceDesc = '';
    for (let i = 0; i < topVoice.length; i++) {
        const uInfo = topVoice[i];
        const vLevel = uInfo.voice_level || 1;
        const vExp = uInfo.voice_exp || 0;
        if (vLevel <= 1 && vExp === 0) continue; // bỏ qua user chưa vào voice
        let username = 'Unknown';
        try { const fetched = await client.users.fetch(uInfo.user_id); username = fetched.username; } catch(e) {}
        const rank = i < 3 ? medals[i] : `**#${i+1}**`;
        voiceDesc += `${rank} **${username}** - Lv ${vLevel} (${vExp} EXP)\n`;
    }
    if (!voiceDesc) voiceDesc = 'Chưa ai vào kênh voice cả!';

    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🏆 Bảng Xếp Hạng Cấp Độ Server')
        .setDescription('Xếp hạng dựa trên hoạt động Chat và Voice riêng biệt.')
        .addFields(
            { name: '💬 Top 10 Chat Level', value: chatDesc, inline: false },
            { name: '🎤 Top 10 Voice Level', value: voiceDesc, inline: false }
        )
        .setFooter({ text: 'Chat để tăng Chat Level • Vào kênh Voice để tăng Voice Level' });
    return { embeds: [embed] };
}

async function handleTop() {
    const allUsers = db.getAllUsers();
    const netWorthList = [];

    for (const u of allUsers) {
        let netWorth = u.balance + (u.bank || 0);
        const inv = db.getInventory(u.id, guildId);
        for (const item of inv) {
            if (!SHOP_ITEMS[item.item]) {
                netWorth += (PRICES[item.item] || 0) * item.amount;
            }
        }
        netWorthList.push({ id: u.id, netWorth });
    }

    netWorthList.sort((a, b) => b.netWorth - a.netWorth);
    const top10 = netWorthList.slice(0, 10);

    let desc = '';
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < top10.length; i++) {
        const uInfo = top10[i];
        let username = 'Unknown';
        try {
            const fetchedUser = await client.users.fetch(uInfo.id);
            username = fetchedUser.username;
        } catch(e) {}
        
        const rank = i < 3 ? medals[i] : `**#${i+1}**`;
        desc += `${rank} **${username}** - 💰 ${uInfo.netWorth} G\n`;
    }

    if (desc === '') desc = 'Chưa có ai chơi cả!';
    const embed = new EmbedBuilder().setColor('#ffd700').setTitle('🏆 Bảng Xếp Hạng Đại Gia (Tổng Tài Sản)').setDescription(desc);
    return { embeds: [embed] };
}

function handleHelp_old() {
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${EMOJIS.help} Sổ Tay Hướng Dẫn Legend Main`)
        .setDescription(`Chào mừng đại gia đến với thế giới RPG! 🌟\nThay vì hiển thị một mớ lệnh dài loằng ngoằng, hãy chọn một **Danh mục** ở menu bên dưới để xem các lệnh tương ứng nhé!`)
        .setImage('attachment://help.png')
        .setFooter({ text: 'Legend Main - Chúc các Đại gia khởi nghiệp thành công! 🚀' });

    const select = new StringSelectMenuBuilder()
        .setCustomId('help_select')
        .setPlaceholder('👉 Chọn danh mục bạn muốn xem...')
        .addOptions([
            { label: 'Kinh Tế & Cửa Hàng', description: 'Tiền bạc, mua bán, chuyển tiền, trộm cắp', value: 'help_economy', emoji: '💵' },
            { label: 'Ngân Hàng & Đầu Tư', description: 'Gửi/rút ngân hàng, đầu tư HDPE 2%/ngày', value: 'help_bank', emoji: '🏦' },
            { label: 'Nghề Nghiệp & Cày Cuốc', description: 'Câu cá, đào mỏ, đi làm thuê, nhận lương', value: 'help_work', emoji: '⛏️' },
            { label: 'Giải Trí & Casino', description: 'Tài Xỉu, Chẵn Lẻ, Blackjack (cược tối đa 250k)', value: 'help_casino', emoji: '🎲' },
            { label: 'Pet RPG', description: 'Săn bắt, mua, chiến đấu và bán thú cưng', value: 'help_pet', emoji: '🐾' },
            { label: 'Tình Yêu & Hôn Nhân', description: 'Hẹn hò mù quáng, cầu hôn, ly hôn', value: 'help_love', emoji: '❤️' },
            { label: 'Âm Nhạc', description: 'Phát nhạc YouTube/SoundCloud trong kênh Voice', value: 'help_music', emoji: '🎵' },
            { label: 'Tiện Ích & Cấp Độ', description: 'Hồ sơ, xếp hạng, điểm danh, ảnh đại diện', value: 'help_util', emoji: '🤖' }
        ]);

    const row = new ActionRowBuilder().addComponents(select);
    const attachment = new AttachmentBuilder('./images/help.png');
    return { embeds: [embed], components: [row], files: [attachment] };
}

function handleAdminHelp() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adminhelp_economy').setLabel('💸 Kinh Tế').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adminhelp_casino').setLabel('🎲 Casino').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adminhelp_voice').setLabel('🔇 Voice/Jail').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adminhelp_social').setLabel('💔 Xã Hội').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adminhelp_system').setLabel('🔧 Hệ Thống').setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('👑 Bảng Điều Khiển Admin — Legend Main')
        .setDescription(`Danh sách toàn bộ lệnh đặc quyền. Bấm nút bên dưới để lọc theo nhóm.\n\n> ⚠️ Lệnh \`${PREFIX}...\` dùng tin nhắn thường | Lệnh \`/...\` dùng Slash Command`)
        .addFields(
            {
                name: '🔧 Hệ Thống',
                value: [
                    `\`${PREFIX}addadmin @user\` — Cấp Admin *(Chỉ Chủ Bot)*`,
                    `\`${PREFIX}removeadmin @user\` — Thu hồi Admin *(Chỉ Chủ Bot)*`,
                    `\`${PREFIX}join\` — Bot vào Voice kênh bạn đang ở`,
                    `\`${PREFIX}leave\` — Bot rời Voice`,
                    `\`/blockbot [#kênh]\` — Chặn/bỏ chặn bot trong kênh`
                ].join('\n'),
                inline: false
            },
            {
                name: '💸 Kinh Tế',
                value: [
                    `\`${PREFIX}addcoin <tiền>\` — Hack tiền vào túi bản thân`,
                    `\`${PREFIX}giveall <tiền>\` — Phát tiền cho toàn server`,
                    `\`${PREFIX}delcoin @user <tiền>\` — Xóa tiền của ai đó`,
                    `\`${PREFIX}sale @user <tiền>\` — Bơm tiền *(Đại Lý cũng dùng được)*`,
                    `\`${PREFIX}addxp [@user] <số>\` — Cấp EXP Chat`,
                    `\`${PREFIX}addvippets [@user]\` — Tặng full Pet Truyền Thuyết VIP`
                ].join('\n'),
                inline: false
            },
            {
                name: '🎲 Buff Casino (TX / CL / BJ)',
                value: [
                    `\`/setwinrate @user <0-100>\` | \`${PREFIX}setwinrate @user <0-100>\``,
                    `> Đặt tỉ lệ thắng cố định (%) — 0 = tắt buff`,
                    `\`/setpayout @user <hệ số>\` | \`${PREFIX}setpayout @user <hệ số>\``,
                    `> Đặt hệ số thưởng khi thắng — 0 = bình thường`,
                    `\`/checkbuff @user\` | \`${PREFIX}checkbuff @user\` — Xem buff hiện tại`
                ].join('\n'),
                inline: false
            },
            {
                name: '🔇 Treo Room Voice',
                value: [
                    `\`/treoroom @user [thoigian] [lydo]\` | \`${PREFIX}treoroom @user [thoigian] [lydo]\``,
                    `> Thời gian: \`30m\`, \`2h\`, \`7d\`, \`0\` = vĩnh viễn`,
                    `\`/botreo @user\` | \`${PREFIX}botreo @user\` — Gỡ treo room`,
                    `\`/listtreo\` | \`${PREFIX}listtreo\` — Xem danh sách đang bị treo`
                ].join('\n'),
                inline: false
            },
            {
                name: '🚨 Nhà Tù',
                value: [
                    `\`/jail @user [số tin nhắn]\` | \`${PREFIX}jail @user [số]\``,
                    `> Bắt giam, cần spam đủ tin mới được thả (mặc định 100)`,
                    `\`/unjail @user\` | \`${PREFIX}unjail @user\` — Ân xá, thả người chơi`
                ].join('\n'),
                inline: false
            },
            {
                name: '💔 Xã Hội',
                value: [
                    `\`/admindivorce @user\` | \`${PREFIX}admindivorce @user\` — Cưỡng chế ly hôn`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: `Dùng ${PREFIX}adminhelp để xem lại • Quyền lực đi kèm trách nhiệm! ⚡` });
    return { embeds: [embed] };
}

// ===== INVESTMENT (HDPE) HANDLERS =====
function handleInvestmentView(user) {
    const investments = db.getInvestments(user.id, guildId);
    const DAILY_RATE = 0.02;

    if (investments.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#27ae60')
            .setTitle('📊 Quỹ Đầu Tư HDPE')
            .setDescription(`> 💬 *"Đầu tư vào HDPE là ngon luôn!"* 🔥\n\nChào **${user.username}**! Bạn chưa có gói đầu tư nào.\n\n**Sản phẩm: HDPE (Ống Nhựa Cao Áp)**\n📈 Lãi suất: **2%/ngày** trên số tiền đầu tư\n🔒 Vốn được bảo toàn 100%, rút bất kỳ lúc nào\n\nHãy dùng \`/dautu <số tiền>\` để bắt đầu đầu tư!`)
            .setFooter({ text: 'Đầu tư thông minh - Tài sản vững bền! 💎' });
        return { embeds: [embed] };
    }

    let totalPrincipal = 0;
    let totalInterest = 0;
    let fieldLines = [];

    for (const inv of investments) {
        const val = db.calculateInvestmentValue(inv);
        totalPrincipal += val.principal;
        totalInterest += val.interest;
        const days = val.ageDays.toFixed(2);
        const sinceDate = new Date(inv.invested_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        fieldLines.push(`🔹 **Gói #${inv.id}** | Gốc: **${val.principal.toLocaleString()} G** | Lãi: **${val.interest.toLocaleString()} G** | ${days} ngày`);
    }

    const totalValue = totalPrincipal + totalInterest;

    const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle('📊 Danh Mục Đầu Tư HDPE của ' + user.username)
        .setDescription(`> 💬 *"Đầu tư vào HDPE là ngon luôn!"* 🔥\n\n` + fieldLines.join('\n'))
        .addFields(
            { name: '💰 Tổng Vốn', value: `${totalPrincipal.toLocaleString()} G`, inline: true },
            { name: '📈 Tổng Lãi (2%/ngày)', value: `+${totalInterest.toLocaleString()} G`, inline: true },
            { name: '💎 Giá Trị Hiện Tại', value: `${totalValue.toLocaleString()} G`, inline: true }
        )
        .setFooter({ text: 'Dùng /rutdautu để rút vốn + lãi • /rutdautu <id> để rút từng gói' });

    return { embeds: [embed] };
}

async function handleDeposit_Investment(isSlash, ctx, user, amountStr) {
    const userData = db.getUser(user.id, guildId);
    let amount = 0;

    if (!amountStr) {
        return isSlash
            ? ctx.reply(handleInvestmentView(user))
            : ctx.reply(handleInvestmentView(user));
    }

    if (amountStr.toLowerCase() === 'all') {
        amount = userData.balance;
    } else {
        amount = parseInt(amountStr);
    }

    if (isNaN(amount) || amount <= 0) {
        const msg = { content: '❌ Số tiền không hợp lệ! Hãy nhập một số dương hoặc chữ `all`.', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }
    if (amount < 1000) {
        const msg = { content: '❌ Số tiền đầu tư tối thiểu là **1,000 JC**!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }
    if (userData.balance < amount) {
        const msg = { content: `❌ Bạn không đủ tiền! Trong ví chỉ có **${userData.balance.toLocaleString()} G**.`, ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const text = `📊 Xác nhận đầu tư **${amount.toLocaleString()} JC** vào sản phẩm **HDPE** với lãi suất **2%/ngày**?\n*Bạn có thể rút vốn + lãi bất kỳ lúc nào bằng lệnh \`/rutdautu\`.*`;

    await requestConfirmation(ctx, user, text, () => {
        const currentData = db.getUser(user.id, guildId);
        if (currentData.balance < amount) return '❌ Giao dịch thất bại! Số dư không đủ!';
        db.addBalance(user.id, guildId, -amount);
        db.addInvestment(user.id, guildId, amount);
        return `✅ **Đầu tư thành công!** 🎉\n💵 Bạn đã đầu tư **${amount.toLocaleString()} JC** vào sản phẩm **HDPE**\n📈 Lãi suất: **2% mỗi ngày** tính trên số vốn\n🔔 Dùng \`/rutdautu\` để xem và rút tiền khi cần!`;
    }, () => '❌ Đã hủy giao dịch đầu tư.', isSlash);
}

async function handleWithdraw_Investment(isSlash, ctx, user, investId) {
    const investments = db.getInvestments(user.id, guildId);

    if (investments.length === 0) {
        const msg = { content: '❌ Bạn không có gói đầu tư nào để rút!', ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    // Rút tất cả
    if (!investId) {
        let totalPrincipal = 0;
        let totalInterest = 0;
        for (const inv of investments) {
            const val = db.calculateInvestmentValue(inv);
            totalPrincipal += val.principal;
            totalInterest += val.interest;
        }
        const totalPayout = totalPrincipal + totalInterest;

        const text = `💰 Xác nhận rút **TẤT CẢ** ${investments.length} gói đầu tư HDPE?\n📦 Tổng vốn: **${totalPrincipal.toLocaleString()} G** | 📈 Tổng lãi: **+${totalInterest.toLocaleString()} G**\n💎 Nhận về: **${totalPayout.toLocaleString()} G**`;

        await requestConfirmation(ctx, user, text, () => {
            const allInv = db.getInvestments(user.id, guildId);
            let payout = 0;
            for (const inv of allInv) {
                const val = db.calculateInvestmentValue(inv);
                payout += val.total;
                db.deleteInvestment(inv.id);
            }
            db.addBalance(user.id, guildId, payout);
            return `🎉 **Rút vốn thành công!**\n💵 Đã nhận về **${payout.toLocaleString()} JC** (vốn + lãi) vào ví của bạn!`;
        }, () => '❌ Đã hủy rút vốn.', isSlash);
        return;
    }

    // Rút theo ID
    const inv = db.getInvestmentById(investId);
    if (!inv || inv.user_id !== user.id) {
        const msg = { content: `❌ Không tìm thấy gói đầu tư #${investId} của bạn!`, ephemeral: true };
        return isSlash ? ctx.reply(msg) : ctx.reply(msg.content);
    }

    const val = db.calculateInvestmentValue(inv);
    const sinceDate = new Date(inv.invested_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const text = `💰 Rút gói đầu tư **#${inv.id}**?\n📅 Gửi ngày: **${sinceDate}** (${val.ageDays.toFixed(2)} ngày)\n💵 Vốn: **${val.principal.toLocaleString()} G** | 📈 Lãi 2%/ngày: **+${val.interest.toLocaleString()} G**\n💎 Nhận về: **${val.total.toLocaleString()} G**`;

    await requestConfirmation(ctx, user, text, () => {
        const checkInv = db.getInvestmentById(investId);
        if (!checkInv || checkInv.user_id !== user.id) return '❌ Giao dịch thất bại!';
        const calcVal = db.calculateInvestmentValue(checkInv);
        db.deleteInvestment(investId);
        db.addBalance(user.id, guildId, calcVal.total);
        return `🎉 **Rút vốn thành công!**\n💵 Bạn đã nhận về **${calcVal.total.toLocaleString()} JC** (Vốn: ${calcVal.principal.toLocaleString()} JC + Lãi: ${calcVal.interest.toLocaleString()} G)!`;
    }, () => '❌ Đã hủy rút vốn.', isSlash);
}

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    if (!interaction.guild) return;
    guildId = interaction.guild.id;
    if (interaction.isButton()) {
    if (interaction.customId.startsWith('masoi_')) {
        await masoi.handleButton(interaction);
        return;
    }
      // ===== NÚT ĐIỀU KHIỂN NHẠC =====
      if (interaction.customId.startsWith('music_')) {
          const queue = getMusicQueue(interaction.guildId);
          if (!queue) {
              return interaction.reply({ content: '❌ Không có nhạc đang phát!', ephemeral: true });
          }

          const action = interaction.customId.replace('music_', '');

          if (action === 'pause') {
              const isPaused = queue.player.state.status === AudioPlayerStatus.Paused;
              if (isPaused) {
                  queue.player.unpause();
                  await interaction.reply({ content: '▶️ Đã tiếp tục phát nhạc!', ephemeral: true });
              } else {
                  queue.player.pause();
                  await interaction.reply({ content: '⏸️ Đã tạm dừng nhạc!', ephemeral: true });
              }
              // Cập nhật nút
              if (queue.nowPlayingMsg) {
                  const newButtons = createMusicButtons(queue);
                  queue.nowPlayingMsg.edit({ components: [newButtons] }).catch(() => {});
              }
              return;
          }

          if (action === 'skip') {
              if (!queue.playing) return interaction.reply({ content: '❌ Không có nhạc đang phát!', ephemeral: true });
              await interaction.reply({ content: '⏭️ Đã bỏ qua bài hiện tại!', ephemeral: true });
              queue.player.stop(); // Triggers Idle → chuyển bài
              return;
          }

          if (action === 'stop') {
              queue.songs = [];
              queue.playing = false;
              queue.player.stop();
              if (queue.nowPlayingMsg) {
                  queue.nowPlayingMsg.edit({ components: [] }).catch(() => {});
              }
              musicQueues.delete(interaction.guildId);
              return interaction.reply({ content: '⏹️ Đã dừng nhạc và xóa hàng đợi! Bot vẫn ở lại kênh thoại.' });
          }

          if (action === 'loop') {
              queue.loop = !queue.loop;
              await interaction.reply({ content: `🔁 Lặp lại: **${queue.loop ? 'BẬT ✅' : 'TẮT ❌'}**`, ephemeral: true });
              if (queue.nowPlayingMsg) {
                  const newButtons = createMusicButtons(queue);
                  queue.nowPlayingMsg.edit({ components: [newButtons] }).catch(() => {});
              }
              return;
          }

          if (action === 'queue') {
              if (queue.songs.length === 0) return interaction.reply({ content: '📭 Hàng đợi trống!', ephemeral: true });

              const current = queue.songs[0];
              let desc = `🎵 **Đang phát:** [${current.title}](${current.url}) — \`${current.duration}\`\n\n`;

              if (queue.songs.length > 1) {
                  desc += '**📋 Tiếp theo:**\n';
                  for (let i = 1; i < Math.min(queue.songs.length, 11); i++) {
                      const s = queue.songs[i];
                      desc += `\`${i}.\` [${s.title}](${s.url}) — \`${s.duration}\` — <@${s.requestedBy}>\n`;
                  }
                  if (queue.songs.length > 11) {
                      desc += `\n*...và ${queue.songs.length - 11} bài khác*`;
                  }
              }

              const embed = new EmbedBuilder()
                  .setColor('#e67e22')
                  .setTitle(`🎶 Hàng Đợi Nhạc — ${queue.songs.length} bài`)
                  .setDescription(desc)
                  .addFields(
                      { name: '🔊 Âm lượng', value: `${queue.volume}%`, inline: true },
                      { name: '🔁 Lặp lại', value: queue.loop ? '✅ Bật' : '❌ Tắt', inline: true }
                  );

              return interaction.reply({ embeds: [embed], ephemeral: true });
          }

          return;
      }

      if (interaction.customId === 'bank_deposit_btn' || interaction.customId === 'bank_withdraw_btn') {
          const isDeposit = interaction.customId === 'bank_deposit_btn';
          const modal = new ModalBuilder()
              .setCustomId(isDeposit ? 'bank_deposit_modal' : 'bank_withdraw_modal')
              .setTitle(isDeposit ? 'Gửi Tiền Vào Ngân Hàng' : 'Rút Tiền Từ Ngân Hàng');
              
          const input = new TextInputBuilder()
              .setCustomId('amount')
              .setLabel('Số tiền (Nhập số hoặc chữ "all"):')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);
              
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
      }
      if (interaction.customId === 'pet_hunt_btn') {
          return interaction.reply(handleHunt(interaction.user));
      }
      if (interaction.customId.startsWith('pet_battle_btn_')) {
          const petIdStr = interaction.customId.replace('pet_battle_btn_', '');
          return interaction.reply(handlePetBattle(interaction.user, petIdStr));
      }
      if (interaction.customId.startsWith('pet_sell_btn_')) {
          const petIdStr = interaction.customId.replace('pet_sell_btn_', '');
          return doPetSellConfirmation(true, interaction, interaction.user, petIdStr);
      }
      if (interaction.customId === 'pet_hub_back') {
          return interaction.update(handlePetsUI(interaction.user));
      }
  }

  if (interaction.isModalSubmit()) {
      if (interaction.customId === 'bank_deposit_modal') {
          const amountStr = interaction.fields.getTextInputValue('amount');
          return interaction.reply(handleDeposit(interaction.user, amountStr));
      }
      if (interaction.customId === 'bank_withdraw_modal') {
          const amountStr = interaction.fields.getTextInputValue('amount');
          return interaction.reply(handleWithdraw(interaction.user, amountStr));
      }
      if (interaction.customId.startsWith('buy_modal_')) {
          const itemName = interaction.customId.replace('buy_modal_', '');
          const amount = parseInt(interaction.fields.getTextInputValue('amount'));
          if (isNaN(amount) || amount <= 0) return interaction.reply({ content: 'Số lượng không hợp lệ!', ephemeral: true });
          return interaction.reply(handleBuy(interaction.user, itemName, amount));
      }
  }

    if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('masoi_')) {
        await masoi.handleSelectMenu(interaction);
        return;
    }
      if (interaction.customId === 'buy_pet_select') {
          const rarity = interaction.values[0].replace('buy_pet_', '');
          return processPetBuy(true, interaction, interaction.user, rarity);
      }
      
      if (interaction.customId === 'pet_rarity_select') {
          const rarity = interaction.values[0].replace('rarity_', '');
          const pets = db.getPets(interaction.user.id, guildId).filter(p => p.rarity === rarity);
          pets.sort((a,b) => b.level - a.level);
          const topPets = pets.slice(0, 25);
          
          const embed = new EmbedBuilder()
              .setColor('#3498db')
              .setTitle(`🐾 Danh sách Pet - ${rarity}`)
              .setDescription(`Đang hiển thị ${topPets.length} Pet cấp cao nhất của hạng này.\nVui lòng chọn một Pet bên dưới để tương tác.`);
              
          const selectOptions = topPets.map(p => ({
              label: `${p.species} (Lv ${p.level})`,
              description: `HP: ${p.hp} | ATK: ${p.attack} | Mã: #${p.id}`,
              value: `petid_${p.id}`
          }));
          
          const select = new StringSelectMenuBuilder()
              .setCustomId('pet_id_select')
              .setPlaceholder('Chọn một con Pet...')
              .addOptions(selectOptions);
              
          const row1 = new ActionRowBuilder().addComponents(select);
          const row2 = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('pet_hub_back').setLabel('Quay lại Trung Tâm').setStyle(ButtonStyle.Secondary)
          );
          
          return interaction.update({ embeds: [embed], components: [row1, row2] });
      }
      
      if (interaction.customId === 'pet_id_select') {
          const petId = parseInt(interaction.values[0].replace('petid_', ''));
          const pet = db.getPet(petId);
          if (!pet || pet.user_id !== interaction.user.id) return interaction.reply({ content: 'Pet không tồn tại hoặc không phải của bạn!', ephemeral: true });
          
          const embed = new EmbedBuilder()
              .setColor('#e67e22')
              .setTitle(`📝 Chi Tiết: ${pet.species} (Lv ${pet.level})`)
              .addFields(
                  { name: '🌟 Độ Hiếm', value: pet.rarity, inline: true },
                  { name: '🔖 Mã Số (ID)', value: `#${pet.id}`, inline: true },
                  { name: '✨ Kinh Nghiệm', value: `${pet.exp}/${pet.level * 100} EXP`, inline: true },
                  { name: '❤️ Sinh Lực (HP)', value: `${pet.hp}`, inline: true },
                  { name: '⚔️ Tấn Công (ATK)', value: `${pet.attack}`, inline: true },
                  { name: '⚡ Tình trạng', value: `Sẵn sàng chiến đấu`, inline: true }
              );
              
          const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`pet_battle_btn_${pet.id}`).setLabel('Khảo Chiến').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
              new ButtonBuilder().setCustomId(`pet_sell_btn_${pet.id}`).setLabel('Bán Pet').setStyle(ButtonStyle.Danger).setEmoji('💰'),
              new ButtonBuilder().setCustomId('pet_hub_back').setLabel('Quay lại').setStyle(ButtonStyle.Secondary)
          );
          
          return interaction.update({ embeds: [embed], components: [row] });
      }

      if (interaction.customId === 'help_select') {
          const category = interaction.values[0];
          const embed = new EmbedBuilder().setColor('#2ecc71').setFooter({ text: 'Legend Main • Dùng /help để quay lại menu chính 🚀' });

          if (category === 'help_economy') {
              embed.setTitle('💵 Kinh Tế & Cửa Hàng')
                   .setDescription([
                       '**💰 Xem Tài Sản**',
                       `\`/bal\` hoặc \`${PREFIX}bal\` — Xem tóm tắt ví tiền & ngân hàng`,
                       `\`/inv\` hoặc \`${PREFIX}inv\` — Xem chi tiết kho đồ với mã số vật phẩm`,
                       '',
                       '**🏪 Mua Bán**',
                       `\`/shop\` hoặc \`${PREFIX}shop\` — Mở cửa hàng dụng cụ`,
                       `\`/buy <tên>\` hoặc \`${PREFIX}buy <tên> [số lượng]\` — Mua vật phẩm`,
                       `\`/sell <tên/mã>\` hoặc \`${PREFIX}sell <tên/mã> [số lượng]\` — Bán vật phẩm (Nhẫn/đồ Shop bán được 75% giá)`,
                       `\`/sellall\` hoặc \`${PREFIX}sellall\` — Bán toàn bộ tài nguyên (cá, quặng...)`,
                       '',
                       '**💸 Giao Dịch**',
                       `\`/give @user <tiền>\` hoặc \`${PREFIX}give @user <tiền>\` — Chuyển tiền (cần xác nhận)`,
                       `\`/rob @user\` hoặc \`${PREFIX}rob @user\` — Trộm tiền ví người khác (40% thành công, thất bại bị phạt)`,
                       `\`/buyrole\` hoặc \`${PREFIX}buyrole\` — Mua Role VIP bằng JC`,
                       `\`/top\` hoặc \`${PREFIX}top\` — Bảng xếp hạng Top 10 Đại Gia (Tổng Tài Sản)`
                   ].join('\n'));
          } else if (category === 'help_bank') {
              embed.setTitle('🏦 Ngân Hàng & Đầu Tư HDPE')
                   .setDescription([
                       '**🏦 Ngân Hàng** *(tiền gửi vào không bị trộm)*',
                       `\`/bank\` hoặc \`${PREFIX}bank\` — Mở bảng điều khiển Ngân Hàng (nút bấm)`,
                       `\`/deposit <tiền>\` hoặc \`${PREFIX}gui <tiền>\` — Gửi tiền vào ngân hàng`,
                       `\`/withdraw <tiền>\` hoặc \`${PREFIX}rut <tiền>\` — Rút tiền ra ví`,
                       `> 💡 Hỗ trợ nhập \`all\` để gửi/rút toàn bộ`,
                       '',
                       '**📊 Đầu Tư HDPE** *(lãi 2%/ngày trên vốn)*',
                       `\`/dautu <tiền>\` hoặc \`${PREFIX}dautu <tiền>\` — Gửi tiền đầu tư`,
                       `\`/dautu\` hoặc \`${PREFIX}dautu\` *(không có số)* — Xem danh sách các gói đang đầu tư`,
                       `\`/rutdautu\` hoặc \`${PREFIX}rutdautu\` — Rút tất cả gói (vốn + lãi)`,
                       `\`/rutdautu <id>\` hoặc \`${PREFIX}rutdautu <id>\` — Rút một gói cụ thể`,
                       `> 💡 Ví dụ: Đầu tư **1,000,000 G** sau **1 ngày** nhận **1,020,000 G**`
                   ].join('\n'));
          } else if (category === 'help_work') {
              embed.setTitle('⛏️ Nghề Nghiệp & Cày Cuốc')
                   .setDescription([
                       '**👔 Đi Làm Thuê**',
                       `\`/work\` hoặc \`${PREFIX}work\` — Đi xin việc ngẫu nhiên (treo máy chờ)`,
                       `\`/claim\` hoặc \`${PREFIX}claim\` — Nhận lương khi làm việc xong`,
                       `\`/daily\` hoặc \`${PREFIX}daily\` — Nhận quà điểm danh hàng ngày (+50,000 G)`,
                       '',
                       '**🎣 Câu Cá** *(cần Mồi Câu + Cần Câu)*',
                       `\`/fish\` hoặc \`${PREFIX}f\` — Câu cá tại khu vực đã chọn`,
                       `\`/fish <khu vực>\` — Câu cá tại khu vực chỉ định`,
                       `> 🗺️ Khu vực: **Ao Làng** (Cần Gỗ) → **Sông Lớn** (Cần Sắt) → **Đại Dương** (Cần Vàng)`,
                       '',
                       '**⛏️ Đào Quặng** *(cần Đèn Khai Khoáng + Cuốc)*',
                       `\`/mine\` hoặc \`${PREFIX}m\` — Đào tại khu vực đã chọn`,
                       `\`/mine <khu vực>\` — Đào tại khu vực chỉ định`,
                       `> 🗺️ Khu vực: **Mỏ Lộ Thiên** (Cúp Gỗ) → **Hang Động Sâu** (Cúp Sắt) → **Lõi Trái Đất** (Cúp Kim Cương)`
                   ].join('\n'));
          } else if (category === 'help_casino') {
              embed.setTitle('🎲 Giải Trí & Casino')
                   .setDescription([
                       '> ⚠️ Cược tối đa **250,000 JC/ván** | Hỗ trợ nhập `all` (tự giới hạn 250k)',
                       '',
                       '**🃏 Xì Dách (Blackjack)**',
                       `\`/bj <tiền>\` hoặc \`${PREFIX}bj <tiền>\` — Đánh Blackjack với Nhà Cái`,
                       `> Blackjack thắng x2.5 | Thắng thường x2 | Nút: Rút Bài / Dằn Bài`,
                       '',
                       '**🎰 Tài Xỉu**',
                       `\`/tx <t/x> <tiền>\` hoặc \`${PREFIX}tx <t/x> <tiền>\` — Chọn Tài hoặc Xỉu`,
                       `> Tổng 3 xúc xắc ≥11 = Tài | ≤10 = Xỉu | Thắng nhận x1.95`,
                       '',
                       '**🎰 Chẵn Lẻ**',
                       `\`/cl <c/l> <tiền>\` hoặc \`${PREFIX}cl <c/l> <tiền>\` — Chọn Chẵn hoặc Lẻ`,
                       `> Tổng 3 xúc xắc chẵn/lẻ | Thắng nhận x1.95`,
                       '',
                       '**🥷 Trộm Cắp**',
                       `\`/rob @user\` hoặc \`${PREFIX}rob @user\` — Trộm 5~15% tiền ví (40% thành công)`,
                       `> Thất bại bị phạt 10% tiền bản thân | Cooldown 5 phút`
                   ].join('\n'));
          } else if (category === 'help_pet') {
              embed.setTitle('🐾 Pet RPG — Thú Cưng')
                   .setDescription([
                       '**🔴 Săn & Mua Pet**',
                       `\`/hunt\` hoặc \`${PREFIX}hunt\` — Bắt Pet ngẫu nhiên *(cần Bóng Bắt Pet trong shop)*`,
                       `\`/petshop\` hoặc \`${PREFIX}petshop\` *(chưa có prefix)* — Mua Pet trực tiếp theo độ hiếm`,
                       '',
                       '**🐾 Quản Lý & Chiến Đấu**',
                       `\`/pets\` hoặc \`${PREFIX}pets\` — Mở Trung Tâm Thú Cưng (menu tương tác)`,
                       `\`/pb <mã pet>\` hoặc \`${PREFIX}pb <mã pet>\` — Đem Pet đi đánh quái kiếm JC & EXP`,
                       `> 📋 Độ hiếm: Thường → Hiếm → Siêu Hiếm → Thần Thoại → **Truyền Thuyết**`,
                       `> ⚔️ Pet thắng nhận JC + EXP, đủ EXP sẽ **LEVEL UP** tăng HP/ATK`,
                       `> ⏱️ Cooldown chiến đấu: **5 phút/lần**`
                   ].join('\n'));
          } else if (category === 'help_love') {
              embed.setTitle('❤️ Tình Yêu & Hôn Nhân')
                   .setDescription([
                       '**💕 Hẹn Hò Mù Quáng**',
                       `\`/henho\` hoặc \`${PREFIX}hh\` — Bot ghép bạn với người độc thân ngẫu nhiên`,
                       `> Người đó có **60 giây** để đồng ý/từ chối | Bị từ chối = cooldown 5 phút`,
                       '',
                       '**💍 Cầu Hôn**',
                       `\`${PREFIX}marry @user\` hoặc \`${PREFIX}kethon @user\` — Cầu hôn người ấy`,
                       `> Yêu cầu phải có **Nhẫn Cưới** trong túi (mua tại Shop)`,
                       `> Người kia có 30 giây để đồng ý`,
                       '',
                       '**💔 Ly Hôn**',
                       `\`${PREFIX}divorce @user\` hoặc \`${PREFIX}lyhon @user\` — Đệ đơn ly hôn`,
                       `> Cần sự đồng ý của cả hai bên trong 30 giây`,
                       '',
                       '**💍 Nhẫn Cưới** *(mua tại \`/shop\` → Tiệm Kim Hoàn)*',
                       `Bạc (20M) → Vàng (40M) → Bạch Kim (60M) → Kim Cương (80M) → Vĩnh Cửu (100M)`
                   ].join('\n'));
          } else if (category === 'help_music') {
              embed.setTitle('🎵 Hệ Thống Âm Nhạc')
                   .setDescription([
                       '> 🎤 Bot phải đang ở trong kênh Voice (dùng `1join`) trước khi phát nhạc',
                       '',
                       '**▶️ Phát Nhạc**',
                       `\`${PREFIX}play <link/tên>\` hoặc \`${PREFIX}p <link/tên>\` — Phát nhạc hoặc thêm vào hàng đợi`,
                       `> Hỗ trợ: **YouTube**, **SoundCloud**, **TikTok** và nhiều nguồn khác`,
                       `> Có thể nhập link trực tiếp hoặc tên bài hát để tìm kiếm trên YouTube`,
                       '',
                       '**🎮 Điều Khiển** *(dùng nút bấm trên embed nhạc)*',
                       `⏸️ **Tạm dừng/Tiếp tục** — Pause hoặc resume nhạc`,
                       `⏭️ **Bỏ qua** — Chuyển sang bài tiếp theo`,
                       `⏹️ **Dừng** — Dừng nhạc và xóa hàng đợi`,
                       `🔁 **Lặp** — Bật/tắt chế độ lặp bài hiện tại`,
                       `📋 **Hàng đợi** — Xem danh sách bài chờ`,
                       '',
                       '**🔊 Voice Bot**',
                       `\`${PREFIX}join\` — Bot vào kênh Voice bạn đang ở *(chỉ Admin)*`,
                       `\`${PREFIX}leave\` — Bot rời Voice *(chỉ Admin)*`
                   ].join('\n'));
          } else if (category === 'help_admin') {
              if (interaction.user.id !== SUPER_ADMIN_ID && !db.isAdmin(interaction.user.id)) {
                  embed.setDescription('🚫 **LỖI:** Bạn không có quyền truy cập mục này!');
                  embed.setColor('#FF0000');
              } else {
                  embed.setTitle('🛡️ Bảng Điều Khiển Admin')
                       .setDescription('**Các lệnh dành cho Admin:**\n\n' +
                                       '• /setwelcome <kênh>: Cài đặt kênh chào mừng\n' +
                                       '• /jail <@user> <lý do>: Bỏ tù người chơi\n' +
                                       '• /gcreate, /gend, /greroll, /gedit: Quản lý Giveaway\n' +
                                       '• Chatbot tự động: Tag @Bot hoặc nhắn bình thường (10% cơ hội trả lời)');
              }
          } else if (category === 'help_new') {
              embed.setTitle('✨ Các Tính Năng Mới')
                   .setDescription('**Hệ thống Giveaway & Chatbot:**\n\n• Chat với Bot: Tag @Bot hoặc nhắn tin bình thường, bot sẽ tự động học và trả lời!\n• Giveaway: Tham gia nhận quà hấp dẫn bằng cách ấn nút khi thấy thông báo Giveaway từ Admin!');
          } else if (category === 'help_util') {
              embed.setTitle('🤖 Tiện Ích & Cấp Độ')
                   .setDescription([
                       '**📝 Hồ Sơ & Thông Tin**',
                       `\`/profile [@user]\` hoặc \`${PREFIX}pf [@user]\` — Xem hồ sơ chi tiết`,
                       `\`/av [@user]\` hoặc \`${PREFIX}av [@user]\` — Xem ảnh đại diện full size`,
                       `\`/ping\` hoặc \`${PREFIX}ping\` — Kiểm tra độ trễ bot`,
                       '',
                       '**⭐ Cấp Độ (Chat & Voice)**',
                       `\`/rank [@user]\` hoặc \`${PREFIX}rank [@user]\` — Xem thẻ cấp độ Chat & Voice`,
                       `\`/toprank\` hoặc \`${PREFIX}toprank\` — Top 10 Level Chat & Voice Server`,
                       `> 💬 Chat để nhận **15-25 EXP/tin nhắn** (cooldown 1 phút)`,
                       `> 🎤 Ở trong Voice để nhận **10 EXP/phút** (tính khi ra kênh)`,
                       '',
                       '**🏆 Bảng Xếp Hạng**',
                       `\`/top\` hoặc \`${PREFIX}top\` — Top 10 Đại Gia (Tổng Tài Sản)`,
                       `\`/toprank\` — Top 10 Level Chat & Voice`,
                       '',
                       '**🎁 Phần Thưởng Hàng Ngày**',
                       `\`/daily\` hoặc \`${PREFIX}daily\` — Nhận **50,000 JC** mỗi ngày (cooldown 24h)`
                   ].join('\n'));
          }

          await interaction.update({ embeds: [embed], components: interaction.message.components });
          return;
      }

      if (interaction.customId.startsWith('shop_select')) {
          const itemName = interaction.values[0];
          const itemData = SHOP_ITEMS[itemName];
          if (itemData && (itemData.type === 'bait' || itemData.type === 'lamp' || itemData.type === 'ball')) {
              const modal = new ModalBuilder()
                  .setCustomId(`buy_modal_${itemName}`)
                  .setTitle(`Mua ${itemName}`);
              const input = new TextInputBuilder()
                  .setCustomId('amount')
                  .setLabel('Số lượng muốn mua:')
                  .setStyle(TextInputStyle.Short)
                  .setValue('1')
                  .setRequired(true);
              modal.addComponents(new ActionRowBuilder().addComponents(input));
              return interaction.showModal(modal);
          }
          return interaction.reply(handleBuy(interaction.user, itemName));
      }
      if (interaction.customId === 'sell_select') {
          return interaction.reply(handleSell(interaction.user, interaction.values[0]));
      }
      if (interaction.customId === 'zone_select_fish') {
          return interaction.reply(processAction(interaction.user, 'fish', interaction.values[0]));
      }
      if (interaction.customId === 'zone_select_mine') {
          return interaction.reply(processAction(interaction.user, 'mine', interaction.values[0]));
      }
  }

  if (interaction.isAutocomplete()) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    if (interaction.commandName === 'sell' || interaction.commandName === 's') {
      const invItems = db.getInventory(interaction.user.id, guildId);
      const choices = invItems.map(i => {
          const code = ITEM_CODES[i.item] ? ` (#${ITEM_CODES[i.item]})` : '';
          return { name: `${i.item}${code} (x${i.amount})`, value: i.item };
      });
      const filtered = choices.filter(c => c.name.toLowerCase().includes(focusedValue) || c.value.toLowerCase().includes(focusedValue)).slice(0, 25);
      await interaction.respond(filtered);
      return;
    } else if (interaction.commandName === 'buy') {
      const choices = Object.keys(SHOP_ITEMS);
      const filtered = choices.filter(c => c.toLowerCase().includes(focusedValue)).slice(0, 25);
      await interaction.respond(filtered.map(c => ({ name: c, value: c })));
      return;
    }
    return;
  }


  
  if (interaction.isButton() && interaction.customId === 'gw_join') {
      const gw = activeGiveaways[interaction.message.id];
      if (!gw || gw.ended) return interaction.reply({ content: '❌ Giveaway đã kết thúc!', ephemeral: true });
      if (!gw.participants.includes(interaction.user.id)) {
          gw.participants.push(interaction.user.id);
          saveGiveaways();
          const embed = buildGiveawayEmbed(gw);
          await interaction.message.edit({ embeds: [embed] });
          return interaction.reply({ content: `✅ Bạn đã tham gia Giveaway **${gw.prize}** thành công! Chúc may mắn! 🍀`, ephemeral: true });
      } else {
          return interaction.reply({ content: `ℹ️ Bạn đã tham gia rồi! (${gw.participants.length} người đang tham gia)`, ephemeral: true });
      }
  }

  if (interaction.isButton() && interaction.customId === 'gw_list') {
      const gw = activeGiveaways[interaction.message.id];
      if (!gw) return interaction.reply({ content: '❌ Giveaway không tìm thấy!', ephemeral: true });

      if (gw.participants.length === 0) {
          return interaction.reply({ content: '📭 Chưa có ai tham gia giveaway này!', ephemeral: true });
      }

      // Lấy username của từng participant (cache trước)
      const lines = [];
      for (let i = 0; i < gw.participants.length; i++) {
          const userId = gw.participants[i];
          lines.push(`**${i + 1}.** <@${userId}>`);
      }

      // Chia thành nhiều trang nếu quá dài
      const chunkSize = 20;
      const chunks = [];
      for (let i = 0; i < lines.length; i += chunkSize) {
          chunks.push(lines.slice(i, i + chunkSize).join('\n'));
      }

      const listEmbed = new EmbedBuilder()
          .setColor(gw.color || '#FF6B6B')
          .setTitle(`👥 Danh Sách Tham Gia — ${gw.prize}`)
          .setDescription(chunks[0])
          .addFields({ name: '📊 Thống kê', value: `Tổng: **${gw.participants.length}** người • 🏆 Sẽ chọn **${gw.winnerCount}** người thắng`, inline: false })
          .setFooter({ text: chunks.length > 1 ? `Trang 1/${chunks.length} (chỉ hiển thị 20 đầu)` : `Tổng ${gw.participants.length} người tham gia` })
          .setTimestamp();

      return interaction.reply({ embeds: [listEmbed], ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId.startsWith('baucua_btn_')) {
      const channelId = interaction.channelId;
      if (!activeBauCuaSessions.has(channelId)) {
          return interaction.reply({ content: 'Bàn Bầu Cua này đã đóng hoặc không tồn tại!', ephemeral: true });
      }
      const choiceId = interaction.customId.replace('baucua_btn_', '');
      const choiceName = BAUCUA_NAMES[choiceId];
      const modal = new ModalBuilder().setCustomId('baucua_modal_' + choiceId).setTitle(`Đặt cược: ${choiceName}`);
      const betInput = new TextInputBuilder().setCustomId('baucua_bet_amount').setLabel('Nhập số tiền cược (hoặc gõ "all"):').setStyle(TextInputStyle.Short).setPlaceholder('VD: 10000, 50k, all').setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(betInput));
      await interaction.showModal(modal);
      return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('baucua_modal_')) {
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
      db.addBalance(user.id, guildId, -bet.amount);
      session.bets[choiceId].push({ userId: user.id, username: user.username, amount: bet.amount });
      session.totalBet += bet.amount;
      await updateBauCuaUI(session);
      return interaction.reply({ content: `✅ Bạn đã cược thành công **${bet.amount.toLocaleString('en-US')} JC Coin** vào **${BAUCUA_NAMES[choiceId]}**!`, ephemeral: true });
  }

  if (!interaction.isChatInputCommand()) return;

  // Kiểm tra kênh bị chặn (bỏ qua Admin)
  const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);
  if (isChannelBlocked(interaction.channelId) && !checkAdmin(interaction.user.id)) {
      return interaction.reply({ content: `🚫 Bot không hoạt động trong kênh này! Hãy dùng lệnh ở kênh khác nhé.`, ephemeral: true });
  }

  const cmd = interaction.commandName;
  const user = interaction.user;

  if (cmd === 'balance' || cmd === 'bal' || cmd === 'b') {
      const targetUser = interaction.options.getUser('user') || user;
      return interaction.reply({ embeds: [handleBalance(targetUser)] });
  }
  if (cmd === 'inv') {
      const targetUser = interaction.options.getUser('user') || user;
      return interaction.reply(handleInventory(targetUser));
  }
  
    if (cmd === 'baucua') return handleBauCuaUI(interaction, true);
    if (cmd === 'shop') return interaction.reply(handleShop());
  if (cmd === 'buy') return interaction.reply(handleBuy(user, interaction.options.getString('item'), interaction.options.getInteger('amount')));
  if (cmd === 'sell' || cmd === 's') return interaction.reply(handleSell(user, interaction.options.getString('item'), interaction.options.getInteger('amount')));
  if (cmd === 'sellall' || cmd === 'sa') return interaction.reply(handleSellAll(user));
  if (cmd === 'fish' || cmd === 'f') return interaction.reply(handleAction(user, 'fish', interaction.options.getString('zone')));
  if (cmd === 'mine' || cmd === 'm') return interaction.reply(handleAction(user, 'mine', interaction.options.getString('zone')));
  if (cmd === 'give') {
      await doGiveConfirmation(true, interaction, user, interaction.options.getUser('user'), interaction.options.getInteger('amount'));
      return;
  }
  if (cmd === 'work') return interaction.reply(handleWork(user));
  if (cmd === 'claim') return interaction.reply(handleClaim(user));
  if (cmd === 'daily') return interaction.reply(handleDaily(user));
  if (cmd === 'bank') return interaction.reply(handleBankUI(user));
  if (cmd === 'deposit' || cmd === 'dep' || cmd === 'gui') return interaction.reply(handleDeposit(user, interaction.options.getString('amount')));
  if (cmd === 'withdraw' || cmd === 'with' || cmd === 'rut') return interaction.reply(handleWithdraw(user, interaction.options.getString('amount')));
  
  if (cmd === 'buyrole') {
      await handleBuyRole(true, interaction, interaction.member, user);
      return;
  }
  
  if (cmd === 'marry' || cmd === 'kethon') {
      await handleMarry(true, interaction, user, interaction.options.getUser('user'));
      return;
  }
  
  if (cmd === 'ghepdoi') {
      await handleGhepDoi(true, interaction, user);
      return;
  }
  
  if (cmd === 'divorce' || cmd === 'lyhon') {
      await handleDivorce(true, interaction, user, interaction.options.getUser('user'));
      return;
  }

  if (cmd === 'henho') {
      await handleHenHo(true, interaction, user, interaction.guild);
      return;
  }
  
  if (cmd === 'admindivorce') {
      await handleAdminDivorce(true, interaction, user, interaction.options.getUser('user'));
      return;
  }


  
  if (cmd === 'gcreate') return handleGiveawayCreate(interaction);
  if (cmd === 'gend') return handleGiveawayEnd(interaction);
  if (cmd === 'greroll') return handleGiveawayReroll(interaction);
  if (cmd === 'glist') return handleGiveawayList(interaction);
  if (cmd === 'gedit') return handleGiveawayEdit(interaction);
  if (cmd === 'help') return interaction.reply(handleHelpCustom());

  if (cmd === 'masoi') {
      await masoi.handleCommand(interaction);
      return;
  }
  if (cmd === 'ping') {
      const sent = await interaction.reply({ content: 'Đang đo ping...', fetchReply: true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.round(client.ws.ping);
      return interaction.editReply(`🏓 Pong!\nĐộ trễ tin nhắn: **${latency}ms**\nĐộ trễ API (WebSocket): **${apiLatency}ms**`);
  }
  if (cmd === 'rob') return interaction.reply(handleRob(user, interaction.options.getUser('user')));
  if (cmd === 'robbank') return interaction.reply(handleRobBank(user, interaction.options.getUser('user')));
  
  if (cmd === 'bj') {
      await handleBlackjack(true, interaction, user, interaction.options.getString('amount'));
      return;
  }

  if (cmd === 'tx') {
      await doTaiXiuAnimation(true, interaction, user, interaction.options.getString('chon'), interaction.options.getString('tien'));
      return;
  }
  
  if (cmd === 'cl') {
      await doChanLeAnimation(true, interaction, user, interaction.options.getString('chon'), interaction.options.getString('tien'));
      return;
  }
  
  if (cmd === 'top') {
      await interaction.deferReply();
      const topResponse = await handleTop();
      return interaction.editReply(topResponse);
  }
  
  if (cmd === 'toprank') {
      await interaction.deferReply();
      const topRankResponse = await handleTopRank();
      return interaction.editReply(topRankResponse);
  }
  
  if (cmd === 'profile' || cmd === 'info' || cmd === 'pf') {
      const target = interaction.options.getUser('user') || user;
      return interaction.reply(handleProfile(target));
  }
  
  if (cmd === 'av') {
      const target = interaction.options.getUser('user') || user;
      return interaction.reply(handleAvatar(target));
  }
  
  if (cmd === 'rank') {
      const target = interaction.options.getUser('user') || user;
      return interaction.reply(handleRank(target));
  }
  
  if (cmd === 'hunt' || cmd === 'sanpet') {
      return interaction.reply(handleHunt(user));
  }
  if (cmd === 'pets') {
      return interaction.reply(handlePetsUI(user));
  }
  if (cmd === 'petshop') {
      return interaction.reply(handlePetShop(user));
  }
  if (cmd === 'pb') {
      return interaction.reply(handlePetBattle(user, interaction.options.getString('pet_id')));
  }
  
  // checkAdmin đã được khai báo ở trên
  
  if (cmd === 'jail') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: 'Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      const messagesRequired = interaction.options.getInteger('messages') || 100;
      
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.reply({ content: 'Người này không có trong server!', ephemeral: true });
      if (checkAdmin(targetUser.id)) return interaction.reply({ content: 'Không thể bắt giam Admin!', ephemeral: true });
      
      db.jailUser(targetUser.id, guildId, messagesRequired);
      try {
          await targetMember.roles.add('1499243874319601664');
          return interaction.reply(`🚨 **BÁO ĐỘNG!** 🚨\n<@${targetUser.id}> đã bị đưa vào nhà tù do vi phạm nội quy! Để được thả ra, phạm nhân cần phải spam đủ **${messagesRequired} tin nhắn** trong kênh <#1491629719169273956> để hoàn thành nghĩa vụ lao động công ích!`);
      } catch (e) {
          return interaction.reply({ content: 'Lỗi cấp role nhà tù. Vui lòng kiểm tra quyền của Bot!', ephemeral: true });
      }
  }

  if (cmd === 'unjail') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: 'Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      db.unjailUser(targetUser.id, guildId);
      if (targetMember) {
          try {
              await targetMember.roles.remove('1499243874319601664');
          } catch (e) {}
      }
      return interaction.reply(`🕊️ **Ân Xá!** 🕊️\n<@${targetUser.id}> đã được Admin ân xá và tự do trở lại với xã hội!`);
  }

  if (cmd === 'setwinrate') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: 'Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      const rate = interaction.options.getInteger('rate');
      if (rate < 0 || rate > 100) return interaction.reply({ content: 'Tỉ lệ phải từ 0 đến 100!', ephemeral: true });
      
      const currentBuff = db.getCasinoBuff(targetUser.id, guildId);
      db.setCasinoBuff(targetUser.id, guildId, rate, currentBuff.payout);
      return interaction.reply(`🎲 Đã set **Win Rate** Casino của <@${targetUser.id}> thành **${rate}%**!`);
  }

  if (cmd === 'setpayout') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: 'Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      const rate = interaction.options.getNumber('rate');
      if (rate < 0) return interaction.reply({ content: 'Hệ số không hợp lệ!', ephemeral: true });
      
      const currentBuff = db.getCasinoBuff(targetUser.id, guildId);
      db.setCasinoBuff(targetUser.id, guildId, currentBuff.winRate, rate);
      return interaction.reply(`💸 Đã set **Payout Multiplier** Casino của <@${targetUser.id}> thành **x${rate}**!`);
  }

  if (cmd === 'checkbuff') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: 'Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      const currentBuff = db.getCasinoBuff(targetUser.id, guildId);
      return interaction.reply(`🔍 **Casino Buff của ${targetUser.username}:**\n- Tỉ lệ thắng (Win Rate): **${currentBuff.winRate > 0 ? currentBuff.winRate + '%' : 'Bình thường'}**\n- Hệ số thưởng (Payout): **${currentBuff.payout > 0 ? 'x' + currentBuff.payout : 'Bình thường'}**`);
  }
  if (cmd === 'dautu') {
      await handleDeposit_Investment(true, interaction, user, interaction.options.getString('tien'));
      return;
  }
  if (cmd === 'rutdautu') {
      const investId = interaction.options.getInteger('id') || null;
      await handleWithdraw_Investment(true, interaction, user, investId);
      return;
  }

  if (cmd === 'blockbot') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const channelId = targetChannel.id;
      const channelMention = `<#${channelId}>`;

      if (blockedChannels.has(channelId)) {
          blockedChannels.delete(channelId);
          saveBlockedChannels();
          return interaction.reply(`✅ Đã **bỏ chặn** bot trong kênh ${channelMention}! Bot sẽ hoạt động bình thường ở đó.`);
      } else {
          blockedChannels.add(channelId);
          saveBlockedChannels();
          return interaction.reply(`🔒 Đã **chặn** bot trong kênh ${channelMention}! Người dùng sẽ không thể dùng lệnh bot ở kênh đó nữa.`);
      }
  }

  // ===== LỆNH TREO ROOM =====
  if (cmd === 'treoroom') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      if (!targetUser) return interaction.reply({ content: '❌ Vui lòng chọn người cần treo room!', ephemeral: true });
      if (checkAdmin(targetUser.id)) return interaction.reply({ content: '❌ Không thể treo room của Admin!', ephemeral: true });
      if (targetUser.bot) return interaction.reply({ content: '❌ Không thể treo room của Bot!', ephemeral: true });

      const thoigianStr = interaction.options.getString('thoigian') || '0';
      const lydo = interaction.options.getString('lydo') || 'Vi phạm nội quy';

      // Parse thời gian: 1h, 30m, 7d, 0 = vĩnh viễn
      let durationMs = 0;
      let durationText = 'Vĩnh viễn';
      if (thoigianStr !== '0') {
          const match = thoigianStr.match(/^(\d+(\.\d+)?)(s|m|h|d)$/i);
          if (!match) return interaction.reply({ content: '❌ Thời gian không hợp lệ! Ví dụ: `30m`, `2h`, `7d`, hoặc `0` để vĩnh viễn.', ephemeral: true });
          const num = parseFloat(match[1]);
          const unit = match[3].toLowerCase();
          if (unit === 's') { durationMs = num * 1000; durationText = `${num} giây`; }
          else if (unit === 'm') { durationMs = num * 60 * 1000; durationText = `${num} phút`; }
          else if (unit === 'h') { durationMs = num * 60 * 60 * 1000; durationText = `${num} giờ`; }
          else if (unit === 'd') { durationMs = num * 24 * 60 * 60 * 1000; durationText = `${num} ngày`; }
      }

      const expiresAt = db.suspendVoice(targetUser.id, guildId, user.id, lydo, durationMs);

      // Nếu user đang trong voice → kick ra, bot join vào canh
      const guild = interaction.guild;
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      let botJoinedChannel = null;
      if (member && member.voice.channelId) {
          botJoinedChannel = member.voice.channelId;
          try { await member.voice.disconnect('Bị treo room bởi Admin'); } catch (e) {}
          // Bot join vào kênh đó để canh
          await botJoinSuspensionChannel(guild, botJoinedChannel, targetUser.id);
      }

      const expiryText = expiresAt > 0
          ? `\n⏰ **Hết hạn:** <t:${Math.floor(expiresAt / 1000)}:F>`
          : '\n⏰ **Hết hạn:** Vĩnh viễn';

      const botStatus = botJoinedChannel
          ? `\n🤖 **Bot đang canh** tại <#${botJoinedChannel}>`
          : '';

      const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🔇 Treo Room Thành Công')
          .addFields(
              { name: '👤 Người bị treo', value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
              { name: '👮 Admin thực hiện', value: `<@${user.id}>`, inline: true },
              { name: '⏱️ Thời hạn', value: durationText, inline: true },
              { name: '📝 Lý do', value: lydo, inline: false }
          )
          .setDescription(expiryText + botStatus)
          .setFooter({ text: 'Dùng /botreo để gỡ treo room và bot rời khỏi kênh' })
          .setTimestamp();

      return interaction.reply({ embeds: [embed] });
  }

  if (cmd === 'botreo') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      if (!targetUser) return interaction.reply({ content: '❌ Vui lòng chọn người cần gỡ treo!', ephemeral: true });

      const suspension = db.getVoiceSuspension(targetUser.id, guildId);
      if (!suspension) return interaction.reply({ content: `❌ <@${targetUser.id}> không đang bị treo room!`, ephemeral: true });

      db.unsuspendVoice(targetUser.id, guildId);
      // Bot rời khỏi kênh voice
      botLeaveSuspensionChannel(interaction.guild.id);

      const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🔊 Gỡ Treo Room Thành Công')
          .setDescription(`<@${targetUser.id}> đã được **gỡ treo room** và có thể vào kênh Voice bình thường trở lại!\n🤖 Bot đã rời khỏi kênh Voice.`)
          .addFields(
              { name: '👮 Admin thực hiện', value: `<@${user.id}>`, inline: true },
              { name: '📝 Lý do treo trước đó', value: suspension.reason || 'Không có', inline: true }
          )
          .setTimestamp();

      return interaction.reply({ embeds: [embed] });
  }

  if (cmd === 'listtreo') {
      if (!checkAdmin(user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới có quyền dùng lệnh này!', ephemeral: true });

      const list = db.getAllSuspendedVoice(guildId);
      if (list.length === 0) {
          return interaction.reply({ content: '✅ Hiện không có ai đang bị treo room!', ephemeral: true });
      }

      const lines = list.map((s, i) => {
          const expText = s.expires_at > 0 ? `<t:${Math.floor(s.expires_at / 1000)}:R>` : 'Vĩnh viễn';
          return `**${i + 1}.** <@${s.user_id}> | Lý do: *${s.reason}* | Hết hạn: ${expText}`;
      });

      const embed = new EmbedBuilder()
          .setColor('#e67e22')
          .setTitle(`📋 Danh Sách Treo Room (${list.length} người)`)
          .setDescription(lines.join('\n') || 'Không có ai.')
          .setFooter({ text: 'Dùng /botreo @user để gỡ treo cho ai đó' })
          .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

async function processLevelUp(userId, newLevel, isVoice = false) {
    const channel = client.channels.cache.get('1491624428394774761');
    if (!channel) return;
    
    let levelsConfig;
    try {
        levelsConfig = JSON.parse(require('fs').readFileSync('./levels.json', 'utf8'));
    } catch (e) {
        return channel.send(`🎉 Chúc mừng <@${userId}> đã đạt **Level ${newLevel}**!`);
    }

    let config = levelsConfig.default;
    if (levelsConfig.milestones && levelsConfig.milestones[newLevel.toString()]) {
        config = levelsConfig.milestones[newLevel.toString()];
    }

    if (config.reward_gold > 0) {
        db.addBalance(userId, guildId, config.reward_gold);
    }

    let msgText = config.message.replace('{reward}', config.reward_gold.toLocaleString());
    let prefix = isVoice ? "🎙️ Trò chuyện Voice quá hăng hái!\n" : "";

    const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle(`🌟 LEVEL UP! 🌟`)
        .setDescription(`${prefix}${msgText}`);

    let attachment;
    try {
        attachment = new AttachmentBuilder(`./images/${config.image}`);
        embed.setImage(`attachment://${config.image}`);
    } catch(e) {}

    const payload = { 
        content: `🎉 Chúc mừng <@${userId}> đã xuất sắc thăng cấp lên **Level ${newLevel}**!`,
        embeds: [embed] 
    };
    if (attachment) payload.files = [attachment];

    channel.send(payload);
}

// --- PREFIX COMMANDS HANDLER ---
client.on('messageCreate', async message => {
    if (!message.guild) return;
    guildId = message.guild.id;
    if (message.content.trim() === '1baucua' || message.content.trim() === '?baucua' || message.content.trim() === 'baucua') {
        return handleBauCuaUI(message, false);
    }

    if (message.author.bot) return;

    if (message.mentions.has(client.user) && !message.mentions.everyone && !message.author.bot) {
        const jokes = [
            "Đang bận đếm tiền Bầu Cua, đừng gọi nữa!",
            "Gọi gì tao đấy? Định xin tiền à, mơ đi cưng =))",
            "Đẹp trai quá cũng khổ, suốt ngày bị réo tên...",
            "Tôi chỉ là một con bot vô tri, nhưng tôi biết bạn đang cháy túi =))",
            "Đừng tag nữa, nạp thêm tiền đi rồi nói chuyện!",
            "Chơi Bầu Cua toàn thua mà cứ thích gọi bot là sao?",
            "Không cho vay tiền đâu, khỏi nịnh hót!",
            "Đang tính xác suất ra 3 con Bầu, làm phiền quá!",
            "Thắng làm vua, thua thì đi farm EXP đi bạn êy."
        ];
        return message.reply(jokes[Math.floor(Math.random() * jokes.length)]);
    }



    if (!message.content.startsWith(PREFIX)) {
        if (!xpCooldowns.has(message.author.id)) {
            const xpToAdd = Math.floor(Math.random() * 11) + 15; // 15-25 EXP
            const { leveledUp, newLevel } = db.addExp(message.author.id, guildId, xpToAdd);
            if (leveledUp) {
                processLevelUp(message.author.id, newLevel, false);
            }
            xpCooldowns.add(message.author.id);
            setTimeout(() => xpCooldowns.delete(message.author.id), 60000); // 1 minute cooldown
        }
        // Kiểm tra Auto-Responder
        if (!isChannelBlocked(message.channelId)) {
            const arResponse = checkAutoResponder(message.content);
            if (arResponse) {
                message.reply(arResponse).catch(() => {});
            }
        }
        return;
    }

    // Kiểm tra kênh bị chặn (bỏ qua Admin)
    if (isChannelBlocked(message.channelId) && !(message.author.id === SUPER_ADMIN_ID || db.isAdmin(message.author.id))) {
        return message.reply('🚫 Bot không hoạt động trong kênh này! Hãy dùng lệnh ở kênh khác nhé.');
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const user = message.author;

    const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);

    // ===== LỆNH JOIN / LEAVE VOICE =====
    if (cmd === 'join') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');
        
        const member = message.member;
        if (!member.voice.channelId) {
            return message.reply('❌ Bạn phải đang ở trong một kênh thoại để bot vào theo!');
        }

        const voiceChannel = member.voice.channel;
        const success = await botPermanentJoin(message.guild, voiceChannel.id);
        
        if (success) {
            return message.reply(`🔊 Bot đã vào kênh **${voiceChannel.name}** và sẽ ở đây mãi mãi! Dùng \`${PREFIX}leave\` để bot rời đi.`);
        } else {
            return message.reply('❌ Không thể vào kênh thoại! Kiểm tra quyền bot.');
        }
    }

    if (cmd === 'leave') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');
        
        if (!autoVoiceChannelId) {
            return message.reply('❌ Bot hiện không ở trong kênh thoại nào cả!');
        }

        botPermanentLeave();
        return message.reply('🔇 Bot đã rời khỏi kênh thoại!');
    }

    // ===== LỆNH PHÁT NHẠC =====
    if (cmd === 'play' || cmd === 'p') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Vui lòng nhập link hoặc tên bài hát! Ví dụ: `1play <link YouTube/SoundCloud>` hoặc `1play tên bài hát`');

        const member = message.member;
        if (!member.voice.channelId) {
            return message.reply('❌ Bạn phải vào kênh thoại trước khi phát nhạc!');
        }

        const voiceChannel = member.voice.channel;
        const loadingMsg = await message.reply('🔍 Đang tìm kiếm và tải nhạc...');

        try {
            let songInfo = null;

            // Kiểm tra xem có phải URL không
            const isUrl = query.startsWith('http://') || query.startsWith('https://');

            if (isUrl) {
                // Xử lý URL trực tiếp bằng yt-dlp (hỗ trợ YouTube, SoundCloud, TikTok, v.v.)
                try {
                    const info = await youtubedl(query, {
                        dumpSingleJson: true,
                        noCheckCertificates: true,
                        noWarnings: true,
                        preferFreeFormats: true,
                        noPlaylist: true,
                    });

                    songInfo = {
                        title: info.title || 'Không rõ tên',
                        url: info.webpage_url || query,
                        duration: formatDurationSecs(info.duration),
                        thumbnail: info.thumbnail || null,
                        requestedBy: user.id
                    };
                } catch (urlErr) {
                    // Nếu URL không hợp lệ → thử tìm trên YouTube
                    const searchResult = await youtubedl(`ytsearch1:${query}`, {
                        dumpSingleJson: true,
                        noCheckCertificates: true,
                        noWarnings: true,
                        noPlaylist: true,
                    });

                    if (!searchResult || !searchResult.title) {
                        return loadingMsg.edit('❌ Không tìm thấy bài hát nào!');
                    }

                    songInfo = {
                        title: searchResult.title,
                        url: searchResult.webpage_url,
                        duration: formatDurationSecs(searchResult.duration),
                        thumbnail: searchResult.thumbnail || null,
                        requestedBy: user.id
                    };
                }
            } else {
                // Tìm kiếm trên YouTube bằng tên bài hát
                const searchResult = await youtubedl(`ytsearch1:${query}`, {
                    dumpSingleJson: true,
                    noCheckCertificates: true,
                    noWarnings: true,
                    noPlaylist: true,
                });

                if (!searchResult || !searchResult.title) {
                    return loadingMsg.edit('❌ Không tìm thấy bài hát nào trên YouTube!');
                }

                songInfo = {
                    title: searchResult.title,
                    url: searchResult.webpage_url,
                    duration: formatDurationSecs(searchResult.duration),
                    thumbnail: searchResult.thumbnail || null,
                    requestedBy: user.id
                };
            }

            if (!songInfo) {
                return loadingMsg.edit('❌ Không thể xử lý link này!');
            }

            // Đảm bảo bot trong voice
            const connection = await ensureBotInVoice(message.guild, voiceChannel.id);
            let queue = getMusicQueue(message.guild.id);
            if (!queue) {
                queue = createMusicQueue(message.guild, message.channel, connection);
            } else {
                queue.textChannel = message.channel;
                queue.connection = connection;
                connection.subscribe(queue.player);
            }

            queue.songs.push(songInfo);

            if (queue.songs.length === 1 && !queue.playing) {
                await loadingMsg.delete().catch(() => {});
                playSong(queue);
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('➕ Đã Thêm Vào Hàng Đợi')
                    .setDescription(`[**${songInfo.title}**](${songInfo.url})`)
                    .addFields(
                        { name: '⏱️ Thời lượng', value: songInfo.duration || 'N/A', inline: true },
                        { name: '📋 Vị trí', value: `#${queue.songs.length}`, inline: true }
                    )
                    .setFooter({ text: `👤 Yêu cầu bởi ${user.username}` });
                if (songInfo.thumbnail) embed.setThumbnail(songInfo.thumbnail);
                await loadingMsg.edit({ content: null, embeds: [embed] });
            }
        } catch (e) {
            console.error('[Music] Play Error:', e);
            loadingMsg.edit(`❌ Lỗi: ${e.message}`).catch(() => {});
        }
        return;
    }

    // Các lệnh nhạc khác đã chuyển sang dùng nút bấm trên embed

    


  if (cmd === 'addadmin') {
        if (user.id !== SUPER_ADMIN_ID) return message.reply("Chỉ Chủ Bot mới có quyền thêm Admin!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người muốn cấp quyền Admin (Ví dụ: \`${PREFIX}addadmin @ABC\`)`);
        if (checkAdmin(targetUser.id)) return message.reply(`${targetUser.username} đã là Admin rồi!`);
        db.addAdmin(targetUser.id);
        return message.reply(`✅ Đã cấp quyền Admin thành công cho **${targetUser.username}**! Người này hiện có thể dùng các lệnh như hack tiền, xóa tiền, phát lương...`);
    }

    if (cmd === 'removeadmin' || cmd === 'deladmin') {
        if (user.id !== SUPER_ADMIN_ID) return message.reply("Chỉ Chủ Bot mới có quyền xóa Admin!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người muốn thu hồi quyền Admin (Ví dụ: \`${PREFIX}removeadmin @ABC\`)`);
        if (targetUser.id === SUPER_ADMIN_ID) return message.reply("Không thể thu hồi quyền của Chủ Bot!");
        if (!db.isAdmin(targetUser.id)) return message.reply(`${targetUser.username} không phải là Admin!`);
        db.removeAdmin(targetUser.id);
        return message.reply(`⛔ Đã thu hồi quyền Admin của **${targetUser.username}**!`);
    }

    if (cmd === 'addcoin') {
        if (!checkAdmin(user.id)) return message.reply("Bạn không có quyền dùng lệnh này!");
        const amount = parseInt(args[0]);
        if (isNaN(amount)) return message.reply("Vui lòng nhập một số hợp lệ!");
        db.addBalance(user.id, guildId, amount);
        return message.reply(`Đã hack thành công **${amount} JC** vào tài khoản của bạn! 👑`);
    }

    if (cmd === 'giveall' || cmd === 'phatluong') {
        if (!checkAdmin(user.id)) return message.reply("Chỉ Admin mới có quyền phát tiền cho toàn server!");
        const amount = parseInt(args[0] === '@everyone' ? args[1] : args[0]);
        if (isNaN(amount) || amount <= 0) return message.reply(`Vui lòng nhập số tiền hợp lệ! (Ví dụ: \`${PREFIX}giveall 500000\`)`);

        const allUsers = db.getAllUsers();
        let count = 0;
        for (const u of allUsers) {
            db.addBalance(u.id, guildId, amount);
            count++;
        }
        return message.channel.send(`🎉 **QUÀ TẶNG TOÀN SERVER!**\nAdmin ${user} vừa hào phóng phát **${amount.toLocaleString('en-US')} JC** cho tất cả **${count}** người chơi! @everyone\n*(Hãy gõ \`${PREFIX}bal\` để kiểm tra ví)*`);
    }

    if (cmd === 'delcoin' || cmd === 'removecoin') {
        if (!checkAdmin(user.id)) return message.reply("Bạn không có quyền dùng lệnh này!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người muốn xóa tiền (Ví dụ: \`${PREFIX}delcoin @ABC 500000\`)`);
        
        const amountStr = args.find(arg => !arg.startsWith('<@'));
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) return message.reply("Vui lòng nhập số tiền hợp lệ!");

        db.addBalance(targetUser.id, guildId, -amount);
        return message.reply(`Đã xóa thành công **${amount} JC** khỏi tài khoản của **${targetUser.username}**! 💸`);
    }

    if (cmd === 'addvippets') {
        if (!checkAdmin(user.id)) return message.reply("Bạn không có quyền dùng lệnh này!");
        const targetUser = message.mentions.users.first() || user;
        
        const speciesList = PET_SPECIES['Truyền Thuyết'];
        for (const species of speciesList) {
            const hp = 99999;
            const atk = 9999;
            const petId = db.addPet(targetUser.id, guildId, species, 'Truyền Thuyết', hp, atk);
            db.updatePet(petId, 100, 0, hp, atk); // set level 100, exp 0, max hp/atk
        }
        return message.reply(`Đã tặng full bộ sưu tập **Pet Truyền Thuyết** (Lv 100, HP: 99,999 - ATK: 9,999) cho **${targetUser.username}**! 👑🐉`);
    }

    if (cmd === 'addxp') {
        if (!checkAdmin(user.id)) return message.reply("Chỉ có Admin mới được dùng lệnh này!");
        const targetUser = message.mentions.users.first() || message.author;
        const xpAmount = parseInt(args[targetUser.id === message.author.id ? 0 : 1]);
        if (isNaN(xpAmount) || xpAmount <= 0) return message.reply('Cú pháp: `!addxp [@user] <số lượng>`');
        
        const { leveledUp, newLevel } = db.addExp(targetUser.id, guildId, xpAmount);
        let msg = `✨ Đã bơm thêm **${xpAmount} EXP** cho ${targetUser.username}.`;
        
        if (leveledUp) {
            processLevelUp(targetUser.id, newLevel, false);
        }
        return message.reply(msg);
    }

    if (cmd === 'sale') {
        const isDealer = message.member && message.member.roles.cache.has(DEALER_ROLE_ID);
        if (!checkAdmin(user.id) && !isDealer) return message.reply("Chỉ có Admin hoặc người có Role Đại Lý mới được dùng lệnh này để bán xu!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người mua xu (Ví dụ: \`${PREFIX}sale @ABC 500000\`)`);
        
        const amountStr = args.find(arg => !arg.startsWith('<@'));
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) return message.reply("Vui lòng nhập số xu hợp lệ!");

        const text = `⚠️ Đại lý xác nhận bơm **${amount} JC** vào tài khoản của **${targetUser.username}**?`;
        
        await requestConfirmation(message, user, text, () => {
            db.addBalance(targetUser.id, guildId, amount);
            return `✅ Giao dịch thành công! Đã bơm **${amount} JC** vào tài khoản của **${targetUser.username}**! 💳`;
        }, () => `❌ Đã hủy giao dịch bán xu cho **${targetUser.username}**.`, false);
        return;
    }

    if (cmd === 'masoi') {
        return message.reply('❌ Lệnh Ma Sói đã được chuyển sang Slash Command! Vui lòng gõ `/masoi create` để tạo phòng nhé! (Nếu không thấy lệnh, hãy khởi động lại Discord hoặc gõ / sau đó chọn avatar của bot)');
    }

    if (cmd === 'balance' || cmd === 'bal' || cmd === 'b') {
        const targetUser = message.mentions.users.first() || user;
        return message.reply({ embeds: [handleBalance(targetUser)] });
    }
    if (cmd === 'inv' || cmd === 'inventory') {
        const targetUser = message.mentions.users.first() || user;
        return message.reply(handleInventory(targetUser));
    }
    if (cmd === 'shop') return message.reply(handleShop());
    if (cmd === 'buy') {
        let amount = 1;
        let itemName = args.join(' ');
        if (args.length > 1 && !isNaN(parseInt(args[args.length - 1]))) {
            amount = parseInt(args.pop());
            itemName = args.join(' ');
        }
        return message.reply(handleBuy(user, itemName, amount));
    }
    if (cmd === 'sell' || cmd === 's') return message.reply(handleSell(user, args.join(' ')));
    if (cmd === 'sellall' || cmd === 'sa') return message.reply(handleSellAll(user));
    if (cmd === 'fish' || cmd === 'f') return message.reply(handleAction(user, 'fish', args.join(' ')));
    if (cmd === 'mine' || cmd === 'm') return message.reply(handleAction(user, 'mine', args.join(' ')));
    if (cmd === 'work') return message.reply(handleWork(user));
    if (cmd === 'claim') return message.reply(handleClaim(user));
    if (cmd === 'daily' || cmd === 'd') return message.reply(handleDaily(user));
    if (cmd === 'bank') return message.reply(handleBankUI(user));
    if (cmd === 'deposit' || cmd === 'dep' || cmd === 'gui') return message.reply(handleDeposit(user, args[0]));
    if (cmd === 'withdraw' || cmd === 'with' || cmd === 'rut') return message.reply(handleWithdraw(user, args[0]));
    
    if (cmd === 'buyrole') {
        await handleBuyRole(false, message, message.member, user);
        return;
    }

    if (cmd === 'marry' || cmd === 'kethon') {
        const targetUser = message.mentions.users.first();
        await handleMarry(false, message, user, targetUser);
        return;
    }
    
    if (cmd === 'ghepdoi' || cmd === '1ghepdoi') {
        await handleGhepDoi(false, message, user);
        return;
    }
    
    if (cmd === 'divorce' || cmd === 'lyhon') {
        const targetUser = message.mentions.users.first();
        await handleDivorce(false, message, user, targetUser);
        return;
    }

    if (cmd === 'henho' || cmd === 'hh') {
        await handleHenHo(false, message, user, message.guild);
        return;
    }

    if (cmd === 'help' || cmd === 'h') return message.reply(handleHelpCustom());
    
    if (cmd === 'adminhelp' || cmd === 'ah') {
        const checkAdmin = (userId) => userId === SUPER_ADMIN_ID || db.isAdmin(userId);
        if (!checkAdmin(user.id)) return message.reply("Lệnh này chỉ dành cho Admin!");
        return message.reply(handleAdminHelp());
    }
    
    if (cmd === 'ping') {
        const sent = await message.reply('Đang đo ping...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        return sent.edit(`🏓 Pong!\nĐộ trễ tin nhắn: **${latency}ms**\nĐộ trễ API (WebSocket): **${apiLatency}ms**`);
    }
    
    if (cmd === 'bj') {
        await handleBlackjack(false, message, user, args[0]);
        return;
    }

    if (cmd === 'tx') {
        await doTaiXiuAnimation(false, message, user, args[0], args[1]);
        return;
    }
    
    if (cmd === 'cl') {
        await doChanLeAnimation(false, message, user, args[0], args[1]);
        return;
    }
    
    if (cmd === 'give') {
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người muốn chuyển tiền (Ví dụ: \`${PREFIX}give @ABC 100\`)`);
        const amountStr = args.find(arg => !arg.startsWith('<@'));
        await doGiveConfirmation(false, message, user, targetUser, amountStr);
        return;
    }

    if (cmd === 'rob') {
        const targetUser = message.mentions.users.first();
        return message.reply(handleRob(user, targetUser));
    }
    
    if (cmd === 'top' || cmd === 'lb') {
        const loadingMsg = await message.reply("Đang tính toán tài sản của toàn server...");
        const topResponse = await handleTop();
        return loadingMsg.edit({ content: null, embeds: topResponse.embeds });
    }
    
    if (cmd === 'toprank') {
        const loadingMsg = await message.reply("Đang tính toán bảng xếp hạng level...");
        const topRankResponse = await handleTopRank();
        return loadingMsg.edit({ content: null, embeds: topRankResponse.embeds });
    }
    
    if (cmd === 'profile' || cmd === 'info' || cmd === 'pf') {
        const targetUser = message.mentions.users.first() || user;
        return message.reply(handleProfile(targetUser));
    }
    
    if (cmd === 'av') {
        const targetUser = message.mentions.users.first() || user;
        return message.reply(handleAvatar(targetUser));
    }
    
    if (cmd === 'rank') {
        const targetUser = message.mentions.users.first() || user;
        return message.reply(handleRank(targetUser));
    }
    
    if (cmd === 'dautu') {
        await handleDeposit_Investment(false, message, user, args[0]);
        return;
    }
    if (cmd === 'rutdautu' || cmd === 'rd') {
        const investId = args[0] ? parseInt(args[0]) : null;
        await handleWithdraw_Investment(false, message, user, isNaN(investId) ? null : investId);
        return;
    }

    if (cmd === 'hunt' || cmd === 'sanpet') {
        return message.reply(handleHunt(user));
    }
    if (cmd === 'pets') {
        return message.reply(handlePetsUI(user));
    }
    if (cmd === 'pb' || cmd === 'petbattle') {
        return message.reply(handlePetBattle(user, args[0]));
    }

    if (cmd === 'treoroom' || cmd === 'tr') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người cần treo room (Ví dụ: \`${PREFIX}treoroom @ABC 1h Vi phạm\`)`);
        if (checkAdmin(targetUser.id)) return message.reply('❌ Không thể treo room của Admin!');
        if (targetUser.bot) return message.reply('❌ Không thể treo room của Bot!');

        const nonMentionArgs = args.filter(a => !a.startsWith('<@'));
        const thoigianStr = nonMentionArgs[0] || '0';
        const lydo = nonMentionArgs.slice(1).join(' ') || 'Vi phạm nội quy';

        let durationMs = 0;
        let durationText = 'Vĩnh viễn';
        if (thoigianStr !== '0') {
            const match = thoigianStr.match(/^(\d+(\.\d+)?)(s|m|h|d)$/i);
            if (!match) return message.reply('❌ Thời gian không hợp lệ! Ví dụ: `30m`, `2h`, `7d`, hoặc `0` để vĩnh viễn.');
            const num = parseFloat(match[1]);
            const unit = match[3].toLowerCase();
            if (unit === 's') { durationMs = num * 1000; durationText = `${num} giây`; }
            else if (unit === 'm') { durationMs = num * 60 * 1000; durationText = `${num} phút`; }
            else if (unit === 'h') { durationMs = num * 60 * 60 * 1000; durationText = `${num} giờ`; }
            else if (unit === 'd') { durationMs = num * 24 * 60 * 60 * 1000; durationText = `${num} ngày`; }
        }

        const expiresAt = db.suspendVoice(targetUser.id, guildId, user.id, lydo, durationMs);

        // Nếu user đang trong voice → kick ra, bot join vào canh
        const targetMemberVoice = await message.guild.members.fetch(targetUser.id).catch(() => null);
        let botJoinedChannel = null;
        if (targetMemberVoice && targetMemberVoice.voice.channelId) {
            botJoinedChannel = targetMemberVoice.voice.channelId;
            try { await targetMemberVoice.voice.disconnect('Bị treo room bởi Admin'); } catch (e) {}
            await botJoinSuspensionChannel(message.guild, botJoinedChannel, targetUser.id);
        }

        const expiryLine = expiresAt > 0 ? `\n⏰ **Hết hạn:** <t:${Math.floor(expiresAt / 1000)}:F>` : '\n⏰ **Hết hạn:** Vĩnh viễn';
        const botLine = botJoinedChannel ? `\n🤖 **Bot đang canh** tại <#${botJoinedChannel}>` : '';
        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🔇 Treo Room Thành Công')
            .setDescription(expiryLine + botLine)
            .addFields(
                { name: '👤 Người bị treo', value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
                { name: '👮 Admin thực hiện', value: `<@${user.id}>`, inline: true },
                { name: '⏱️ Thời hạn', value: durationText, inline: true },
                { name: '📝 Lý do', value: lydo, inline: false }
            )
            .setFooter({ text: `Dùng ${PREFIX}botreo @user để gỡ treo room và bot rời kênh` })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    if (cmd === 'botreo' || cmd === 'bt') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người cần gỡ treo (Ví dụ: \`${PREFIX}botreo @ABC\`)`);

        const suspension = db.getVoiceSuspension(targetUser.id, guildId);
        if (!suspension) return message.reply(`❌ <@${targetUser.id}> không đang bị treo room!`);

        db.unsuspendVoice(targetUser.id, guildId);
        // Bot rời kênh voice
        botLeaveSuspensionChannel(message.guild.id);
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🔊 Gỡ Treo Room Thành Công')
            .setDescription(`<@${targetUser.id}> đã được **gỡ treo room** và có thể vào kênh Voice bình thường trở lại!\n🤖 Bot đã rời khỏi kênh Voice.`)
            .addFields(
                { name: '👮 Admin thực hiện', value: `<@${user.id}>`, inline: true },
                { name: '📝 Lý do treo trước đó', value: suspension.reason || 'Không có', inline: true }
            )
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    if (cmd === 'listtreo' || cmd === 'lt') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');

        const list = db.getAllSuspendedVoice(guildId);
        if (list.length === 0) return message.reply('✅ Hiện không có ai đang bị treo room!');

        const lines = list.map((s, i) => {
            const expText = s.expires_at > 0 ? `<t:${Math.floor(s.expires_at / 1000)}:R>` : 'Vĩnh viễn';
            return `**${i + 1}.** <@${s.user_id}> | Lý do: *${s.reason}* | Hết hạn: ${expText}`;
        });
        const embed = new EmbedBuilder()
            .setColor('#e67e22')
            .setTitle(`📋 Danh Sách Treo Room (${list.length} người)`)
            .setDescription(lines.join('\n') || 'Không có ai.')
            .setFooter({ text: `Dùng ${PREFIX}botreo @user để gỡ treo cho ai đó` })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'admindivorce' || cmd === 'cuongchelyhon') {
        const targetUser = message.mentions.users.first();
        await handleAdminDivorce(false, message, user, targetUser);
        return;
    }

    if (cmd === 'jail') {
        if (!checkAdmin(user.id)) return message.reply("Bạn không có quyền dùng lệnh này!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người muốn giam giữ (Ví dụ: \`${PREFIX}jail @ABC 100\`)`);
        if (checkAdmin(targetUser.id)) return message.reply("Không thể bắt giam Admin!");
        
        let messagesRequired = 100;
        const msgArg = args.find(arg => !arg.startsWith('<@'));
        if (msgArg && !isNaN(parseInt(msgArg))) messagesRequired = parseInt(msgArg);
        
        const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) return message.reply("Người này không có trong server!");
        
        db.jailUser(targetUser.id, guildId, messagesRequired);
        try {
            await targetMember.roles.add('1499243874319601664');
            return message.reply(`🚨 **BÁO ĐỘNG!** 🚨\n<@${targetUser.id}> đã bị đưa vào nhà tù do vi phạm nội quy! Để được thả ra, phạm nhân cần phải spam đủ **${messagesRequired} tin nhắn** trong kênh <#1491629719169273956> để hoàn thành nghĩa vụ lao động công ích!`);
        } catch (e) {
            return message.reply("Lỗi cấp role nhà tù. Vui lòng kiểm tra quyền của Bot!");
        }
    }

    if (cmd === 'unjail') {
        if (!checkAdmin(user.id)) return message.reply("Bạn không có quyền dùng lệnh này!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người muốn ân xá (Ví dụ: \`${PREFIX}unjail @ABC\`)`);
        
        const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        
        db.unjailUser(targetUser.id, guildId);
        if (targetMember) {
            try {
                await targetMember.roles.remove('1499243874319601664');
            } catch (e) {}
        }
        return message.reply(`🕊️ **Ân Xá!** 🕊️\n<@${targetUser.id}> đã được Admin ân xá và tự do trở lại với xã hội!`);
    }

    if (cmd === 'setwinrate') {
        if (!checkAdmin(user.id)) return message.reply("Chỉ Admin mới có quyền dùng lệnh này!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người chơi (Ví dụ: \`${PREFIX}setwinrate @ABC 100\`)`);
        
        const rateArg = args.find(arg => !arg.startsWith('<@'));
        const rate = parseInt(rateArg);
        if (isNaN(rate) || rate < 0 || rate > 100) return message.reply("Tỉ lệ phải từ 0 đến 100!");
        
        const currentBuff = db.getCasinoBuff(targetUser.id, guildId);
        db.setCasinoBuff(targetUser.id, guildId, rate, currentBuff.payout);
        return message.reply(`🎲 Đã set **Win Rate** Casino của <@${targetUser.id}> thành **${rate}%**!`);
    }

    if (cmd === 'setpayout') {
        if (!checkAdmin(user.id)) return message.reply("Chỉ Admin mới có quyền dùng lệnh này!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người chơi (Ví dụ: \`${PREFIX}setpayout @ABC 5\`)`);
        
        const rateArg = args.find(arg => !arg.startsWith('<@'));
        const rate = parseFloat(rateArg);
        if (isNaN(rate) || rate < 0) return message.reply("Hệ số không hợp lệ!");
        
        const currentBuff = db.getCasinoBuff(targetUser.id, guildId);
        db.setCasinoBuff(targetUser.id, guildId, currentBuff.winRate, rate);
        return message.reply(`💸 Đã set **Payout Multiplier** Casino của <@${targetUser.id}> thành **x${rate}**!`);
    }

    if (cmd === 'checkbuff') {
        if (!checkAdmin(user.id)) return message.reply("Chỉ Admin mới có quyền dùng lệnh này!");
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`Vui lòng tag người chơi (Ví dụ: \`${PREFIX}checkbuff @ABC\`)`);
        
        const currentBuff = db.getCasinoBuff(targetUser.id, guildId);
        return message.reply(`🔍 **Casino Buff của ${targetUser.username}:**\n- Tỉ lệ thắng (Win Rate): **${currentBuff.winRate > 0 ? currentBuff.winRate + '%' : 'Bình thường'}**\n- Hệ số thưởng (Payout): **${currentBuff.payout > 0 ? 'x' + currentBuff.payout : 'Bình thường'}**`);
    }

    // ===== LỆNH AUTO-RESPONDER =====
    if (cmd === 'addreply' || cmd === 'ar') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');
        // Cú pháp: 1addreply [--exact|--starts] trigger | response
        const fullArgs = message.content.slice(PREFIX.length + cmd.length).trim();

        // Phân tích match type
        let matchType = 'contains';
        let restArgs = fullArgs;
        if (fullArgs.startsWith('--exact ')) { matchType = 'exact'; restArgs = fullArgs.slice(8); }
        else if (fullArgs.startsWith('--starts ')) { matchType = 'startsWith'; restArgs = fullArgs.slice(9); }

        const separatorIdx = restArgs.indexOf('|');
        if (separatorIdx === -1) {
            return message.reply([
                `❌ Cú pháp sai! Dùng dấu **|** để ngăn cách trigger và response.`,
                `📌 Ví dụ:`,
                `\`${PREFIX}addreply xin chào | Chào mừng bạn đến với server! 👋\``,
                `\`${PREFIX}addreply --exact bye | Tạm biệt! Hẹn gặp lại 👋\` *(chính xác từng chữ)*`,
                `\`${PREFIX}addreply --starts giá | Bot đang không bán hàng nhé 😅\` *(bắt đầu bằng)*`
            ].join('\n'));
        }

        const trigger = restArgs.slice(0, separatorIdx).trim();
        const response = restArgs.slice(separatorIdx + 1).trim();

        if (!trigger || !response) return message.reply('❌ Trigger và response không được để trống!');
        if (trigger.length > 200) return message.reply('❌ Trigger quá dài! Tối đa 200 ký tự.');
        if (response.length > 1800) return message.reply('❌ Response quá dài! Tối đa 1800 ký tự.');

        // Kiểm tra trùng trigger
        const existing = autoResponders.find(r => r.trigger.toLowerCase() === trigger.toLowerCase() && r.matchType === matchType);
        if (existing) return message.reply(`❌ Trigger **"${trigger}"** (${matchType}) đã tồn tại rồi! Xoá trước bằng \`${PREFIX}delreply ${existing.id}\`.`);

        const newRule = { id: getNextARId(), trigger, response, matchType };
        autoResponders.push(newRule);
        saveAutoResponders();

        const typeLabel = matchType === 'exact' ? '🎯 Khớp chính xác' : matchType === 'startsWith' ? '🔤 Bắt đầu bằng' : '🔍 Có chứa';
        return message.reply([
            `✅ **Đã thêm Auto-Responder #${newRule.id}!**`,
            `📌 Trigger: \`${trigger}\` — ${typeLabel}`,
            `💬 Response: ${response}`
        ].join('\n'));
    }

    if (cmd === 'delreply' || cmd === 'dr') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');
        const id = parseInt(args[0]);
        if (isNaN(id)) return message.reply(`❌ Vui lòng nhập ID cần xoá! Ví dụ: \`${PREFIX}delreply 3\``);

        const idx = autoResponders.findIndex(r => r.id === id);
        if (idx === -1) return message.reply(`❌ Không tìm thấy Auto-Responder với ID **#${id}**!`);

        const removed = autoResponders.splice(idx, 1)[0];
        saveAutoResponders();
        return message.reply(`🗑️ **Đã xoá Auto-Responder #${id}!**\nTrigger đã xoá: \`${removed.trigger}\``);
    }

    if (cmd === 'listreply' || cmd === 'lr') {
        if (!checkAdmin(user.id)) return message.reply('🚫 Chỉ Admin mới có quyền dùng lệnh này!');
        if (autoResponders.length === 0) return message.reply('📭 Chưa có Auto-Responder nào được cài đặt!');

        const typeEmoji = { contains: '🔍', exact: '🎯', startsWith: '🔤' };
        const lines = autoResponders.map(r => {
            const preview = r.response.length > 60 ? r.response.slice(0, 57) + '...' : r.response;
            return `**#${r.id}** ${typeEmoji[r.matchType] || '🔍'} \`${r.trigger}\` → ${preview}`;
        });

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`🤖 Danh Sách Auto-Responder (${autoResponders.length} quy tắc)`)
            .setDescription(lines.join('\n'))
            .addFields({
                name: '📖 Hướng Dẫn',
                value: [
                    `🔍 **Có chứa**: Bot rep khi tin nhắn **có** chứa từ khoá`,
                    `🎯 **Chính xác**: Bot rep khi tin nhắn **đúng bằng** trigger`,
                    `🔤 **Bắt đầu**: Bot rep khi tin nhắn **bắt đầu bằng** trigger`,
                    `\`${PREFIX}addreply <trigger> | <response>\` — Thêm mới`,
                    `\`${PREFIX}delreply <id>\` — Xoá theo ID`
                ].join('\n')
            })
            .setFooter({ text: 'Legend Main Auto-Responder System' });
        return message.reply({ embeds: [embed] });
    }
});

client.on('messageCreate', async message => {
    if (!message.guild) return;
    guildId = message.guild.id;
    if (message.author.bot) return;

    // Logic kiểm tra spam nhà tù (Chỉ check nếu tin nhắn nằm ở kênh 1491629719169273956)
    if (message.channel.id === '1491629719169273956') {
        const jailStatus = db.getJailStatus(message.author.id, guildId);
        if (jailStatus) {
            const isCompleted = db.addJailMessage(message.author.id, guildId);
            if (isCompleted) {
                // Tháo role
                const targetMember = message.member;
                if (targetMember) {
                    try {
                        await targetMember.roles.remove('1499243874319601664');
                    } catch (e) {}
                }
                db.unjailUser(message.author.id, guildId);
                return message.channel.send(`🎉 Chúc mừng <@${message.author.id}> đã hoàn thành nghĩa vụ lao động xã hội (${jailStatus.messages_required} tin nhắn) và chính thức được thả tự do! Hãy làm lại cuộc đời nhé!`);
            } else {
                // Xóa bớt tin nhắn thông báo tiến độ đi để tránh spam chính bot
                // Nhưng nếu muốn báo thì báo mỗi 10 tin
                const msgs = jailStatus.messages_sent + 1;
                if (msgs % 10 === 0) {
                    message.channel.send(`⏳ Tiến độ của <@${message.author.id}>: **${msgs} / ${jailStatus.messages_required}** tin nhắn.`);
                }
            }
        }
    }
});

// === HỆ THỐNG TÍNH EXP VOICE + KIỂM TRA TREO ROOM ===
// EXP được tính: 10 EXP/phút khi ở trong kênh voice
client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member?.user?.id || oldState.member?.user?.id;
    if (!userId) return;
    if (newState.member?.user?.bot) return;

    const wasInVoice = !!oldState.channelId;
    const isInVoice  = !!newState.channelId;

    // ===== KIỂM TRA TREO ROOM =====
    // Nếu user VÀO kênh voice (từ ngoài vào, hoặc chuyển kênh) và đang bị treo → kick ra
    if (isInVoice && db.isVoiceSuspended(userId, guildId)) {
        const member = newState.member;
        if (member) {
            try {
                await member.voice.disconnect('Bị treo room - cấm vào kênh Voice');
                // Gửi thông báo DM
                const suspension = db.getVoiceSuspension(userId, guildId);
                const expText = suspension && suspension.expires_at > 0
                    ? `<t:${Math.floor(suspension.expires_at / 1000)}:F>`
                    : 'Vĩnh viễn';
                const reason = suspension ? suspension.reason : 'Vi phạm nội quy';
                const dmEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🔇 Bạn Đang Bị Treo Room!')
                    .setDescription('Bạn không được phép vào kênh Voice trong server này.')
                    .addFields(
                        { name: '📝 Lý do', value: reason, inline: true },
                        { name: '⏰ Hết hạn', value: expText, inline: true }
                    )
                    .setFooter({ text: 'Liên hệ Admin để biết thêm thông tin' })
                    .setTimestamp();
                member.send({ embeds: [dmEmbed] }).catch(() => {});
            } catch (e) {}
        }
        return; // Không tính EXP cho người bị treo
    }

    if (!wasInVoice && isInVoice) {
        // User vừa VÀO kênh voice → bắt đầu tính thời gian
        voiceJoinTimes.set(userId, Date.now());
    } else if (wasInVoice && !isInVoice) {
        // User vừa RA khỏi kênh voice → tính EXP dựa trên thời gian thực
        const joinTime = voiceJoinTimes.get(userId);
        if (joinTime) {
            const minutesSpent = Math.floor((Date.now() - joinTime) / 60000);
            voiceJoinTimes.delete(userId);
            if (minutesSpent >= 1) {
                const expToAdd = minutesSpent * 10; // 10 EXP/phút
                const { leveledUp, newLevel } = db.addVoiceExp(userId, guildId, expToAdd);
                if (leveledUp) processLevelUp(userId, newLevel, true);
            }
        }
    }
    // Trường hợp chuyển kênh (wasInVoice && isInVoice): giữ nguyên joinTime, không reset
});

// Khởi tạo joinTime cho các user đã có mặt trong voice khi bot khởi động
client.once('ready', () => {
    setTimeout(() => {
        for (const guild of client.guilds.cache.values()) {
            for (const voiceState of guild.voiceStates.cache.values()) {
                if (!voiceState.member || voiceState.member.user.bot) continue;
                if (voiceState.channelId && !voiceJoinTimes.has(voiceState.member.id)) {
                    voiceJoinTimes.set(voiceState.member.id, Date.now());
                }
            }
        }
    }, 3000); // Đợi 3s để cache load xong
});

// Interval mỗi 5 phút: cộng EXP định kỳ cho user đang trong voice
// (Đảm bảo không bị mất EXP nếu bot restart, chỉ tính phần chưa được cộng)
setInterval(() => {
    const now = Date.now();
    for (const guild of client.guilds.cache.values()) {
        for (const voiceState of guild.voiceStates.cache.values()) {
            if (!voiceState.member || voiceState.member.user.bot) continue;
            if (!voiceState.channelId) continue;

            const userId = voiceState.member.id;
            const joinTime = voiceJoinTimes.get(userId);

            if (joinTime) {
                // Tính số phút đã ở trong kênh kể từ lần check cuối
                const minutesSinceJoin = Math.floor((now - joinTime) / 60000);
                if (minutesSinceJoin >= 1) {
                    const expToAdd = minutesSinceJoin * 10; // 10 EXP/phút
                    // Reset lại joinTime về hiện tại để tránh tính double
                    voiceJoinTimes.set(userId, now);
                    const { leveledUp, newLevel } = db.addVoiceExp(userId, guildId, expToAdd);
                    if (leveledUp) processLevelUp(userId, newLevel, true);
                }
            } else {
                // Fallback: user đã trong voice nhưng chưa có joinTime
                voiceJoinTimes.set(userId, now);
            }
        }
    }
}, 5 * 60 * 1000); // Mỗi 5 phút

client.login(process.env.DISCORD_TOKEN);


client.on('guildMemberAdd', async (member) => {
    const config = db.getGuildConfig(member.guild.id);
    if (config && config.welcome_channel_id) {
        const channel = member.guild.channels.cache.get(config.welcome_channel_id);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#ff9f43')
                .setTitle(`🎉 Chào mừng đến với ${member.guild.name}!`)
                .setDescription(`Xin chào <@${member.id}>! Rất vui được gặp bạn.\nHiện tại server đang có **${member.guild.memberCount}** thành viên.\nHãy dùng lệnh `/help` để khám phá các tính năng của bot nhé!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setImage(config.welcome_image || null)
                .setFooter({ text: 'Chúc bạn có những giây phút vui vẻ!' })
                .setTimestamp();
            channel.send({ content: `Chào mừng <@${member.id}>!`, embeds: [embed] }).catch(()=>{});
        }
    }
});


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
    const hostMention = gw.hostId ? `<@${gw.hostId}>` : gw.hostedBy;
    const embed = new EmbedBuilder().setColor(gw.color || '#FF6B6B').setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(`⭐ **${gw.prize}**\n\n> Nhấn nút **🎉 Tham Gia** bên dưới để vào!\n\n⏰ **Kết thúc:** <t:${endTs}:R>\n🏆 **Số người thắng:** ${gw.winnerCount}\n👥 **Tham gia:** ${gw.participants.length}\n🎙️ **Tổ chức bởi:** ${hostMention}`)
        .setFooter({ text: `ID: ${gw.messageId || 'Đang tải...'}` }).setTimestamp(gw.endTime);
    if (gw.banner) { try { embed.setImage(gw.banner); } catch {} }
    return embed;
}

function buildGiveawayButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_join').setLabel('🎉 Tham Gia').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('gw_list').setLabel('👥 Xem Danh Sách').setStyle(ButtonStyle.Secondary)
    );
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

        const hostMention = gw.hostId ? `<@${gw.hostId}>` : `**${gw.hostedBy}**`;
        const winnerMentions = gw.winners.length > 0
            ? gw.winners.map(id => `<@${id}>`).join(', ')
            : '❌ Không có ai tham gia!';

        if (msg) {
            const endedEmbed = new EmbedBuilder()
                .setColor(gw.winners.length > 0 ? '#2ECC71' : '#95A5A6')
                .setTitle('🎊 GIVEAWAY KẾT THÚC 🎊')
                .setDescription(
                    `⭐ **${gw.prize}**\n\n` +
                    `🏆 **Người thắng:** ${winnerMentions}\n` +
                    `👥 **Tổng tham gia:** ${gw.participants.length}\n` +
                    `🎙️ **Tổ chức bởi:** ${hostMention}`
                )
                .setFooter({ text: `ID: ${messageId}` })
                .setTimestamp();
            await msg.edit({ embeds: [endedEmbed], components: [] });
        }

        if (gw.winners.length > 0) {
            // Tag host + winners
            const allMentions = [...new Set([...(gw.hostId ? [gw.hostId] : []), ...gw.winners])];
            await channel.send({
                content: `🎊 **GIVEAWAY KẾT THÚC!**\n\n🎙️ ${hostMention} ơi, giveaway của bạn đã kết thúc!\n\n🏆 Chúc mừng ${winnerMentions} đã thắng **${gw.prize}**! Vui lòng liên hệ ${hostMention} để nhận thưởng nhé! 🎁`,
                allowedMentions: { users: allMentions }
            });
        } else {
            const allMentions = gw.hostId ? [gw.hostId] : [];
            await channel.send({
                content: `😢 ${hostMention} ơi, giveaway **${gw.prize}** kết thúc mà không có người tham gia!`,
                allowedMentions: { users: allMentions }
            });
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
        prize, winnerCount,
        hostedBy: interaction.user.username,
        hostId: interaction.user.id,
        endTime: Date.now() + durationMs, participants: [], ended: false, messageId: null, winners: [],
        color: interaction.options.getString('mau') || '#FF6B6B',
        banner: interaction.options.getString('banner') || null
    };

    const embed = buildGiveawayEmbed(gw);
    const row = buildGiveawayButtons();

    await interaction.reply({ content: `✅ Đang tạo Giveaway **${prize}**...`, ephemeral: true });
    const sentMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
    gw.messageId = sentMsg.id;
    // Cập nhật lại embed với messageId đúng
    const embedWithId = buildGiveawayEmbed(gw);
    await sentMsg.edit({ embeds: [embedWithId] });
    activeGiveaways[sentMsg.id] = gw;
    saveGiveaways();
    giveawayTimers.set(sentMsg.id, setTimeout(() => endGiveaway(sentMsg.id), durationMs));
}

// ===== /gend — Kết thúc sớm =====
async function handleGiveawayEnd(interaction) {
    const checkAdmin = (id) => id === SUPER_ADMIN_ID || db.isAdmin(id);
    if (!checkAdmin(interaction.user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới dùng được lệnh này!', ephemeral: true });

    const messageId = interaction.options.getString('id').trim();
    const gw = activeGiveaways[messageId];
    if (!gw) return interaction.reply({ content: `❌ Không tìm thấy Giveaway với ID \`${messageId}\`!`, ephemeral: true });
    if (gw.ended) return interaction.reply({ content: '⚠️ Giveaway này đã kết thúc rồi!', ephemeral: true });
    if (gw.guildId !== interaction.guild.id) return interaction.reply({ content: '❌ Giveaway này không thuộc server này!', ephemeral: true });

    await interaction.reply({ content: `✅ Đang kết thúc Giveaway **${gw.prize}**...`, ephemeral: true });
    await endGiveaway(messageId);
}

// ===== /greroll — Chọn lại người thắng =====
async function handleGiveawayReroll(interaction) {
    const checkAdmin = (id) => id === SUPER_ADMIN_ID || db.isAdmin(id);
    if (!checkAdmin(interaction.user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới dùng được lệnh này!', ephemeral: true });

    const messageId = interaction.options.getString('id').trim();
    const gw = activeGiveaways[messageId];
    if (!gw) return interaction.reply({ content: `❌ Không tìm thấy Giveaway với ID \`${messageId}\`!`, ephemeral: true });
    if (!gw.ended) return interaction.reply({ content: '⚠️ Giveaway này chưa kết thúc! Dùng `/gend` trước.', ephemeral: true });
    if (gw.participants.length === 0) return interaction.reply({ content: '😢 Không có người tham gia để chọn lại!', ephemeral: true });

    gw.winners = pickWinners(gw.participants, gw.winnerCount);
    saveGiveaways();

    const winnerMentions = gw.winners.map(id => `<@${id}>`).join(', ');
    const embed = new EmbedBuilder()
        .setColor('#F39C12')
        .setTitle('🔄 Reroll — Chọn Lại Người Thắng')
        .setDescription(`🎁 **Phần thưởng:** ${gw.prize}\n\n🏆 **Người thắng mới:** ${winnerMentions}`)
        .setFooter({ text: `Reroll bởi ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await interaction.channel.send({ content: `🎊 Reroll! Chúc mừng ${winnerMentions} đã thắng **${gw.prize}**!`, allowedMentions: { users: gw.winners } });
}

// ===== /glist — Danh sách giveaway đang chạy =====
async function handleGiveawayList(interaction) {
    const allGws = Object.values(activeGiveaways).filter(gw => !gw.ended && gw.guildId === interaction.guild.id);

    if (allGws.length === 0) {
        return interaction.reply({ content: '📭 Hiện không có Giveaway nào đang diễn ra!', ephemeral: true });
    }

    const lines = allGws.map((gw, i) => {
        const endTs = Math.floor(gw.endTime / 1000);
        return `**${i + 1}.** 🎁 **${gw.prize}** — 🏆 ${gw.winnerCount} người — 👥 ${gw.participants.length} tham gia — ⏰ <t:${endTs}:R>\n> \`ID: ${gw.messageId}\``;
    });

    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle(`🎉 Giveaway Đang Diễn Ra (${allGws.length})`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Dùng /gend <id> để kết thúc • /greroll <id> để chọn lại • /gedit <id> để sửa' })
        .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ===== /gedit — Chỉnh sửa giveaway =====
async function handleGiveawayEdit(interaction) {
    const checkAdmin = (id) => id === SUPER_ADMIN_ID || db.isAdmin(id);
    if (!checkAdmin(interaction.user.id)) return interaction.reply({ content: '🚫 Chỉ Admin mới dùng được lệnh này!', ephemeral: true });

    const messageId = interaction.options.getString('id').trim();
    const gw = activeGiveaways[messageId];
    if (!gw) return interaction.reply({ content: `❌ Không tìm thấy Giveaway với ID \`${messageId}\`!`, ephemeral: true });
    if (gw.ended) return interaction.reply({ content: '⚠️ Giveaway này đã kết thúc, không thể chỉnh sửa!', ephemeral: true });
    if (gw.guildId !== interaction.guild.id) return interaction.reply({ content: '❌ Giveaway này không thuộc server này!', ephemeral: true });

    // Mở Modal để chỉnh sửa
    const modal = new ModalBuilder()
        .setCustomId(`gedit_modal_${messageId}`)
        .setTitle('✏️ Chỉnh Sửa Giveaway');

    const prizeInput = new TextInputBuilder()
        .setCustomId('gedit_prize')
        .setLabel('Phần thưởng')
        .setStyle(TextInputStyle.Short)
        .setValue(gw.prize)
        .setRequired(true);

    const winnersInput = new TextInputBuilder()
        .setCustomId('gedit_winners')
        .setLabel('Số người thắng')
        .setStyle(TextInputStyle.Short)
        .setValue(String(gw.winnerCount))
        .setRequired(true);

    const timeInput = new TextInputBuilder()
        .setCustomId('gedit_addtime')
        .setLabel('Thêm/bớt thời gian (VD: +30m, -1h, bỏ trống = giữ nguyên)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('+30m hoặc -1h ...');

    modal.addComponents(
        new ActionRowBuilder().addComponents(prizeInput),
        new ActionRowBuilder().addComponents(winnersInput),
        new ActionRowBuilder().addComponents(timeInput)
    );

    return interaction.showModal(modal);
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
