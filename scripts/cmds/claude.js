const fs = require('fs');
const axios = require('axios');

// Utility functions for chat history
function loadChatHistory(uid) {
    const chatHistoryFile = `scripts/commands/cache/${uid}_claude_history.json`;
    try {
        if (fs.existsSync(chatHistoryFile)) {
            const fileData = fs.readFileSync(chatHistoryFile, 'utf8');
            return JSON.parse(fileData);
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error loading chat history for UID ${uid}:`, error);
        return [];
    }
}

function saveChatHistory(uid, chatHistory) {
    const chatHistoryFile = `scripts/commands/cache/${uid}_claude_history.json`;
    try {
        if (!fs.existsSync('scripts/commands/cache')) {
            fs.mkdirSync('scripts/commands/cache', { recursive: true });
        }
        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

function clearChatHistory(uid) {
    const chatHistoryFile = `scripts/commands/cache/${uid}_claude_history.json`;
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

// Main command module
module.exports = {
    config: {
        name: "claude",
        version: "2.5.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Chat with Claude AI",
        longDescription: "Chat with Claude AI with chat history support",
        category: "ai",
        guide: {
            en: "{pn} <query> | {pn} clear to clear chat history"
        }
    },

    onStart: async function ({ api, event, args, message }) {
        try {
            const uid = event.senderID;
            const query = args.join(" ");

            // Handle clear command
            if (query.toLowerCase() === 'clear') {
                const cleared = clearChatHistory(uid);
                return message.reply(cleared ? 
                    "✅ Chat history cleared successfully!" : 
                    "❌ No chat history found to clear.");
            }

            if (!query) {
                return message.reply("Please provide a query!");
            }

            // Load chat history
            const chatHistory = loadChatHistory(uid);
            const conversationContext = chatHistory.map(msg => 
                `${msg.role}: ${msg.content}`).join('\n');

            // Prepare prompt with context
            const fullPrompt = conversationContext ? 
                `${conversationContext}\nHuman: ${query}` : query;

            // Show typing indicator
            api.setMessageReaction("⌛", event.messageID, () => {}, true);

            // Make API request
            const response = await axios.get(`https://c-v5.onrender.com/v1/chat/completions`, {
                params: {
                    prompt: fullPrompt,
                    model: 'claude-3-5-sonnet-20240620'
                }
            });

            if (response.data.status === 'success') {
                const answer = response.data.answer;
                const responseTimeMs = parseInt(response.data.responseTime);
                const responseTimeMin = (responseTimeMs / 60000).toFixed(2);

                // Update chat history
                chatHistory.push(
                    { role: 'Human', content: query },
                    { role: 'Assistant', content: answer }
                );
                
                // Keep only last 10 messages
                if (chatHistory.length > 20) {
                    chatHistory.splice(0, 2);
                }
                saveChatHistory(uid, chatHistory);

                // Send response
                const messageText = `${answer}\n\nResponse Time: ${responseTimeMin} min`;
                message.reply(messageText, (err, info) => {
                    if (!err) {
                        // Save message info for onReply
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName: 'claude',
                            messageID: info.messageID,
                            author: event.senderID
                        });
                    }
                });

                // Change reaction to done
                api.setMessageReaction("✅", event.messageID, () => {}, true);
            } else {
                throw new Error('API response was not successful');
            }

        } catch (error) {
            console.error(error);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return message.reply("❌ An error occurred while processing your request. Please try again later.");
        }
    },

    onReply: async function ({ api, event, Reply, args, message }) {
        const { author, commandName } = Reply;
        
        // Check if reply is from original author
        if (event.senderID !== author) return;

        try {
            const uid = event.senderID;
            const query = args.join(" ");

            if (!query) {
                return message.reply("Please provide a query!");
            }

            // Load chat history
            const chatHistory = loadChatHistory(uid);
            const conversationContext = chatHistory.map(msg => 
                `${msg.role}: ${msg.content}`).join('\n');

            // Prepare prompt with context
            const fullPrompt = conversationContext ? 
                `${conversationContext}\nHuman: ${query}` : query;

            // Show typing indicator
            api.setMessageReaction("⌛", event.messageID, () => {}, true);

            // Make API request
            const response = await axios.get(`https://c-v5.onrender.com/v1/chat/completions`, {
                params: {
                    prompt: fullPrompt,
                    model: 'claude-3-5-sonnet-20240620'
                }
            });

            if (response.data.status === 'success') {
                const answer = response.data.answer;
                const responseTimeMs = parseInt(response.data.responseTime);
                const responseTimeMin = (responseTimeMs / 60000).toFixed(2);

                // Update chat history
                chatHistory.push(
                    { role: 'Human', content: query },
                    { role: 'Assistant', content: answer }
                );
                
                // Keep only last 10 messages
                if (chatHistory.length > 20) {
                    chatHistory.splice(0, 2);
                }
                saveChatHistory(uid, chatHistory);

                // Send response
                const messageText = `${answer}\n\nResponse Time: ${responseTimeMin} min`;
                message.reply(messageText, (err, info) => {
                    if (!err) {
                        // Save message info for next onReply
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName: 'claude',
                            messageID: info.messageID,
                            author: event.senderID
                        });
                    }
                });

                // Change reaction to done
                api.setMessageReaction("✅", event.messageID, () => {}, true);
            } else {
                throw new Error('API response was not successful');
            }

        } catch (error) {
            console.error(error);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return message.reply("❌ An error occurred while processing your request. Please try again later.");
        }
    }
};