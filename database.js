const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);

// ===== SCHEMA =====
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT,
    guild_id TEXT,
    balance INTEGER DEFAULT 250000,
    bank INTEGER DEFAULT 0,
    last_fish_zone TEXT,
    last_mine_zone TEXT,
    shield_until INTEGER DEFAULT 0,
    casino_win_rate INTEGER DEFAULT 0,
    casino_payout REAL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT,
    guild_id TEXT,
    item TEXT,
    amount INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, item)
  );

  CREATE TABLE IF NOT EXISTS work (
    user_id TEXT,
    guild_id TEXT,
    last_work INTEGER DEFAULT 0,
    job_index INTEGER DEFAULT -1,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS daily (
    user_id TEXT,
    guild_id TEXT,
    last_claim INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS relationships (
    user_id TEXT,
    guild_id TEXT,
    partner_id TEXT,
    status TEXT,
    timestamp INTEGER,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    user_id TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS jail (
    user_id TEXT,
    guild_id TEXT,
    messages_sent INTEGER DEFAULT 0,
    messages_required INTEGER DEFAULT 100,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS market (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id TEXT,
    item TEXT,
    amount INTEGER,
    price INTEGER,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id TEXT PRIMARY KEY,
    jail_role_id TEXT,
    jail_channel_id TEXT,
    dealer_role_id TEXT,
    vip_role_id TEXT,
    welcome_channel_id TEXT,
    welcome_message TEXT,
    auto_role_id TEXT,
    welcome_thumbnail TEXT,
    welcome_image TEXT,
    welcome_color TEXT,
    welcome_title TEXT,
    welcome_author TEXT,
    welcome_author_icon TEXT,
    welcome_footer TEXT
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    guild_id TEXT,
    species TEXT,
    rarity TEXT,
    level INTEGER,
    exp INTEGER,
    hp INTEGER,
    attack INTEGER
  );

  CREATE TABLE IF NOT EXISTS levels (
    user_id TEXT,
    guild_id TEXT,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    voice_level INTEGER DEFAULT 1,
    voice_exp INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    guild_id TEXT,
    amount INTEGER,
    invested_at INTEGER,
    product TEXT DEFAULT 'HDPE'
  );

  CREATE TABLE IF NOT EXISTS suspended_voice (
    user_id TEXT,
    guild_id TEXT,
    suspended_by TEXT,
    reason TEXT DEFAULT 'Vi phạm nội quy',
    suspended_at INTEGER,
    expires_at INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS bought_roles (
    user_id TEXT,
    role_id TEXT,
    guild_id TEXT,
    expires_at INTEGER,
    PRIMARY KEY (user_id, role_id, guild_id)
  );
`);

// ===== MIGRATION: Cố gắng thêm cột guild_id vào bảng cũ nếu chưa có =====
// (tương thích ngược với database cũ không có guild_id)
const migrations = [
  "ALTER TABLE users ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE inventory ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE work ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE daily ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE relationships ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE jail ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE pets ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE levels ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE investments ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE suspended_voice ADD COLUMN guild_id TEXT DEFAULT 'legacy'",
  "ALTER TABLE levels ADD COLUMN voice_level INTEGER DEFAULT 1",
  "ALTER TABLE levels ADD COLUMN voice_exp INTEGER DEFAULT 0",
  "ALTER TABLE guild_configs ADD COLUMN welcome_color TEXT",
  "ALTER TABLE guild_configs ADD COLUMN welcome_title TEXT",
  "ALTER TABLE guild_configs ADD COLUMN welcome_author TEXT",
  "ALTER TABLE guild_configs ADD COLUMN welcome_author_icon TEXT",
  "ALTER TABLE guild_configs ADD COLUMN welcome_footer TEXT",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* Cột đã tồn tại — bỏ qua */ }
}

// ===========================
// ===== USERS =====
// ===========================
const getUser = (userId, guildId) => {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) {
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, balance, bank) VALUES (?, ?, 250000, 0)').run(userId, guildId);
    user = { user_id: userId, guild_id: guildId, balance: 250000, bank: 0 };
  }
  return user;
};

const getAllUsers = (guildId) => {
  if (guildId) return db.prepare('SELECT * FROM users WHERE guild_id = ?').all(guildId);
  return db.prepare('SELECT * FROM users').all();
};

const addBalance = (userId, guildId, amount) => {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
};

const addBankBalance = (userId, guildId, amount) => {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET bank = bank + ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
};

const setZonePreference = (userId, guildId, type, zone) => {
  getUser(userId, guildId);
  const col = type === 'fish' ? 'last_fish_zone' : 'last_mine_zone';
  db.prepare(`UPDATE users SET ${col} = ? WHERE user_id = ? AND guild_id = ?`).run(zone, userId, guildId);
};

const setShield = (userId, guildId, durationMs) => {
  getUser(userId, guildId);
  const now = Date.now();
  const user = db.prepare('SELECT shield_until FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  const currentShield = user ? (user.shield_until || 0) : 0;
  const newShield = (currentShield > now ? currentShield : now) + durationMs;
  db.prepare('UPDATE users SET shield_until = ? WHERE user_id = ? AND guild_id = ?').run(newShield, userId, guildId);
  return newShield;
};

const getShield = (userId, guildId) => {
  const user = db.prepare('SELECT shield_until FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return user ? (user.shield_until || 0) : 0;
};

const getCasinoBuff = (userId, guildId) => {
  const user = db.prepare('SELECT casino_win_rate, casino_payout FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return user ? { winRate: user.casino_win_rate || 0, payout: user.casino_payout || 0 } : { winRate: 0, payout: 0 };
};

const setCasinoBuff = (userId, guildId, winRate, payout) => {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET casino_win_rate = ?, casino_payout = ? WHERE user_id = ? AND guild_id = ?').run(winRate, payout, userId, guildId);
};

const resetAllMoney = (guildId) => {
  db.prepare('UPDATE users SET balance = 0, bank = 0 WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM investments WHERE guild_id = ?').run(guildId);
  const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE guild_id = ?').get(guildId);
  return result.count;
};

// ===========================
// ===== INVENTORY =====
// ===========================
const getInventory = (userId, guildId) => {
  return db.prepare('SELECT * FROM inventory WHERE user_id = ? AND guild_id = ? AND amount > 0').all(userId, guildId);
};

const getItemAmount = (userId, guildId, item) => {
  const record = db.prepare('SELECT amount FROM inventory WHERE user_id = ? AND guild_id = ? AND item = ?').get(userId, guildId, item);
  return record ? record.amount : 0;
};

const addItem = (userId, guildId, item, amount = 1) => {
  getUser(userId, guildId);
  const existing = db.prepare('SELECT * FROM inventory WHERE user_id = ? AND guild_id = ? AND item = ?').get(userId, guildId, item);
  if (existing) {
    db.prepare('UPDATE inventory SET amount = amount + ? WHERE user_id = ? AND guild_id = ? AND item = ?').run(amount, userId, guildId, item);
  } else {
    db.prepare('INSERT INTO inventory (user_id, guild_id, item, amount) VALUES (?, ?, ?, ?)').run(userId, guildId, item, amount);
  }
};

const removeItem = (userId, guildId, item, amount = 1) => {
  const existing = db.prepare('SELECT * FROM inventory WHERE user_id = ? AND guild_id = ? AND item = ?').get(userId, guildId, item);
  if (existing && existing.amount >= amount) {
    if (existing.amount === amount) {
      db.prepare('DELETE FROM inventory WHERE user_id = ? AND guild_id = ? AND item = ?').run(userId, guildId, item);
    } else {
      db.prepare('UPDATE inventory SET amount = amount - ? WHERE user_id = ? AND guild_id = ? AND item = ?').run(amount, userId, guildId, item);
    }
    return true;
  }
  return false;
};

const removeAllItems = (userId, guildId, protectedItems = []) => {
  if (protectedItems.length === 0) {
    db.prepare('DELETE FROM inventory WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  } else {
    const placeholders = protectedItems.map(() => '?').join(',');
    db.prepare(`DELETE FROM inventory WHERE user_id = ? AND guild_id = ? AND item NOT IN (${placeholders})`).run(userId, guildId, ...protectedItems);
  }
};

// ===========================
// ===== WORK =====
// ===========================
const getWorkTime = (userId, guildId) => {
  const record = db.prepare('SELECT last_work, job_index FROM work WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return record ? { time: record.last_work, jobIndex: record.job_index !== undefined ? record.job_index : -1 } : { time: 0, jobIndex: -1 };
};

const setWorkTime = (userId, guildId, time, jobIndex = -1) => {
  const existing = db.prepare('SELECT * FROM work WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (existing) {
    db.prepare('UPDATE work SET last_work = ?, job_index = ? WHERE user_id = ? AND guild_id = ?').run(time, jobIndex, userId, guildId);
  } else {
    db.prepare('INSERT INTO work (user_id, guild_id, last_work, job_index) VALUES (?, ?, ?, ?)').run(userId, guildId, time, jobIndex);
  }
};

// ===========================
// ===== DAILY =====
// ===========================
const getDailyTime = (userId, guildId) => {
  const record = db.prepare('SELECT last_claim FROM daily WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return record ? record.last_claim : 0;
};

const setDailyTime = (userId, guildId, time, streak = 1) => {
  const existing = db.prepare('SELECT * FROM daily WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (existing) {
    db.prepare('UPDATE daily SET last_claim = ?, streak = ? WHERE user_id = ? AND guild_id = ?').run(time, streak, userId, guildId);
  } else {
    db.prepare('INSERT INTO daily (user_id, guild_id, last_claim, streak) VALUES (?, ?, ?, ?)').run(userId, guildId, time, streak);
  }
};

const getDailyStreak = (userId, guildId) => {
  const record = db.prepare('SELECT streak FROM daily WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return record ? (record.streak || 1) : 1;
};

// ===========================
// ===== RELATIONSHIPS =====
// ===========================
const getRelationship = (userId, guildId) => {
  return db.prepare('SELECT * FROM relationships WHERE (user_id = ? OR partner_id = ?) AND guild_id = ?').get(userId, userId, guildId);
};

const setRelationship = (userId1, userId2, guildId, status) => {
  const now = Date.now();
  db.prepare('DELETE FROM relationships WHERE (user_id = ? OR partner_id = ? OR user_id = ? OR partner_id = ?) AND guild_id = ?')
    .run(userId1, userId1, userId2, userId2, guildId);
  db.prepare('INSERT INTO relationships (user_id, guild_id, partner_id, status, timestamp) VALUES (?, ?, ?, ?, ?)').run(userId1, guildId, userId2, status, now);
};

const removeRelationship = (userId, guildId) => {
  db.prepare('DELETE FROM relationships WHERE (user_id = ? OR partner_id = ?) AND guild_id = ?').run(userId, userId, guildId);
};

// ===========================
// ===== ADMINS (global) =====
// ===========================
const isAdmin = (userId) => {
  const record = db.prepare('SELECT * FROM admins WHERE user_id = ?').get(userId);
  return !!record;
};

const addAdmin = (userId) => {
  db.prepare('INSERT OR IGNORE INTO admins (user_id) VALUES (?)').run(userId);
};

const removeAdmin = (userId) => {
  db.prepare('DELETE FROM admins WHERE user_id = ?').run(userId);
};

// ===========================
// ===== JAIL =====
// ===========================
const jailUser = (userId, guildId, requiredMessages = 100) => {
  const existing = db.prepare('SELECT * FROM jail WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (existing) {
    db.prepare('UPDATE jail SET messages_sent = 0, messages_required = ? WHERE user_id = ? AND guild_id = ?').run(requiredMessages, userId, guildId);
  } else {
    db.prepare('INSERT INTO jail (user_id, guild_id, messages_sent, messages_required) VALUES (?, ?, 0, ?)').run(userId, guildId, requiredMessages);
  }
};

const unjailUser = (userId, guildId) => {
  db.prepare('DELETE FROM jail WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
};

const getJailStatus = (userId, guildId) => {
  return db.prepare('SELECT * FROM jail WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
};

const addJailMessage = (userId, guildId) => {
  const status = getJailStatus(userId, guildId);
  if (status) {
    db.prepare('UPDATE jail SET messages_sent = messages_sent + 1 WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
    return status.messages_sent + 1 >= status.messages_required;
  }
  return false;
};

// ===========================
// ===== PETS =====
// ===========================
const addPet = (userId, guildId, species, rarity, hp, attack) => {
  const info = db.prepare('INSERT INTO pets (user_id, guild_id, species, rarity, level, exp, hp, attack) VALUES (?, ?, ?, ?, 1, 0, ?, ?)').run(userId, guildId, species, rarity, hp, attack);
  return info.lastInsertRowid;
};

const getPets = (userId, guildId) => {
  return db.prepare('SELECT * FROM pets WHERE user_id = ? AND guild_id = ?').all(userId, guildId);
};

const getPet = (id) => {
  return db.prepare('SELECT * FROM pets WHERE id = ?').get(id);
};

const updatePet = (id, level, exp, hp, attack) => {
  db.prepare('UPDATE pets SET level = ?, exp = ?, hp = ?, attack = ? WHERE id = ?').run(level, exp, hp, attack, id);
};

const deletePet = (id) => {
  db.prepare('DELETE FROM pets WHERE id = ?').run(id);
};

// ===========================
// ===== LEVELS =====
// ===========================
const getUserLevel = (userId, guildId) => {
  let record = db.prepare('SELECT * FROM levels WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!record) {
    db.prepare('INSERT OR IGNORE INTO levels (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
    record = { user_id: userId, guild_id: guildId, level: 1, exp: 0, voice_level: 1, voice_exp: 0 };
  }
  return record;
};

const addExp = (userId, guildId, amount) => {
  const user = getUserLevel(userId, guildId);
  let newExp = user.exp + amount;
  let newLevel = user.level;
  let leveledUp = false;
  let nextLevelExp = 5 * (newLevel * newLevel) + 50 * newLevel + 100;

  while (newExp >= nextLevelExp) {
    newExp -= nextLevelExp;
    newLevel++;
    leveledUp = true;
    nextLevelExp = 5 * (newLevel * newLevel) + 50 * newLevel + 100;
  }

  db.prepare('UPDATE levels SET level = ?, exp = ? WHERE user_id = ? AND guild_id = ?').run(newLevel, newExp, userId, guildId);
  return { leveledUp, newLevel, newExp, nextLevelExp };
};

const getTopLevels = (guildId) => {
  return db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY level DESC, exp DESC LIMIT 10').all(guildId);
};

const getUserVoiceLevel = (userId, guildId) => {
  let record = db.prepare('SELECT * FROM levels WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!record) {
    db.prepare('INSERT OR IGNORE INTO levels (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
    record = { user_id: userId, guild_id: guildId, level: 1, exp: 0, voice_level: 1, voice_exp: 0 };
  }
  return { level: record.voice_level || 1, exp: record.voice_exp || 0 };
};

const addVoiceExp = (userId, guildId, amount) => {
  getUserLevel(userId, guildId); // đảm bảo tồn tại
  const raw = db.prepare('SELECT voice_level, voice_exp FROM levels WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  let vLevel = raw ? (raw.voice_level || 1) : 1;
  let vExp = raw ? (raw.voice_exp || 0) : 0;

  vExp += amount;
  let leveledUp = false;
  let nextLevelExp = 5 * (vLevel * vLevel) + 50 * vLevel + 100;

  while (vExp >= nextLevelExp) {
    vExp -= nextLevelExp;
    vLevel++;
    leveledUp = true;
    nextLevelExp = 5 * (vLevel * vLevel) + 50 * vLevel + 100;
  }

  db.prepare('UPDATE levels SET voice_level = ?, voice_exp = ? WHERE user_id = ? AND guild_id = ?').run(vLevel, vExp, userId, guildId);
  return { leveledUp, newLevel: vLevel, newExp: vExp, nextLevelExp };
};

const getTopVoiceLevels = (guildId) => {
  return db.prepare('SELECT * FROM levels WHERE guild_id = ? ORDER BY voice_level DESC, voice_exp DESC LIMIT 10').all(guildId);
};

// ===========================
// ===== INVESTMENTS =====
// ===========================
const addInvestment = (userId, guildId, amount) => {
  getUser(userId, guildId);
  db.prepare('INSERT INTO investments (user_id, guild_id, amount, invested_at, product) VALUES (?, ?, ?, ?, ?)').run(userId, guildId, amount, Date.now(), 'HDPE');
};

const getInvestments = (userId, guildId) => {
  return db.prepare('SELECT * FROM investments WHERE user_id = ? AND guild_id = ? ORDER BY invested_at ASC').all(userId, guildId);
};

const getInvestmentById = (id) => {
  return db.prepare('SELECT * FROM investments WHERE id = ?').get(id);
};

const deleteInvestment = (id) => {
  db.prepare('DELETE FROM investments WHERE id = ?').run(id);
};

const deleteAllInvestments = (userId, guildId) => {
  db.prepare('DELETE FROM investments WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
};

const calculateInvestmentValue = (investment) => {
  const DAILY_RATE = 0.02;
  const now = Date.now();
  const ageMs = now - investment.invested_at;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const interest = Math.floor(investment.amount * DAILY_RATE * ageDays);
  return { principal: investment.amount, interest, total: investment.amount + interest, ageDays };
};

// ===========================
// ===== VOICE SUSPENSION =====
// ===========================
const suspendVoice = (userId, guildId, suspendedBy, reason, durationMs) => {
  const now = Date.now();
  const expiresAt = durationMs > 0 ? now + durationMs : 0;
  const existing = db.prepare('SELECT * FROM suspended_voice WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (existing) {
    db.prepare('UPDATE suspended_voice SET suspended_by = ?, reason = ?, suspended_at = ?, expires_at = ? WHERE user_id = ? AND guild_id = ?')
      .run(suspendedBy, reason, now, expiresAt, userId, guildId);
  } else {
    db.prepare('INSERT INTO suspended_voice (user_id, guild_id, suspended_by, reason, suspended_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, guildId, suspendedBy, reason, now, expiresAt);
  }
  return expiresAt;
};

const unsuspendVoice = (userId, guildId) => {
  db.prepare('DELETE FROM suspended_voice WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
};

const getVoiceSuspension = (userId, guildId) => {
  return db.prepare('SELECT * FROM suspended_voice WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
};

const isVoiceSuspended = (userId, guildId) => {
  const record = db.prepare('SELECT * FROM suspended_voice WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!record) return false;
  if (record.expires_at > 0 && Date.now() > record.expires_at) {
    db.prepare('DELETE FROM suspended_voice WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
    return false;
  }
  return true;
};

const getAllSuspendedVoice = (guildId) => {
  const now = Date.now();
  db.prepare('DELETE FROM suspended_voice WHERE guild_id = ? AND expires_at > 0 AND expires_at < ?').run(guildId, now);
  return db.prepare('SELECT * FROM suspended_voice WHERE guild_id = ? ORDER BY suspended_at DESC').all(guildId);
};

// ===========================
// ===== MARKET (global) =====
// ===========================
const addMarketListing = (sellerId, item, amount, price) => {
  const info = db.prepare('INSERT INTO market (seller_id, item, amount, price, timestamp) VALUES (?, ?, ?, ?, ?)').run(sellerId, item, amount, price, Date.now());
  return info.lastInsertRowid;
};

const getMarketListings = (item = null) => {
  if (item) return db.prepare('SELECT * FROM market WHERE item = ? AND amount > 0 ORDER BY price ASC, timestamp ASC').all(item);
  return db.prepare('SELECT * FROM market WHERE amount > 0 ORDER BY timestamp DESC').all();
};

const getMarketItem = (id) => db.prepare('SELECT * FROM market WHERE id = ?').get(id);
const updateMarketItem = (id, amount) => db.prepare('UPDATE market SET amount = ? WHERE id = ?').run(amount, id);
const removeMarketItem = (id) => db.prepare('DELETE FROM market WHERE id = ?').run(id);

// ===========================
// ===== GUILD CONFIGS =====
// ===========================
const getGuildConfig = (guildId) => {
  let config = db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId);
  if (!config) {
    db.prepare('INSERT OR IGNORE INTO guild_configs (guild_id) VALUES (?)').run(guildId);
    config = { guild_id: guildId };
  }
  return config;
};

const setGuildConfig = (guildId, key, value) => {
  getGuildConfig(guildId);
  const validKeys = [
    'jail_role_id', 'jail_channel_id', 'dealer_role_id', 'vip_role_id',
    'welcome_channel_id', 'welcome_message', 'auto_role_id',
    'welcome_thumbnail', 'welcome_image', 'welcome_color',
    'welcome_title', 'welcome_author', 'welcome_author_icon', 'welcome_footer'
  ];
  if (validKeys.includes(key)) {
    db.prepare(`UPDATE guild_configs SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
  }
};

// ===========================
// ===== BOUGHT ROLES =====
// ===========================
const addBoughtRole = (userId, roleId, guildId, durationMs) => {
  const expiresAt = Date.now() + durationMs;
  const existing = db.prepare('SELECT * FROM bought_roles WHERE user_id = ? AND role_id = ? AND guild_id = ?').get(userId, roleId, guildId);
  if (existing) {
    db.prepare('UPDATE bought_roles SET expires_at = ? WHERE user_id = ? AND role_id = ? AND guild_id = ?').run(expiresAt, userId, roleId, guildId);
  } else {
    db.prepare('INSERT INTO bought_roles (user_id, role_id, guild_id, expires_at) VALUES (?, ?, ?, ?)').run(userId, roleId, guildId, expiresAt);
  }
  return expiresAt;
};

const getExpiredRoles = () => db.prepare('SELECT * FROM bought_roles WHERE expires_at <= ?').all(Date.now());
const removeBoughtRole = (userId, roleId, guildId) => {
  db.prepare('DELETE FROM bought_roles WHERE user_id = ? AND role_id = ? AND guild_id = ?').run(userId, roleId, guildId);
};

// ===========================
// ===== EXPORTS =====
// ===========================
module.exports = {
  db,
  getUser,
  getAllUsers,
  addBalance,
  addBankBalance,
  getInventory,
  getItemAmount,
  addItem,
  removeItem,
  removeAllItems,
  getWorkTime,
  setWorkTime,
  getDailyTime,
  setDailyTime,
  getDailyStreak,
  getRelationship,
  setRelationship,
  removeRelationship,
  isAdmin,
  addAdmin,
  removeAdmin,
  setZonePreference,
  setShield,
  getShield,
  getCasinoBuff,
  setCasinoBuff,
  resetAllMoney,
  addPet,
  getPets,
  getPet,
  updatePet,
  deletePet,
  getUserLevel,
  addExp,
  getTopLevels,
  getUserVoiceLevel,
  addVoiceExp,
  getTopVoiceLevels,
  jailUser,
  unjailUser,
  getJailStatus,
  addJailMessage,
  addInvestment,
  getInvestments,
  getInvestmentById,
  deleteInvestment,
  deleteAllInvestments,
  calculateInvestmentValue,
  suspendVoice,
  unsuspendVoice,
  getVoiceSuspension,
  isVoiceSuspended,
  getAllSuspendedVoice,
  addMarketListing,
  getMarketListings,
  getMarketItem,
  updateMarketItem,
  removeMarketItem,
  getGuildConfig,
  setGuildConfig,
  addBoughtRole,
  getExpiredRoles,
  removeBoughtRole,
};
