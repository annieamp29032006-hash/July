const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Add /baucua to Slash Commands list
if (!code.includes("{ name: 'baucua'")) {
    code = code.replace(
        "const commands = [",
        "const commands = [\n  { name: 'baucua', description: 'Chơi Bầu Cua Tôm Cá (Nhiều người)' },"
    );
}

// 2. Add ChatBot mention logic
const chatbotLogic = `
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
`;
if (!code.includes("Chơi Bầu Cua toàn thua mà cứ thích gọi bot là sao?")) {
    const p = code.indexOf("if (message.author.bot) return;");
    if (p !== -1) {
        code = code.substring(0, p + "if (message.author.bot) return;".length) + "\n" + chatbotLogic + "\n" + code.substring(p + "if (message.author.bot) return;".length);
    }
}

fs.writeFileSync('index.js', code);
console.log("Patched index.js");