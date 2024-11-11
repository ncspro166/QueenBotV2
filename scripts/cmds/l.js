const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const apiKey = process.env.GROQ_API_KEY || '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';
const groq = new Groq({ apiKey });

const chatHistoryDir = 'groqllama70b';
const systemPrompt = "Examine the prompt and respond precisely as directed, omitting superfluous information. Provide brief responses, typically 1-2 sentences, except when detailed answers like essays, poems, or stories are requested.";

async function processGroqChat(uid, prompt, existingHistory = []) {
    const chatHistory = existingHistory.length > 0 ? existingHistory : loadChatHistory(uid);
    
    const chatMessages = [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: prompt }
    ];

    const chatCompletion = await groq.chat.completions.create({
        messages: chatMessages,
        model: "llama3-70b-8192",
        temperature: 0.6,
        max_tokens: 8192,
        top_p: 0.8,
        stream: false,
        stop: null
    });

    const assistantResponse = chatCompletion.choices[0].message.content;
    
    chatHistory.push({ role: "user", content: prompt });
    chatHistory.push({ role: "assistant", content: assistantResponse });
    appendToChatHistory(uid, chatHistory);

    return assistantResponse;
}

function loadChatHistory(uid) {
    const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);
    
    try {
        if (fs.existsSync(chatHistoryFile)) {
            const fileData = fs.readFileSync(chatHistoryFile, 'utf8');
            return JSON.parse(fileData);
        }
        return [];
    } catch (error) {
        console.error(`Error loading chat history for UID ${uid}:`, error);
        return [];
    }
}

function appendToChatHistory(uid, chatHistory) {
    const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);
    
    try {
        if (!fs.existsSync(chatHistoryDir)) {
            fs.mkdirSync(chatHistoryDir);
        }
        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

function clearChatHistory(uid) {
    const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);
    try {
        if (fs.existsSync(chatHistoryFile)) {
            fs.unlinkSync(chatHistoryFile);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error clearing chat history for UID ${uid}:`, error);
        return false;
    }
}

module.exports = {
    config: {
        name: 'l',
        version: '1.2.0',
        author: 'Shikaki || Optimisd by Priyanshi Kaur',
        countDown: 0,
        role: 0,
        category: 'Ai',
        description: {
            en: 'Fast AI responses using Llama3 70b hosted on Groq',
        },
        guide: {
            en: '{pn} [question]\n\nReply clear to clear chat history\nOr use:\n{pn} clear',
        },
    },

    onStart: async function ({ api, message, event, args, commandName }) {
        const prompt = args.join(" ");
        const uid = event.senderID;

        if (prompt.toLowerCase() === "clear") {
            if (clearChatHistory(uid)) {
                return message.reply("Chat history cleared successfully!");
            }
            return message.reply("No chat history found to clear.");
        }

        let content = prompt;
        if (event.type === "message_reply") {
            content = `${event.messageReply.body} ${prompt}`.trim();
        }

        if (!content) {
            return message.reply("Please provide a prompt.");
        }

        api.setMessageReaction("⌛", event.messageID, () => { }, true);
        const startTime = Date.now();

        try {
            const response = await processGroqChat(uid, content);
            const completionTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const wordCount = response.split(/\s+/).filter(Boolean).length;

            const finalMessage = `${response}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${wordCount}`;

            message.reply(finalMessage, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID
                    });
                }
            });

            api.setMessageReaction("✅", event.messageID, () => { }, true);
        } catch (error) {
            console.error("Error:", error);
            message.reply("An error occurred while processing your request.");
            api.setMessageReaction("❌", event.messageID, () => { }, true);
        }
    },

    onReply: async function ({ api, message, event, Reply, args }) {
        const { author, commandName } = Reply;
        
        if (event.senderID !== author) return;

        const prompt = args.join(" ");
        if (prompt.toLowerCase() === "clear") {
            if (clearChatHistory(author)) {
                return message.reply("Chat history cleared successfully!");
            }
            return message.reply("No chat history found to clear.");
        }

        api.setMessageReaction("⌛", event.messageID, () => { }, true);
        const startTime = Date.now();

        try {
            const response = await processGroqChat(author, prompt);
            const completionTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const wordCount = response.split(/\s+/).filter(Boolean).length;

            const finalMessage = `${response}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${wordCount}`;

            message.reply(finalMessage, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID
                    });
                }
            });

            api.setMessageReaction("✅", event.messageID, () => { }, true);
        } catch (error) {
            console.error("Error:", error);
            message.reply("An error occurred while processing your request.");
            api.setMessageReaction("❌", event.messageID, () => { }, true);
        }
    }
};