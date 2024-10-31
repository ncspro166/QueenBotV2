const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin"],
    version: "1.1.0",
    author: "Priyanshi Kaur || GPT4o",
    role: 0,
    countDown: 25,
    shortDescription: {
      en: "Search for images on Pinterest"
    },
    longDescription: {
      en: "Search and download images from Pinterest with customizable number of results"
    },
    category: "image",
    guide: {
      en: "{prefix}pinterest <search query> -<number of images>"
    }
  },

  onStart: async function ({ api, event, args }) {
    try {
      const keySearch = args.join(" ");
      if (!keySearch.includes("-")) {
        return api.sendMessage(
          `Please enter the search query and number of images to return in the format: ${this.config.guide.en}`, 
          event.threadID, 
          event.messageID
        );
      }

      // Parse search query and number of images
      const keySearchs = keySearch.substr(0, keySearch.indexOf('-')).trim();
      const numberSearch = parseInt(keySearch.split("-").pop().trim()) || 6;

      // Call new API
      const response = await axios.get(`https://api.kenliejugarap.com/pinterestbymarjhun/?search=${encodeURIComponent(keySearchs)}`);
      const { status, data, count } = response.data;

      if (!status || !data || data.length === 0) {
        return api.sendMessage(
          `No images found for "${keySearchs}". Please try another search query.`,
          event.threadID,
          event.messageID
        );
      }

      // Create cache directory if it doesn't exist
      const cacheDir = path.join(__dirname, 'cache');
      await fs.ensureDir(cacheDir);

      const imgData = [];
      const numImages = Math.min(numberSearch, data.length);

      // Download and process images
      for (let i = 0; i < numImages; i++) {
        try {
          const imageUrl = data[i];
          const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imgPath = path.join(cacheDir, `${i + 1}.jpg`);
          await fs.outputFile(imgPath, imgResponse.data);
          imgData.push(fs.createReadStream(imgPath));
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
          continue; // Skip failed images
        }
      }

      if (imgData.length === 0) {
        return api.sendMessage(
          "Failed to process any images. Please try again.",
          event.threadID,
          event.messageID
        );
      }

      // Send images
      await api.sendMessage(
        {
          attachment: imgData,
          body: `Here are ${imgData.length} images for "${keySearchs}"\nTotal results available: ${count}`
        },
        event.threadID,
        event.messageID
      );

      // Cleanup cache
      await fs.remove(cacheDir);
      
    } catch (error) {
      console.error("Pinterest command error:", error);
      return api.sendMessage(
        "An error occurred while fetching images. Please try again later.",
        event.threadID,
        event.messageID
      );
    }
  }
};