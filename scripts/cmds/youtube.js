const youtubesearchapi = require("youtube-search-api");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

module.exports = {
    config: {
        name: "yt",
        aliases: ["youtube"],
        version: "1.1.0",
        hasPermssion: 0,
        credits: "Priyanshi Kaur",
        description: "Download YouTube songs and videos",
        commandCategory: "Media",
        usages: "[songName/URL] [audio/video]",
        prefix: "true",
        cooldowns: 5,
        dependencies: {
            "youtube-search-api": "",
            "axios": ""
        }
    },

    onStart: async function ({ api, event, args }) {
        let songName, type;

        if (args.length > 1 && (args[args.length - 1] === "audio" || args[args.length - 1] === "video")) {
            type = args.pop();
            songName = args.join(" ");
        } else {
            songName = args.join(" ");
            type = "audio";
        }

        const processingMessage = await api.sendMessage("⌛ Processing your request...", event.threadID, null, event.messageID);

        try {
            let videoId;
            let title;

            if (songName.includes("youtu.be") || songName.includes("youtube.com")) {
                videoId = songName.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|v\/|embed\/))([^?\s]+)/)?.[1];
                if (!videoId) throw new Error("Invalid YouTube URL");
            } else {
                const searchResults = await youtubesearchapi.GetListByKeyword(songName, false, 1);
                if (!searchResults || !searchResults.items || !searchResults.items.length) {
                    throw new Error("No results found for your search query.");
                }
                videoId = searchResults.items[0].id;
                title = searchResults.items[0].title;
            }

            const youtubeUrl = `https://youtu.be/${videoId}`;
            const apiKey = "r-e377e74a78b7363636jsj8ffb61ce";
            
            const downloadResponse = await axios.get(`https://for-devs.onrender.com/api/youtube/download`, {
                params: {
                    url: youtubeUrl,
                    apikey: apiKey
                }
            });

            if (!downloadResponse.data || !downloadResponse.data.url) {
                throw new Error("Failed to get download URL");
            }

            const videoUrl = downloadResponse.data.url;
            const videoTitle = title || downloadResponse.data.title || "YouTube_Download";
            
            const filename = `${videoTitle.replace(/[^\w\s]/gi, '')}_${Date.now()}.${type === "audio" ? "mp3" : "mp4"}`;
            const filePath = path.join(__dirname, "cache", filename);

            if (!fs.existsSync(path.join(__dirname, "cache"))) {
                fs.mkdirSync(path.join(__dirname, "cache"));
            }

            const videoResponse = await axios({
                method: 'get',
                url: videoUrl,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            videoResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            if (type === "audio") {
                const mp3Path = filePath.replace(/\.[^/.]+$/, ".mp3");
                await new Promise((resolve, reject) => {
                    childProcess.exec(
                        `ffmpeg -i "${filePath}" -vn -ab 128k -ar 44100 -f mp3 "${mp3Path}"`,
                        (error) => {
                            if (error) reject(error);
                            else {
                                fs.unlinkSync(filePath);
                                resolve();
                            }
                        }
                    );
                });
            }

            const finalPath = type === "audio" ? filePath.replace(/\.[^/.]+$/, ".mp3") : filePath;

            await api.sendMessage(
                {
                    body: `🎵 Title: ${videoTitle}\n📨 Here's your ${type}:`,
                    attachment: fs.createReadStream(finalPath)
                },
                event.threadID,
                async (error, info) => {
                    if (error) {
                        console.error(error);
                    }
                    fs.unlinkSync(finalPath);
                    await api.unsendMessage(processingMessage.messageID);
                },
                event.messageID
            );

            api.setMessageReaction("✅", event.messageID, () => {}, true);

        } catch (error) {
            console.error(error);
            api.sendMessage(`❌ Error: ${error.message}`, event.threadID, event.messageID);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            if (processingMessage) {
                await api.unsendMessage(processingMessage.messageID);
            }
        }
    }
};