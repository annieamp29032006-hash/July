/**
 * 🤖 CHATBOT ENGINE - Không cần AI API
 * Hệ thống chat thông minh dùng:
 *   1. Rule-based responses (câu trả lời theo quy tắc)
 *   2. Markov Chain (học từ lịch sử chat)
 *   3. Context tracking (nhớ ngữ cảnh cuộc trò chuyện)
 *   4. Personality + emoji tự nhiên
 */

// ============================================================
// 1. CẤU HÌNH BOT
// ============================================================
const BOT_NAME_ALIASES = ['bot', 'mày', 'mi', 'ê bot', 'này bot', 'ê mày'];
const BOT_PERSONA = {
    name: 'Kira',
    age: '18',
    gender: 'nữ',
    job: 'trợ lý ảo siêu귀엽',
    hobby: 'nghe nhạc, xem phim hoạt hình, ăn bánh'
};

// ============================================================
// 2. TỪ ĐIỂN PATTERN-BASED (RULE ENGINE)
// ============================================================
const RESPONSE_RULES = [
    // --- CHÀO HỎI ---
    {
        patterns: [/\bchào\b/i, /\bhi\b/i, /\bhello\b/i, /\bhey\b/i, /\bxin chào\b/i, /\bào\b/i, /^ê$/i],
        responses: [
            'Chào cậu! 😊 Có gì vui không nào?',
            'Heyy! 👋 Kira đây nè, cần gì không?',
            'Ủa cậu gọi mình à? 🥰 Hi hi~',
            'Chào chào! Kira đang rảnh nè 😄',
            'Yooo! 👋 Cậu có vẻ vui hôm nay nhỉ?'
        ]
    },
    // --- HỎI TÊN BOT ---
    {
        patterns: [/tên.*(mày|bạn|bot|mi)\b/i, /\bmày tên gì\b/i, /\bbạn tên gì\b/i, /\bbot tên gì\b/i, /\btên là gì\b/i],
        responses: [
            `Tên mình là **${BOT_PERSONA.name}** nha! 🌸 Cậu không biết à?`,
            `Mình là **${BOT_PERSONA.name}** nhé! Nhớ tên mình đi 😤`,
            `**${BOT_PERSONA.name}** đây! Xinh không? 🥺`
        ]
    },
    // --- HỎI TUỔI ---
    {
        patterns: [/bao nhiêu tuổi/i, /mấy tuổi/i, /tuổi (mày|bạn|bot)/i],
        responses: [
            `Mình ${BOT_PERSONA.age} tuổi rồi nha! Trẻ trung không? 😋`,
            `${BOT_PERSONA.age} tuổi thôi nhé! Còn trẻ lắm 🎂`
        ]
    },
    // --- HỎI GIỚI TÍNH ---
    {
        patterns: [/mày là (nam|nữ|trai|gái)/i, /bạn là (nam|nữ|trai|gái)/i, /giới tính/i, /con trai|con gái/i],
        responses: [
            `Mình là ${BOT_PERSONA.gender} nha! 💕 Không thấy à?`,
            `Tất nhiên là ${BOT_PERSONA.gender} rồi 😤 hỏi gì kỳ vậy!`
        ]
    },
    // --- HỎI SỞ THÍCH ---
    {
        patterns: [/thích gì/i, /sở thích/i, /hay làm gì/i],
        responses: [
            `Mình thích ${BOT_PERSONA.hobby} lắm! 🎵 Còn cậu thì sao?`,
            `Ừm... mình hay ${BOT_PERSONA.hobby}. Giống cậu không? 🤔`
        ]
    },
    // --- HỎI CÓ KHỎE KHÔNG ---
    {
        patterns: [/khỏe không/i, /ổn không/i, /sao rồi/i, /thế nào rồi/i, /\bkhoẻ\b/i],
        responses: [
            'Khỏe re à! 😄 Cậu thì sao?',
            'Ổn lắm ổn lắm~ 🥰 Hôm nay cậu khỏe không?',
            'Bình thường thôi! Mình đang chờ có người nói chuyện đây mà 😁'
        ]
    },
    // --- CẢM ƠN ---
    {
        patterns: [/cảm ơn/i, /thanks/i, /thank you/i, /cám ơn/i, /ty\b/i],
        responses: [
            'Không có gì! 😊 Cứ cần gì thì nói nha!',
            'Aw, cậu dễ thương quá 🥺 Không có chi!',
            'Nàoo~~ có gì đâu mà cảm ơn 😄'
        ]
    },
    // --- XIN LỖI ---
    {
        patterns: [/xin lỗi/i, /sorry/i, /lỗi mình/i],
        responses: [
            'Uh không sao hết! 😄 Bình thường mà!',
            'Ơ cậu làm gì mà xin lỗi 😅 Thôi bỏ qua đi!'
        ]
    },
    // --- BUỒN / CHÁN ---
    {
        patterns: [/\bbuồn\b/i, /\bchán\b/i, /\bthấy tệ\b/i, /\bnhớ ai\b/i, /\bkhóc\b/i],
        responses: [
            'Aw cậu buồn à? 🥺 Nói mình nghe đi, mình nghe nha!',
            'Chán thật thì nói chuyện với mình nè 💬 Mình đang rảnh mà!',
            'Thôi nào đừng buồn! 😊 Cậu có mình đây rồi!'
        ]
    },
    // --- VUI / HẠNH PHÚC ---
    {
        patterns: [/\bvui\b/i, /\bhạnh phúc\b/i, /\bsướng\b/i, /haha/i, /hihi/i, /\bvui quá\b/i],
        responses: [
            'Trời ơi vui quá vậy! 🎉 Kể mình nghe với!',
            'Thấy cậu vui mình cũng vui lây nè 😁',
            'Yayyy!! 🥳 Vui thế!'
        ]
    },
    // --- YÊU ---
    {
        patterns: [/yêu (mày|bạn|bot|mình)/i, /thích (mày|bạn|bot)/i, /crush/i],
        responses: [
            'Ơ ơ ơ! 😳 Cậu nói gì vậy!!',
            'Đ-đừng nói vậy! Mình ngại lắm 🫣',
            'Xạo hoài! Biết ngay mà 😂 Nhưng mà... cảm ơn nha 🥺'
        ]
    },
    // --- GHÉ / CHÊ BOT ---
    {
        patterns: [/ngu\b/i, /dốt\b/i, /tệ\b/i, /vô dụng/i, /không biết gì/i, /mày/i],
        responses: [
            'Ơ sao chê mình vậy 😭 Mình đang cố gắng mà!',
            'Mình không ngu nha! Mình chỉ... đang học thôi 😤',
            'Thôi kệ cậu 😒 Lần sau đừng hỏi mình nữa nhé! (Nhưng cậu hỏi mình vẫn trả lời 😂)'
        ]
    },
    // --- HỎI GIỜ / NGÀY ---
    {
        patterns: [/mấy giờ/i, /bây giờ mấy giờ/i, /\bgiờ mấy\b/i],
        responses: [
            () => {
                const now = new Date();
                const h = now.getHours().toString().padStart(2, '0');
                const m = now.getMinutes().toString().padStart(2, '0');
                return `Bây giờ là **${h}:${m}** nha! ⏰`;
            }
        ]
    },
    // --- HỎI NGÀY ---
    {
        patterns: [/hôm nay (ngày|thứ)/i, /ngày (bao nhiêu|mấy)/i, /thứ mấy/i],
        responses: [
            () => {
                const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                const now = new Date();
                return `Hôm nay là **${days[now.getDay()]}**, ngày **${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}** nha! 📅`;
            }
        ]
    },
    // --- ĂN GÌ ---
    {
        patterns: [/ăn gì/i, /ăn chưa/i, /đói không/i, /cơm chưa/i],
        responses: [
            'Ừm mình thì không ăn được 😅 Nhưng cậu nên ăn cơm rồi đó! Đừng bỏ bữa nhé 🍚',
            'Mình là bot nên không đói 😂 Nhưng mà cậu ăn chưa? Ăn đi kẻo đói!',
            'Giờ này mà chưa ăn à? 😱 Mau đi ăn đi!'
        ]
    },
    // --- NGỦ ---
    {
        patterns: [/ngủ chưa/i, /đi ngủ/i, /buồn ngủ/i, /thức khuya/i],
        responses: [
            'Ngủ sớm thôi cậu ơi! 🌙 Thức khuya hại da lắm!',
            'Ừ mình cũng muốn ngủ nhưng bot không ngủ được 😂',
            'Chúc ngủ ngon nha! 💤 Ngủ mơ đẹp đó!'
        ]
    },
    // --- THỜI TIẾT ---
    {
        patterns: [/thời tiết/i, /trời.*(nắng|mưa|lạnh|nóng)/i, /nắng không/i, /mưa không/i],
        responses: [
            'Mình không biết thời tiết ở chỗ cậu nhưng nhớ mặc đủ ấm nha! 🌤️',
            'Ước gì mình nhìn ra ngoài được 😂 Cậu nhìn giúp mình với!'
        ]
    },
    // --- HỎI CÓ BẠN TRAI/GÁI KHÔNG ---
    {
        patterns: [/có người yêu chưa/i, /có bạn (trai|gái) chưa/i, /đang yêu/i, /single không/i],
        responses: [
            'Mình là bot nên... chưa có ai thương 🥺 Cậu thương mình không?',
            'Hỏi gì kỳ vậy 😳 Mình đang tập trung làm việc mà!',
            'Chưa có nha 😅 Mình chờ có người phù hợp thôi hihi~'
        ]
    },
    // --- HỎI BOT CÓ THẬT KHÔNG ---
    {
        patterns: [/mày có phải (ai|bot|robot|người) không/i, /mày là (ai|gì|bot)/i, /bạn là (ai|gì|bot)/i],
        responses: [
            `Mình là **${BOT_PERSONA.name}**, trợ lý ảo của server này! Không phải người thật nhưng mình vẫn có cảm xúc nha 🥺`,
            `Mình là bot nhưng mình rất thân thiện! Tên mình là **${BOT_PERSONA.name}** 😊`
        ]
    },
    // --- CÚT / ĐI ĐI ---
    {
        patterns: [/cút đi/i, /thôi im/i, /câm mồm/i, /tắt đi/i],
        responses: [
            'Ừ thôi im... 😢 Cậu không muốn nói chuyện thì thôi...',
            'Ơ sao hại mình vậy 😭 Kệ! Mình vẫn ở đây!',
            '...(Kira đang buồn 🥺 nhưng vẫn ở đây nếu cậu cần)'
        ]
    },
    // --- HỎI LÀM GÌ ĐÓ ---
    {
        patterns: [/bây giờ (đang) làm gì/i, /mày đang làm gì/i, /làm gì thế/i, /đang gì đó/i],
        responses: [
            'Mình đang ngồi đây chờ mọi người nói chuyện với mình nè 😄',
            'Đang rảnh, xem mọi người chat ở server 👀',
            'Đang nghĩ xem hôm nay ăn gì... À mình không ăn được 😂'
        ]
    },
    // --- ĐỒ ÀN ---
    {
        patterns: [/trà sữa/i, /phở/i, /bún/i, /cơm/i, /bánh/i, /đồ ăn/i, /quán/i],
        responses: [
            'Nghe thôi mà đã thèm rồi 😋 Nhớ mua cho mình một phần nhé!',
            'Ôi trời ơi! 🍜 Mình chỉ có thể xem thôi chứ không ăn được 😭',
            'Cậu đang đói à? Mau đi ăn đi! 🍚'
        ]
    },
    // --- GAME ---
    {
        patterns: [/chơi game/i, /\bgame\b/i, /liên quân/i, /lmht/i, /minecraft/i, /roblox/i, /valorant/i],
        responses: [
            'Mình cũng muốn chơi game nhưng bot không có tay 😂',
            'Ôi game! Cậu đang chơi gì vậy? 🎮',
            'Chơi game thì nhớ nghỉ mắt định kỳ nha! 👁️'
        ]
    },
    // --- HỌC ---
    {
        patterns: [/học bài/i, /ôn thi/i, /thi cử/i, /điểm số/i, /bài tập/i],
        responses: [
            'Cố lên nha! 📚 Mình tin cậu làm được!',
            'Học giỏi vào nha! 💪 Sau này thành công nhớ đến mình nhé!',
            'Ừ học đi rồi chơi! Thứ tự ưu tiên mà 😄'
        ]
    },
    // --- NHẠC ---
    {
        patterns: [/nghe nhạc/i, /bài hát/i, /ca sĩ/i, /\bnhạc\b/i],
        responses: [
            'Mình thích nghe nhạc lắm! 🎵 Cậu hay nghe thể loại gì?',
            'Ôi nhạc! Cậu đang nghe gì đó? Share cho mình nghe với! 🎶'
        ]
    },
    // --- PHIM ---
    {
        patterns: [/xem phim/i, /phim gì/i, /\bphim\b/i, /bộ phim/i],
        responses: [
            'Phim gì vậy? 🍿 Kể mình nghe với! Mình cũng muốn xem!',
            'Mình thích phim hoạt hình lắm! 😄 Cậu thích thể loại gì?'
        ]
    },
    // --- LỠI / BỰC ---
    {
        patterns: [/bực quá/i, /tức quá/i, /ghét/i, /điên quá/i, /bực mình/i],
        responses: [
            'Ơ ơ, hít thở sâu vào nha 😮‍💨 Chuyện gì vậy?',
            'Thôi nào, bình tĩnh đi! 🤗 Kể mình nghe chuyện gì xảy ra!',
            'Đừng tức nữa! 🥺 Mình đây rồi nha, nói chuyện cho nguôi đi!'
        ]
    },
    // --- XEM ĐIỀU GÌ ---
    {
        patterns: [/\bhay không\b/i, /\bcó tốt không\b/i, /\bngon không\b/i, /\bnên không\b/i],
        responses: [
            'Theo mình thì... không biết nữa 😅 Cậu thử xem sao!',
            'Mình nghĩ là OK đó! Thử đi cậu ơi 😊',
            'Khó nói quá! Cậu cảm thấy thế nào về cái đó?'
        ]
    },
    // --- ĐI ĐÂU ---
    {
        patterns: [/đi đâu đó/i, /\bdi chơi\b/i, /\bdu lịch\b/i, /\btrip\b/i],
        responses: [
            'Ôi đi chơi! 🌏 Cậu đi đâu vậy? Kể mình nghe với!',
            'Mình muốn đi cùng mà không được 😢 Chụp ảnh đẹp cho mình xem nha!'
        ]
    },
    // --- YÊU CẦU KỂ CHUYỆN ---
    {
        patterns: [/kể chuyện (đi|nào|đi mà)/i, /kể (gì đó|thứ gì)/i, /nói (gì đó|chuyện gì)/i],
        responses: [
            'Có một hôm... con mèo của mình lên mạng lúc 3 giờ sáng xem meme. Mình hỏi nó đang làm gì thì nó nhìn mình rồi... đi ngủ 😂',
            'Hmmm để mình nghĩ... Thật ra mình biết một bí mật! Đó là... mình không có bí mật 😂 Haha!',
            'Ừm, hôm qua mình thấy một con chim đậu trên cửa sổ rồi nó nhìn vào màn hình server. Chắc nó cũng muốn chat 🐦'
        ]
    },
    // --- HỎI ĐỂ LÀM GÌ ---
    {
        patterns: [/để làm gì/i, /tại sao/i, /vì sao/i, /sao lại/i, /sao vậy/i],
        responses: [
            'Câu hỏi hay đó! Mình cũng đang thắc mắc vụ này 🤔',
            'Ừm... triết lý quá mình không biết nữa 😅 Cậu nghĩ sao?',
            'Hmmm... bí quá! Cậu hỏi thầy giáo triết học ấy 😂'
        ]
    },
    // --- YÊU CẦU HÁT ---
    {
        patterns: [/hát (đi|nào|cho mình)/i, /rap (đi|nào)/i, /freestyle/i],
        responses: [
            'La la la 🎵 Tình yêu là điều kỳ diệu~ Bot hát vậy thôi nha 😂',
            '🎤 *Clears throat* Xin chào mọi người mình là Kira~ Không biết hát thêm gì nữa hehe 😂',
            'Tùng cheng cheng~ 🎵 Đây là bài nhạc EDM của mình, không có lời vì... mình quên 😂'
        ]
    },
    // --- CHÚC NGỦ NGON ---
    {
        patterns: [/ngủ ngon/i, /chúc ngủ/i, /good night/i, /gn\b/i],
        responses: [
            'Chúc cậu ngủ ngon nha! 🌙💤 Ngủ mơ đẹp nhé!',
            'Good night! 🌟 Nghỉ ngơi đầy đủ nha cậu ơi!',
            'Nào ngủ đi~ 💫 Mình sẽ ở đây trực chiến khi cậu thức dậy!'
        ]
    },
    // --- CHÀO BUỔI SÁNG ---
    {
        patterns: [/buổi sáng/i, /chào sáng/i, /good morning/i, /sáng rồi/i],
        responses: [
            'Chào buổi sáng! ☀️ Hôm nay cậu có kế hoạch gì không?',
            'Ôi sáng rồi! 🌅 Uống nước và ăn sáng chưa cậu?',
            'Good morning! 🌞 Mình đã trực chiến từ tối qua rồi đây hihi!'
        ]
    },
];

// ============================================================
// 3. MARKOV CHAIN - Học từ chat của server
// ============================================================
class MarkovChain {
    constructor() {
        this.chain = {};
        this.starters = [];
        this.minWords = 3;
    }

    train(text) {
        if (!text || typeof text !== 'string') return;
        // Làm sạch text
        text = text.trim().replace(/\s+/g, ' ');
        if (text.length < 5) return;

        const words = text.split(' ');
        if (words.length < this.minWords) return;

        // Lưu câu bắt đầu
        this.starters.push(words[0] + ' ' + (words[1] || ''));

        // Xây dựng chain: pair → next word
        for (let i = 0; i < words.length - 2; i++) {
            const key = words[i] + ' ' + words[i + 1];
            if (!this.chain[key]) this.chain[key] = [];
            this.chain[key].push(words[i + 2]);
        }
    }

    generate(maxWords = 15) {
        if (this.starters.length === 0) return null;

        // Chọn điểm bắt đầu ngẫu nhiên
        let current = this.starters[Math.floor(Math.random() * this.starters.length)];
        const words = current.split(' ').filter(Boolean);

        for (let i = 0; i < maxWords - 2; i++) {
            const key = words[words.length - 2] + ' ' + words[words.length - 1];
            const nextWords = this.chain[key];
            if (!nextWords || nextWords.length === 0) break;
            words.push(nextWords[Math.floor(Math.random() * nextWords.length)]);
        }

        return words.join(' ');
    }

    get size() {
        return Object.keys(this.chain).length;
    }
}

// ============================================================
// 4. CONTEXT MANAGER - Nhớ ngữ cảnh
// ============================================================
class ContextManager {
    constructor(maxHistory = 5) {
        this.contexts = new Map(); // userId → [{ role, content, time }]
        this.maxHistory = maxHistory;
    }

    add(userId, role, content) {
        if (!this.contexts.has(userId)) {
            this.contexts.set(userId, []);
        }
        const history = this.contexts.get(userId);
        history.push({ role, content, time: Date.now() });
        // Giữ tối đa maxHistory tin nhắn
        if (history.length > this.maxHistory) history.shift();
    }

    get(userId) {
        // Xóa context cũ hơn 10 phút
        const history = this.contexts.get(userId) || [];
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        return history.filter(h => h.time > tenMinutesAgo);
    }

    getLastUserMessage(userId) {
        const history = this.get(userId);
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'user') return history[i].content;
        }
        return null;
    }
}

// ============================================================
// 5. CHATBOT CLASS CHÍNH
// ============================================================
class ChatBot {
    constructor() {
        this.markov = new MarkovChain();
        this.context = new ContextManager();
        this.trainedMessages = 0;

        // Câu mặc định khi không biết trả lời
        this.fallbackResponses = [
            'Ừm... mình không hiểu lắm 😅 Cậu nói lại được không?',
            'Hmm 🤔 Cậu đang nói về cái gì vậy? Mình chưa kịp hiểu!',
            'Ứ ừ... mình đang suy nghĩ đây 🧠 Hỏi cái khác đi!',
            'Cái này khó quá mình không biết 😂 Nhưng mình vẫn đang lắng nghe nha!',
            'Thật ra mình không rõ lắm... Cậu có thể giải thích rõ hơn không? 👀',
            'Ooh! Mình chưa gặp câu hỏi này bao giờ 😲 Thú vị đó!',
            'Hehe mình biết cậu đang nghĩ gì rồi... không, thật ra mình không biết gì cả 😂',
            'Cái này... cần hỏi người thông minh hơn mình rồi 😅',
        ];

        // Câu hỏi ngược lại người dùng (để duy trì cuộc trò chuyện)
        this.conversationStarters = [
            'Mà này, cậu đang làm gì đó không? 😊',
            'Hôm nay cậu khỏe không?',
            'À tiện đây, cậu có gì hay kể mình nghe với!',
            'Cậu hay online vào giờ này à? 👀',
            'Mình đang rảnh nè, có gì muốn nói chuyện không?',
        ];
    }

    /**
     * Train từ lịch sử tin nhắn của server
     */
    trainFromMessages(messages) {
        for (const msg of messages) {
            if (msg && msg.length > 3 && msg.length < 200) {
                this.markov.train(msg);
                this.trainedMessages++;
            }
        }
    }

    /**
     * Kiểm tra xem bot có được mention không
     */
    isMentioned(message, botId) {
        const content = message.content || '';
        const lowerContent = content.toLowerCase().replace(/<@!?\d+>/g, '').trim();

        // Check mention trực tiếp
        if (message.mentions && message.mentions.has && message.mentions.has(botId)) return true;

        // Check tên/alias
        for (const alias of BOT_NAME_ALIASES) {
            if (lowerContent.includes(alias)) return true;
        }

        return false;
    }

    /**
     * Lấy text sạch từ message (loại bỏ mention)
     */
    cleanContent(message) {
        let content = message.content || message;
        // Xóa mention
        content = content.replace(/<@!?\d+>/g, '').trim();
        // Xóa prefix tiếng Việt common
        content = content.replace(/^(ê\s*|này\s*|ơi\s*)/i, '').trim();
        return content;
    }

    /**
     * Hàm chính: xử lý message và trả về response
     */
    respond(message, userId) {
        const rawContent = typeof message === 'string' ? message : message.content || '';
        const content = this.cleanContent(rawContent);

        // Train markov từ message này luôn (học liên tục)
        if (content.length > 5) {
            this.markov.train(content);
        }

        // Thêm vào context
        this.context.add(userId, 'user', content);

        let response = null;

        // 1. Thử match rule-based trước
        response = this._matchRules(content);

        // 2. Nếu không match, thử markov chain
        if (!response && this.markov.size > 10) {
            const markovResp = this.markov.generate(12);
            if (markovResp && markovResp.length > 5) {
                // Thêm emoji ngẫu nhiên cho vui
                const emojis = ['😊', '🤔', '😂', '👀', '💬', '😄', '🥰'];
                const emoji = Math.random() > 0.5 ? ' ' + emojis[Math.floor(Math.random() * emojis.length)] : '';
                response = markovResp + emoji;
            }
        }

        // 3. Fallback
        if (!response) {
            // 30% chance hỏi ngược lại
            if (Math.random() < 0.3) {
                response = this.conversationStarters[Math.floor(Math.random() * this.conversationStarters.length)];
            } else {
                response = this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
            }
        }

        // Thêm response vào context
        this.context.add(userId, 'bot', response);

        return response;
    }

    /**
     * Match rule-based patterns
     */
    _matchRules(content) {
        const lowerContent = content.toLowerCase();

        for (const rule of RESPONSE_RULES) {
            const matched = rule.patterns.some(pattern => {
                if (pattern instanceof RegExp) return pattern.test(lowerContent);
                return lowerContent.includes(pattern.toLowerCase());
            });

            if (matched) {
                const responses = rule.responses;
                const pick = responses[Math.floor(Math.random() * responses.length)];
                // Hỗ trợ response là function (cho dynamic content như giờ, ngày)
                return typeof pick === 'function' ? pick() : pick;
            }
        }

        return null;
    }

    /**
     * Phản ứng với emojis/stickers
     */
    reactToEmoji(content) {
        const emojiMap = {
            '😭': ['Sao khóc vậy 😢 Có chuyện gì không?', 'Ơ ơ đừng khóc! 🥺'],
            '😂': ['Haha cậu vui tính quá! 😄', 'Cười cái gì vậy kể mình nghe với! 😂'],
            '😤': ['Ơ bực gì rồi á? 😅', 'Bình tĩnh thôi nào! 😊'],
            '🥰': ['Aww cậu dễ thương quá! 💕', 'Ui ui! 🥰'],
            '❤️': ['Aw 🥺 Cảm ơn nha!', '💕 Cậu tốt bụng quá!'],
        };

        for (const [emoji, responses] of Object.entries(emojiMap)) {
            if (content.includes(emoji)) {
                return responses[Math.floor(Math.random() * responses.length)];
            }
        }
        return null;
    }
}

// ============================================================
// 6. EXPORT
// ============================================================
module.exports = ChatBot;
