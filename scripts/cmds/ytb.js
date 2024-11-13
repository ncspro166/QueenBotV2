const axios = require("axios");
const fs = require("fs-extra");
const { getStreamFromURL, downloadFile, formatNumber } = global.utils;
const path = require("path");

async function searchYoutube(query) {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=YOU_API_KEY`); // GET KEY FROM GOOGLE CONSOLE 
    return response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high.url
    }));
  } catch (error) {
    throw new Error(`Failed to search YouTube: ${error.message}`);
  }
}

async function getVideoInfo(url) {
  try {
    const response = await axios.get(`https://www.samirxpikachu.run.place/ytb?url=${url}`);
    return response.data;
  } catch (error) {
    console.error("Error details:", error.response ? error.response.data : error.message);
    throw new Error(`Failed to fetch video info: ${error.message}`);
  }
}

async function downloadThumbnail(url, index) {
  const tempDir = path.join(__dirname, "tmp");
  await fs.ensureDir(tempDir);
  const tempPath = path.join(tempDir, `thumbnail_${index}.jpg`);
  await downloadFile(url, tempPath);
  return tempPath;
}

async function downloadMedia(url, path) {
  await fs.ensureDir(dirname(path));
  await downloadFile(url, path);
}

module.exports = {
  config: {
    name: "ytb",
    version: "3.23",
    author: "NTKhang & Fixed by Samir Œ",
    countDown: 5,
    role: 0,
    description: {
      vi: "Tải video, audio hoặc xem thông tin video trên YouTube",
      en: "Download video, audio or view video information on YouTube"
    },
    category: "media",
    guide: {
      vi: "   {pn} [video|-v] [<tên video>|<link video>]: dùng để tải video từ youtube."
        + "\n   {pn} [audio|-a] [<tên video>|<link video>]: dùng để tải audio từ youtube"
        + "\n   {pn} [info|-i] [<tên video>|<link video>]: dùng để xem thông tin video từ youtube"
        + "\n   Ví dụ:"
        + "\n    {pn} -v Fallen Kingdom"
        + "\n    {pn} -a Fallen Kingdom"
        + "\n    {pn} -i Fallen Kingdom",
      en: "   {pn} [video|-v] [<video name>|<video link>]: use to download video from youtube."
        + "\n   {pn} [audio|-a] [<video name>|<video link>]: use to download audio from youtube"
        + "\n   {pn} [info|-i] [<video name>|<video link>]: use to view video information from youtube"
        + "\n   Example:"
        + "\n    {pn} -v Fallen Kingdom"
        + "\n    {pn} -a Fallen Kingdom"
        + "\n    {pn} -i Fallen Kingdom"
    }
  },

  langs: {
    vi: {
      error: "❌ Đã xảy ra lỗi: %1",
      noResult: "⭕ Không có kết quả tìm kiếm nào phù hợp với từ khóa %1",
      choose: "%1\n\nReply tin nhắn với số để chọn hoặc nội dung bất kì để gỡ",
      video: "video",
      audio: "âm thanh",
      downloading: "⬇️ Đang tải xuống %1 \"%2\"",
      downloading2: "⬇️ Đang tải xuống %1 \"%2\"\n🔃 Tốc độ: %3MB/s\n⏸️ Đã tải: %4/%5MB (%6%)\n⏳ Ước tính thời gian còn lại: %7 giây",
      noVideo: "⭕ Rất tiếc, không tìm thấy video nào có dung lượng nhỏ hơn 83MB",
      noAudio: "⭕ Rất tiếc, không tìm thấy audio nào có dung lượng nhỏ hơn 26MB",
      info: "💠 Tiêu đề: %1\n🏪 Kênh: %2\n⏱ Thời lượng: %3\n🔠 ID: %4\n🔗 Link: %5"
    },
    en: {
      error: "❌ An error occurred: %1",
      noResult: "⭕ No search results match the keyword %1",
      choose: "%1\n\nReply to the message with a number to choose or any content to cancel",
      video: "video",
      audio: "audio",
      downloading: "⬇️ Downloading %1 \"%2\"",
      downloading2: "⬇️ Downloading %1 \"%2\"\n🔃 Speed: %3MB/s\n⏸️ Downloaded: %4/%5MB (%6%)\n⏳ Estimated time remaining: %7 seconds",
      noVideo: "⭕ Sorry, no video was found with a size less than 83MB",
      noAudio: "⭕ Sorry, no audio was found with a size less than 26MB",
      info: "💠 Title: %1\n🏪 Channel: %2\n⏱ Duration: %3\n🔠 ID: %4\n🔗 Link: %5"
    }
  },

  onStart: async function ({ args, message, event, commandName, getLang }) {
    let type;
    switch (args[0]) {
      case "-v":
      case "video":
        type = "video";
        break;
      case "-a":
      case "-s":
      case "audio":
      case "sing":
        type = "audio";
        break;
      case "-i":
      case "info":
        type = "info";
        break;
      default:
        return message.SyntaxError();
    }

    const input = args.slice(1).join(" ");
    if (!input) return message.SyntaxError();

    const youtubeRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
    
    if (youtubeRegex.test(input)) {
      try {
        const videoInfo = await getVideoInfo(input);
        await handle({ type, videoInfo, message, getLang });
      } catch (err) {
        console.error("Error details:", err);
        return message.reply(getLang("error", err.message));
      }
    } else {
      try {
        const searchResults = await searchYoutube(input);
        if (searchResults.length === 0) {
          return message.reply(getLang("noResult", input));
        }

        let msg = "";
        for (let i = 0; i < searchResults.length; i++) {
          msg += `${i + 1}. ${searchResults[i].title} - ${searchResults[i].channel}\n\n`;
        }

        const thumbnailPaths = await Promise.all(
          searchResults.map((result, index) => downloadThumbnail(result.thumbnail, index))
        );

        const response = await message.reply({
          body: getLang("choose", msg),
          attachment: thumbnailPaths.map(path => fs.createReadStream(path))
        });

        thumbnailPaths.forEach(path => fs.unlink(path).catch(console.error));

        if (response && response.messageID) {
          global.GoatBot.onReply.set(response.messageID, {
            commandName,
            messageID: response.messageID,
            author: event.senderID,
            type,
            searchResults
          });
        } else {
          console.error("Failed to get messageID from response");
          return message.reply(getLang("error", "Failed to process the request"));
        }

      } catch (err) {
        console.error(err);
        return message.reply(getLang("error", err.message));
      }
    }
  },

  onReply: async function ({ message, event, getLang, Reply }) {
    const { type, searchResults, messageID } = Reply;
    const choice = parseInt(event.body);

    if (isNaN(choice) || choice < 1 || choice > searchResults.length) {
      return message.reply(getLang("error", "Invalid choice"));
    }

    await message.unsend(messageID);

    const selectedVideo = searchResults[choice - 1];
    const videoUrl = `https://www.youtube.com/watch?v=${selectedVideo.id}`;

    try {
      const videoInfo = await getVideoInfo(videoUrl);
      await handle({ type, videoInfo, message, getLang });
    } catch (err) {
      console.error("Error details:", err);
      return message.reply(getLang("error", err.message));
    }
  }
};

async function handle({ type, videoInfo, message, getLang }) {
  const { id, title, duration, author, image, videos, audios } = videoInfo;

  if (type === "video") {
    const MAX_SIZE = 83 * 1024 * 1024;
    let msgSend;
    try {
      msgSend = await message.reply(getLang("downloading", getLang("video"), title));
    } catch (err) {
      console.error("Failed to send download message:", err);
    }

    try {
      const tempDir = path.join(__dirname, "tmp");
      await fs.ensureDir(tempDir);
      const filePath = path.join(tempDir, `${id}.mp4`);
      await downloadMedia(videos, filePath);
      const stats = await fs.stat(filePath);
      
      if (stats.size > MAX_SIZE) {
        await fs.unlink(filePath);
        return message.reply(getLang("noVideo"));
      }

      await message.reply({
        body: title,
        attachment: fs.createReadStream(filePath)
      });
      await fs.unlink(filePath);
      if (msgSend && msgSend.messageID) {
        await message.unsend(msgSend.messageID).catch(console.error);
      }
    } catch (e) {
      console.error("Error in video handling:", e);
      return message.reply(getLang("error", e.message));
    }
  } else if (type === "audio") {
    const MAX_SIZE = 26 * 1024 * 1024;
    let msgSend;
    try {
      msgSend = await message.reply(getLang("downloading", getLang("audio"), title));
    } catch (err) {
      console.error("Failed to send download message:", err);
    }

    try {
      const tempDir = path.join(__dirname, "tmp");
      await fs.ensureDir(tempDir);
      const filePath = path.join(tempDir, `${id}.mp3`);
      await downloadMedia(audios, filePath);
      const stats = await fs.stat(filePath);
      
      if (stats.size > MAX_SIZE) {
        await fs.unlink(filePath);
        return message.reply(getLang("noAudio"));
      }

      await message.reply({
        body: title,
        attachment: fs.createReadStream(filePath)
      });
      await fs.unlink(filePath);
      if (msgSend && msgSend.messageID) {
        await message.unsend(msgSend.messageID).catch(console.error);
      }
    } catch (e) {
      console.error("Error in audio handling:", e);
      return message.reply(getLang("error", e.message));
    }
  } else if (type === "info") {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const time = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    const msg = getLang("info", title, author, time, id, `https://youtu.be/${id}`);

    await message.reply({
      body: msg,
      attachment: await getStreamFromURL(image)
    });
  }
}