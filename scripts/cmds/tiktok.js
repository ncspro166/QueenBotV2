const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { TTScraper } = require('tiktok-scraper-ts');

module.exports.config = {
  name: "tiktok",
  version: "1.0",
  hasPermssion: 0,
  credits: "Priyanshi Kaur",
  description: "Download TikTok videos by searching for a matching name",
  commandCategory: "media",
  usages: "[video name or keyword]",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "tiktok-scraper-ts": ""
  }
};

module.exports.run = async function({ api, event, args }) {
  const query = args.join(" ");
  if (!query) return api.sendMessage("Please provide a video name or keyword to search for.", event.threadID);

  try {
    // Search for TikTok videos
    const searchResponse = await axios.get(`https://api.tikapi.io/public/api/search?keyword=${encodeURIComponent(query)}`, {
      headers: {
        'X-API-KEY': 'YOUR_TIKAPI_KEY_HERE' // Replace with your actual TikAPI key
      }
    });

    if (!searchResponse.data.itemList || searchResponse.data.itemList.length === 0) {
      return api.sendMessage("No videos found matching your search query.", event.threadID);
    }

    // Get the first video from the search results
    const video = searchResponse.data.itemList[0];
    const videoUrl = `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`;

    // Download the video
    const scraper = new TTScraper();
    const videoData = await scraper.video(videoUrl);

    if (!videoData.download.nowm) {
      return api.sendMessage("Sorry, I couldn't retrieve the download link for this video.", event.threadID);
    }

    const videoBuffer = await axios.get(videoData.download.nowm, { responseType: 'arraybuffer' });

    // Save the video temporarily
    const tempDir = path.join(__dirname, "cache");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempFilePath = path.join(tempDir, `tiktok_${Date.now()}.mp4`);
    fs.writeFileSync(tempFilePath, Buffer.from(videoBuffer.data));

    // Send the video
    await api.sendMessage(
      {
        body: `Here's the TikTok video matching "${query}":
Caption: ${video.desc}
Author: @${video.author.uniqueId}
Likes: ${video.stats.diggCount}
Comments: ${video.stats.commentCount}
Shares: ${video.stats.shareCount}`,
        attachment: fs.createReadStream(tempFilePath)
      },
      event.threadID,
      (err) => {
        if (err) console.error(err);
        fs.unlinkSync(tempFilePath); // Delete the temporary file after sending
      }
    );
  } catch (error) {
    console.error(error);
    api.sendMessage("An error occurred while trying to download the TikTok video. Please try again later.", event.threadID);
  }
};