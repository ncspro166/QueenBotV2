const axios = require('axios');
const fs = require('fs');
const path = require('path');

const autoDownloadStates = new Map();
const downloadQueue = new Map();
const userDownloadLimits = new Map();

const supportedPlatforms = {
    youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
    facebook: /^(https?:\/\/)?(www\.)?(facebook|fb)\.(com|watch)\/.*$/,
    instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(?:p|reel)\/([A-Za-z0-9-_]+)/,
    tiktok: /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.*\/video\/(\d+)/,
    twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/
};

const HOURLY_LIMIT = 25;
const GROUP_SETTINGS_FILE = 'group_download_settings.json';

function loadGroupSettings() {
    try {
        if (fs.existsSync(GROUP_SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(GROUP_SETTINGS_FILE, 'utf8'));
        }
    } catch (error) {}
    return {};
}

function saveGroupSettings(settings) {
    fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = userDownloadLimits.get(userId) || { count: 0, timestamp: now };
    
    if (now - userLimit.timestamp > 3600000) {
        userDownloadLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }
    
    if (userLimit.count >= HOURLY_LIMIT) return false;
    
    userLimit.count++;
    userDownloadLimits.set(userId, userLimit);
    return true;
}

function extractValidUrls(text) {
    const urls = [];
    for (const [platform, regex] of Object.entries(supportedPlatforms)) {
        const matches = text.matchAll(new RegExp(regex, 'g'));
        for (const match of matches) {
            urls.push({ url: match[0], platform });
        }
    }
    return urls;
}

async function getVideoMetadata(url, platform) {
    try {
        const response = await axios.get(`https://alldl-team-clayx.onrender.com/metadata`, {
            params: { url, platform }
        });
        return response.data;
    } catch (error) {
        return null;
    }
}

async function downloadVideo(url, platform, api, event) {
    try {
        const response = await axios.get('https://alldl-team-clayx.onrender.com/download', {
            params: { url, platform }
        });

        if (!response.data.download_url) throw new Error('No download URL received');

        const videoUrl = `https://alldl-team-clayx.onrender.com/${response.data.download_url}`;
        const videoPath = path.join(__dirname, `temp_video_${event.threadID}_${Date.now()}.mp4`);

        const videoResponse = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(videoPath);
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(videoPath));
            writer.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

module.exports = {
    config: {
        name: "autolink",
        version: "2.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Auto video downloader",
        longDescription: "Automatically detects and downloads videos from supported platforms",
        category: "Media",
        guide: {
            en: "{prefix}autolink on/off/status"
        }
    },

    onStart: async function ({ api, args, message, event }) {
        const threadID = event.threadID;
        const settings = loadGroupSettings();
        
        if (!args[0] || !['on', 'off', 'status'].includes(args[0].toLowerCase())) {
            return message.reply("Usage: autodownload on/off/status");
        }

        const command = args[0].toLowerCase();
        
        if (command === 'status') {
            const status = settings[threadID] ? 'enabled' : 'disabled';
            const limits = userDownloadLimits.get(event.senderID) || { count: 0 };
            return message.reply(
                `📊 Auto Download Status:\n` +
                `➤ Current state: ${status}\n` +
                `➤ Your downloads: ${limits.count}/${HOURLY_LIMIT}\n` +
                `➤ Supported platforms: ${Object.keys(supportedPlatforms).join(', ')}`
            );
        }

        settings[threadID] = command === 'on';
        saveGroupSettings(settings);
        
        return message.reply(
            `✅ Auto download ${command === 'on' ? 'enabled' : 'disabled'} for this chat\n` +
            `Send any supported video link to auto-download!`
        );
    },

    onChat: async function ({ api, message, event }) {
        const settings = loadGroupSettings();
        if (!settings[event.threadID]) return;

        const text = event.body || '';
        const urls = extractValidUrls(text);
        
        if (urls.length === 0) return;
        
        if (!checkRateLimit(event.senderID)) {
            return message.reply(`⚠️ You've reached the hourly download limit (${HOURLY_LIMIT})`);
        }

        for (const { url, platform } of urls) {
            const threadQueue = downloadQueue.get(event.threadID) || new Set();
            
            if (threadQueue.has(url)) continue;
            threadQueue.add(url);
            downloadQueue.set(event.threadID, threadQueue);

            try {
                api.setMessageReaction("⏳", event.messageID, () => {}, true);
                
                const metadata = await getVideoMetadata(url, platform);
                const videoPath = await downloadVideo(url, platform, api, event);
                
                const messageBody = metadata ? 
                    `🎥 Auto-Downloaded Video\n` +
                    `➤ Platform: ${platform}\n` +
                    `➤ Duration: ${metadata.duration || 'N/A'}\n` +
                    `➤ Quality: ${metadata.quality || 'N/A'}` :
                    `🎥 Video downloaded from ${platform}`;

                await api.sendMessage(
                    { 
                        body: messageBody,
                        attachment: fs.createReadStream(videoPath)
                    },
                    event.threadID,
                    () => {
                        fs.unlinkSync(videoPath);
                        threadQueue.delete(url);
                        api.setMessageReaction("✅", event.messageID, () => {}, true);
                    }
                );
            } catch (error) {
                threadQueue.delete(url);
                api.setMessageReaction("❌", event.messageID, () => {}, true);
            }
        }
    }
};