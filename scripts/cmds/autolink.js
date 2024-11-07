const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: 'autolink',
        version: '1.5.0',
        author: 'Priyanshi Kaur',
        countDown: 5,
        role: 0,
        description: 'Auto video downloader for Instagram, Facebook, TikTok, Twitter and Youtube, etc.',
        category: 'media',
        guide: {
            en: "{pn} -> Check autolink status\n{pn} [on | off] -> Turn autolink on or off"
        },
    },

    onStart: async function ({ event, message, args, prefix }) {
        const threadID = event.threadID;
        const autolinkFile = 'autolink.json';
        let autolinkData = {};

        if (fs.existsSync(autolinkFile)) {
            autolinkData = JSON.parse(fs.readFileSync(autolinkFile, 'utf8'));
        }

        if (!autolinkData[threadID]) {
            autolinkData[threadID] = false;
            fs.writeFileSync(autolinkFile, JSON.stringify(autolinkData, null, 2));
        }

        if (!args[0]) {
            return message.reply(autolinkData[threadID] 
                ? "✅ Autolink is enabled. Use autolink off to disable." 
                : "❌ Autolink is disabled. Use autolink on to enable.");
        }

        if (args[0].toLowerCase() === "on") {
            autolinkData[threadID] = true;
            fs.writeFileSync(autolinkFile, JSON.stringify(autolinkData, null, 2));
            return message.reply("✅ Autolink has been turned on.");
        } else if (args[0].toLowerCase() === "off") {
            autolinkData[threadID] = false;
            fs.writeFileSync(autolinkFile, JSON.stringify(autolinkData, null, 2));
            return message.reply("❌ Autolink has been turned off.");
        }
    },

    onChat: async function ({ message, event, api }) {
        const autolinkData = JSON.parse(fs.readFileSync('autolink.json', 'utf8'));
        if (!autolinkData[event.threadID]) return;

        let url = event.body || "";
        if (event.type === "message_reply") {
            url = event.messageReply.body || "";
        }

        const extractUrl = (text) => {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const matches = text.match(urlRegex);
            return matches ? matches[0] : null;
        };

        const isValidDomain = (url) => {
            const domains = ["instagram.com", "facebook.com", "fb.watch", "tiktok.com", "twitter.com", "x.com", "youtube.com", "youtu.be"];
            return domains.some(domain => url.includes(domain));
        };

        const processVideo = async (videoURL) => {
            try {
                api.setMessageReaction("⏳", event.messageID, () => {}, true);
                
                const response = await axios.get('https://alldl-team-clayx.onrender.com/download', {
                    params: { url: videoURL }
                });

                if (!response.data.download_url) throw new Error("No download URL received");

                const videoUrl = `https://alldl-team-clayx.onrender.com/${response.data.download_url}`;
                const videoPath = path.join(__dirname, `temp_${Date.now()}.mp4`);
                
                const videoResponse = await axios({
                    url: videoUrl,
                    method: 'GET',
                    responseType: 'stream'
                });

                const writer = fs.createWriteStream(videoPath);
                videoResponse.data.pipe(writer);

                return new Promise((resolve, reject) => {
                    writer.on('finish', async () => {
                        try {
                            await message.reply({
                                body: "Downloaded video:",
                                attachment: fs.createReadStream(videoPath)
                            });
                            fs.unlinkSync(videoPath);
                            api.setMessageReaction("✅", event.messageID, () => {}, true);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    });

                    writer.on('error', reject);
                });
            } catch (error) {
                api.setMessageReaction("❌", event.messageID, () => {}, true);
                throw error;
            }
        };

        if (event.type === "share") {
            const attachments = event.attachments;
            if (attachments && attachments[0] && attachments[0].type === "share") {
                url = attachments[0].url;
            }
        }

        const extractedUrl = extractUrl(url);
        if (!extractedUrl || !isValidDomain(extractedUrl)) return;

        try {
            await processVideo(extractedUrl);
        } catch (error) {
            message.reply(`Failed to process video: ${error.message}`);
        }
    }
};