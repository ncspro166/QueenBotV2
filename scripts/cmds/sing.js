const youtubesearchapi = require("youtube-search-api");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

async function getDownloadUrl(url) {
  const curlCommand = `curl -X POST \
  https://cnvmp3.com/fetch.php \
  -H 'Content-Type: application/json' \
  -d '{"url":"${url}","downloadMode":"audio","filenameStyle":"pretty","audioBitrate":"96"}'`;

    const output = childProcess.execSync(curlCommand);
    const jsonData = JSON.parse(output.toString());
    const videoDownloadUrl = jsonData.url;
    return videoDownloadUrl;
}

module.exports = {
  config: {
    name: "sing",
    aliases: ["music", "song"],
    version: "1.3.7",
    role: 0,
    author: "Shikaki",
    cooldowns: 5,
    description: "Download music from Youtube",
    guide: { en: "{pn}music name" },
    category: "media",
  },

  onStart: async ({ event, message }) => {
    const input = event.body.split(" ");
    if (input.length < 2) return message.reply("Please specify a music name!");

    input.shift();
    const musicName = input.join(" ");
    message.reply(`Searching music "${musicName}", please wait...`);

    const searchResults = await youtubesearchapi.GetListByKeyword(musicName, false, 2);
    if (!searchResults.items.length) return message.reply("No music found.");

    let downloadUrl, musicTitle;
    for (let i = 0; i < Math.min(2, searchResults.items.length); i++) {
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${searchResults.items[i].id}`;
        musicTitle = searchResults.items[i].title;
        downloadUrl = await getDownloadUrl(videoUrl);
        if (downloadUrl) break;
      } catch (error) {
        console.error(`Error processing video URL ${searchResults.items[i].id}:`, error);
        if (i === 1) return message.reply("An error occurred while processing the command.");
      }
    }

    if (!downloadUrl) return message.reply("No download URL found.");

    try {
      const response = await axios.get(downloadUrl, { responseType: "stream" });
      const filePath = path.join(__dirname, "..", "..", "temp", `${Date.now()}.mp3`);

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await message.reply({
        body: `💁🏻‍♂ • Here's your music!\n\n♥ • Title: ${musicTitle}`,
        attachment: fs.createReadStream(filePath),
      });

      fs.unlinkSync(filePath);
    } catch (error) {
      console.error("[ERROR] Downloading or sending file:", error);
      message.reply("An error occurred while processing the command.");
    }
  },
};