const axios = require("axios");
const { shortenURL } = global.utils;
module.exports = {
    config: {
        name: "r",
        version: "1.0",
        author: "Shikaki",
        countDown: 5,
        role: 0,
        description: {
            en: "Multimodal ai",
        },
        guide: {
            en: "{pn} <query>\n\nReply to image/video/audio and ask question.\nE.g:\n{pn} what is this?",
        },
        category: "ai",
    },
    onStart: async function ({ api, message, event, args, commandName }) {
        let prompt = args.join(" ");
        const uid = event.senderID;
        let url;
        let mimeType;

        //clearing helps to start new chat and reduce hallucination and errors.
        try {
            const res = await axios.get(https://reka.onrender.com/chat?chatId=${uid}&prompt=clear);
            if (res.status !== 200) {
                console.error("Error clearing chat:", res.status, res.data);
            }
        } catch (error) {
            console.error("Error clearing chat:", error);
        }

        if (event.type === "message_reply") {
            if (event.messageReply.attachments?.length > 0) {
                url = event.messageReply.attachments[0]?.url;
                mimeType = event.messageReply.attachments[0]?.mimeType;
                if (mimeType?.startsWith('image/')) {
                    mimeType = 'image_url';
                } else if (mimeType?.startsWith('video/')) {
                    mimeType = 'video_url';
                } else if (mimeType?.startsWith('audio/')) {
                    mimeType = 'audio_url';
                }
            }
            prompt = event.messageReply.body + " " + prompt;
        }

        if (!prompt.trim()) {
            return message.reply("Please provide a prompt.");
        }

        api.setMessageReaction("⌛", event.messageID, () => { }, true);
        try {
            let response;
            if (url) {
                url = await shortenURL(url);
                response = await axios.get(https://reka.onrender.com/chat?uid=${uid}&prompt=${encodeURIComponent(prompt)}${url ? `&url=${encodeURIComponent(url)}&urlType=${mimeType} : ''}`);
            } else {
                response = await axios.get(https://reka.onrender.com/chat?uid=${uid}&prompt=${encodeURIComponent(prompt)});
            }
            message.reply(response.data.message, (err, info) => { //Updated this line
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID,
                    });
                } else {
                    console.error("Error sending message:", err);
                }
            });
        } catch (error) {
            console.error("Error fetching response:", error);
            message.reply("An error occurred. Please try again later.");
        }
    },
    onReply: async function ({ api, message, event, Reply, args }) {
        const prompt = args.join(" ");
        const { author, commandName } = Reply;
        let uid = event.senderID;

        if (uid !== author) return;

        api.setMessageReaction("⌛", event.messageID, () => { }, true);
        try {
            let response = await axios.get(https://reka.onrender.com/chat?uid=${uid}&prompt=${encodeURIComponent(prompt)});
            message.reply(response.data.message, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID,
                    });
                } else {
                    console.error("Error sending message:", err);
                }
            });
        } catch (error) {
            console.error("Error fetching response:", error);
            message.reply("An error occurred. Please try again later.");
        }
    }
};
