const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const apiUrl = 'https://api.cohere.ai/v1/chat';
const apiKey = "0QrPVuUPwu0JlCCc3LllVsKXB9S78PXslGsxtR2H";

var uid;
var prompt;
var totalTimeInSeconds;
var wordCount;

function generateData(message, chatHistory) {
    return {
        model: 'command-nightly',  // Updated to a newer model
        message,
        chat_history: chatHistory,
        temperature: 0.5,
        prompt_truncation: 'AUTO',
        connectors: [{ id: 'web-search' }],
    };
}

function printOutput(result) {
    let response = `${result.text}\n\n`;

    if (result.documents && result.documents.length > 0) {
        response += `References:\n`;
        result.documents.forEach((doc, index) => {
            response += `[${index + 1}] ${doc.title}: ${doc.url}\n`;
        });
    }

    return response;
}

function loadChatHistory(uid) {
    const chatHistoryFile = path.join(__dirname, 'uids', `${uid}_cohere.json`);

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

function appendToChatHistory(uid, chatHistory) {
    const chatHistoryFile = path.join(__dirname, 'uids', `${uid}_cohere.json`);

    try {
        if (!fs.existsSync(path.dirname(chatHistoryFile))) {
            fs.mkdirSync(path.dirname(chatHistoryFile), { recursive: true });
        }

        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

async function getTextCohere(uid, prompt = "") {
    const startTime = Date.now();
    let chatHistory = loadChatHistory(uid);

    const data = generateData(prompt, chatHistory);
    console.log("Sending data:", data);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const endTime = Date.now();
    totalTimeInSeconds = (endTime - startTime) / 1000;
    wordCount = result.text.split(/\s+/).length || 0;

    chatHistory.push({ role: "Human", content: prompt });
    chatHistory.push({ role: "AI", content: result.text });

    // Limit chat history to last 10 messages to prevent it from growing too large
    chatHistory = chatHistory.slice(-10);

    appendToChatHistory(uid, chatHistory);

    return printOutput(result);
}

function clearChatHistory(uid) {
    const chatHistoryFile = path.join(__dirname, 'uids', `${uid}_cohere.json`);

    try {
        if (fs.existsSync(chatHistoryFile)) {
            fs.unlinkSync(chatHistoryFile);
            console.log(`Chat history for UID ${uid} cleared successfully.`);
        } else {
            console.log(`No chat history found for UID ${uid}.`);
        }
    } catch (error) {
        console.error(`Error clearing chat history for UID ${uid}:`, error);
    }
}

module.exports = {
    config: {
        name: "c",
        version: "1.5.0",
        author: "Shikaki || Priyanshi Kaur",
        countDown: 5,
        role: 0,
        description: {
            en: "Fast input text with Cohere AI. Includes chat history and web search."
        },
        guide: { en: "{pn} <query>\n{pn} clear - Clears your chat history" },
        category: "ai",
    },
    onStart: async function ({ api, message, event, args, commandName }) {
        prompt = args.join(" ");
        uid = event.senderID;

        if (prompt.toLowerCase() === "clear") {
            clearChatHistory(uid);
            message.reply("Chat history cleared successfully for UID " + uid + ".");
            return;
        }

        api.setMessageReaction("⌛", event.messageID, () => {}, true);

        try {
            console.log("Prompt:", prompt);
            const text = await getTextCohere(uid, prompt);
            console.log("Text:", text);

            api.sendMessage(`${text}\n\nCompletion time: ${totalTimeInSeconds.toFixed(2)} seconds\nTotal words: ${wordCount}`, event.threadID, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID,
                    });
                }
            }, event.messageID);

            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            message.reply(`${error.message}`);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
        }
    },
    onReply: async function ({ api, message, event, Reply, args }) {
        prompt = args.join(" ");
        uid = event.senderID;

        let { author, commandName } = Reply;

        if (event.senderID !== author) return;

        api.setMessageReaction("⌛", event.messageID, () => {}, true);

        try {
            console.log("Prompt:", prompt);
            const text = await getTextCohere(uid, prompt);
            console.log("Text:", text);

            message.reply(`${text}\n\nCompletion time: ${totalTimeInSeconds.toFixed(2)} seconds\nTotal words: ${wordCount}`, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID,
                    });
                }
            });

            api.setMessageReaction("✅", event.messageID, () => {}, true);
        } catch (error) {
            message.reply(`${error.message}`);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
        }
    }
};