const fetch = require("node-fetch");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");

module.exports = {
  config: {
    name: "yt",
    aliases: ["youtube"],
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Priyanshi Kaur",
    description: "Download YouTube song from keyword search and link",
    commandCategory: "Media",
    usages: "[songName] [type]",
    prefix: "true",
    cooldowns: 5,
    dependencies: {
      "node-fetch": "",
      "yt-search": ""
    }
  },

  run: async function ({ api, event, args }) {
    let songName, type;

    if (args.length > 1 && (args[args.length - 1] === "audio" || args[args.length - 1] === "video")) {
      type = args.pop();
      songName = args.join(" ");
    } else {
      songName = args.join(" ");
      type = "audio";
    }

    const processingMessage = await api.sendMessage("✅ Processing your request. Please wait...", event.threadID, null, event.messageID);

    try {
      const searchResults = await ytSearch(songName);
      if (!searchResults || !searchResults.videos.length) {
        throw new Error("No results found for your search query.");
      }

      const topResult = searchResults.videos[0];
      const videoId = topResult.videoId;
      const apiKey = "priyansh-here";
      const apiUrl = `https://priyansh-ai.onrender.com/youtube?id=${videoId}&type=${type}&apikey=${apiKey}`;

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      const downloadResponse = await axios.get(apiUrl);
      const downloadUrl = downloadResponse.data.downloadUrl;
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch song. Status code: ${response.status}`);
      }

      const filename = `${topResult.title}.${type === "audio" ? "mp3" : "mp4"}`;
      const downloadPath = path.join(__dirname, filename);
      const songBuffer = await response.buffer();

      fs.writeFileSync(downloadPath, songBuffer);
      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await api.sendMessage({
        attachment: fs.createReadStream(downloadPath),
        body: `🖤 Title: ${topResult.title}\n\n Here is your ${type === "audio" ? "audio" : "video"} 🎧:`
      }, event.threadID, () => {
        fs.unlinkSync(downloadPath);
        api.unsendMessage(processingMessage.messageID);
      }, event.messageID);

    } catch (error) {
      console.error(`Failed to download and send song: ${error.message}`);
      api.sendMessage(`Failed to download song: ${error.message}`, event.threadID, event.messageID);
    }
  }
};