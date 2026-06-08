/**
 * ============================================================
 *  RESET ALL USERS — đưa database về trạng thái ban đầu
 *  Chạy: node reset_all_users.js
 *  LƯU Ý: Script tự backup data.sqlite trước khi reset
 * ============================================================
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data.sqlite');
const BACKUP_PATH = path.join(__dirname, `data_backup_${Date.now()}.sqlite`);

// ---- Backup trước khi làm gì ----
console.log('📦 Đang backup database...');
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log(`✅ Đã backup sang: ${path.basename(BACKUP_PATH)}`);
console.log('');

const db = new Database(DB_PATH);

// ---- Thống kê trước khi reset ----
const userCount   = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
const invCount    = db.prepare('SELECT COUNT(*) as c FROM inventory').get().c;
const petCount    = db.prepare('SELECT COUNT(*) as c FROM pets').get().c;
const relCount    = db.prepare('SELECT COUNT(*) as c FROM relationships').get().c;
const investCount = db.prepare('SELECT COUNT(*) as c FROM investments').get().c;

console.log('📊 Thống kê trước khi reset:');
console.log(`   Users       : ${userCount}`);
console.log(`   Inventory   : ${invCount} dòng`);
console.log(`   Pets        : ${petCount}`);
console.log(`   Couples     : ${relCount}`);
console.log(`   Investments : ${investCount}`);
console.log('');

// ---- Chạy reset trong 1 transaction để đảm bảo toàn vẹn ----
const resetAll = db.transaction(() => {

  // 1. Tiền mặt → 250,000 | Ngân hàng → 0 | Xóa shield & casino buff & zone
  const r1 = db.prepare(`
    UPDATE users SET
      balance          = 250000,
      bank             = 0,
      shield_until     = 0,
      casino_win_rate  = 0,
      casino_payout    = 0,
      last_fish_zone   = NULL,
      last_mine_zone   = NULL
  `).run();
  console.log(`✅ Reset tiền & shield cho ${r1.changes} users`);

  // 2. Xóa toàn bộ inventory
  const r2 = db.prepare('DELETE FROM inventory').run();
  console.log(`✅ Xóa ${r2.changes} dòng inventory`);

  // 3. Xóa toàn bộ pets
  const r3 = db.prepare('DELETE FROM pets').run();
  console.log(`✅ Xóa ${r3.changes} pets`);

  // 4. Xóa quan hệ / hôn nhân
  const r4 = db.prepare('DELETE FROM relationships').run();
  console.log(`✅ Xóa ${r4.changes} cặp đôi`);

  // 5. Reset level & EXP về Level 1, EXP 0 (cả chat & voice)
  const r5 = db.prepare(`
    UPDATE levels SET
      level       = 1,
      exp         = 0,
      voice_level = 1,
      voice_exp   = 0
  `).run();
  console.log(`✅ Reset level cho ${r5.changes} users`);

  // 6. Reset điểm danh daily (xóa hết để cooldown mới)
  const r6 = db.prepare('DELETE FROM daily').run();
  console.log(`✅ Reset daily cho ${r6.changes} users`);

  // 7. Reset work
  const r7 = db.prepare('DELETE FROM work').run();
  console.log(`✅ Reset work cho ${r7.changes} users`);

  // 8. Xóa đầu tư HDPE
  const r8 = db.prepare('DELETE FROM investments').run();
  console.log(`✅ Xóa ${r8.changes} gói đầu tư`);

  // 9. Xóa treo room
  const r9 = db.prepare('DELETE FROM suspended_voice').run();
  console.log(`✅ Xóa ${r9.changes} treo room`);

  // 10. Xóa jail
  const r10 = db.prepare('DELETE FROM jail').run();
  console.log(`✅ Xóa ${r10.changes} jail entries`);

  // 11. Xóa market listings (nếu có)
  try {
    const r11 = db.prepare('DELETE FROM market').run();
    console.log(`✅ Xóa ${r11.changes} market listings`);
  } catch (e) { /* bảng có thể không tồn tại */ }

});

console.log('🔄 Đang thực hiện reset...');
console.log('');

try {
  resetAll();
  console.log('');
  console.log('🎉 ===== RESET HOÀN TẤT =====');
  console.log(`📦 Backup cũ lưu tại: ${path.basename(BACKUP_PATH)}`);
  console.log('🚀 Hãy restart bot để áp dụng!');
} catch (err) {
  console.error('❌ LỖI trong quá trình reset:', err.message);
  console.log('⚠️  Database không bị thay đổi vì dùng transaction.');
  console.log(`📦 Backup vẫn còn tại: ${path.basename(BACKUP_PATH)}`);
  process.exit(1);
} finally {
  db.close();
}
