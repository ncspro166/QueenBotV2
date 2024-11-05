const axios = require('axios');
const sizeOf = require('image-size');
const { getStreamFromURL } = global.utils;

module.exports = {
    config: {
        name: "gen",
        version: "1.5.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Generate images from text prompts"
        },
        longDescription: {
            en: "Creates images based on text descriptions using AI"
        },
        category: "AI",
        guide: {
            en: "{pn} <your prompt here>"
        }
    },

    onStart: async function ({ api, event, args, message }) {
        const prompt = args.join(" ");
        
        if (!prompt) {
            return message.reply("⚠️ Please provide a prompt for image generation.");
        }

        const waitingMessage = await message.reply("⌛ Generating your image...");

        try {
            const startTime = Date.now();
            const apiUrl = `https://priyansh-ai.onrender.com/txt2img?prompt=${encodeURIComponent(prompt)}&apikey=priyansh-here`;
            const response = await axios.get(apiUrl);

            if (!response.data || !response.data.imageUrl) {
                api.unsendMessage(waitingMessage.messageID);
                return message.reply("❌ Failed to generate image. Please try again.");
            }

            const imageDetails = await getImageDetails(response.data.imageUrl);
            if (!imageDetails) {
                api.unsendMessage(waitingMessage.messageID);
                return message.reply("❌ Failed to process image details. Please try again.");
            }

            const imageStream = await getStreamFromURL(response.data.imageUrl);
            
            const endTime = Date.now();
            const generationTime = ((endTime - startTime) / 1000).toFixed(2);

            const userInfo = await api.getUserInfo(event.senderID);
            const userName = userInfo[event.senderID].name || "User";

            const messageText = `🤖 @${userName}\n✍️ ${prompt}\n💠 ${imageDetails.resolution}\n📏 ${imageDetails.size}\n⏳ Generated in ${generationTime}s`;

            await message.reply({
                body: messageText,
                attachment: imageStream
            });

            api.unsendMessage(waitingMessage.messageID);

        } catch (error) {
            api.unsendMessage(waitingMessage.messageID);
            console.error("Error generating image:", error);
            return message.reply("❌ An error occurred while generating the image. Please try again later.");
        }
    }
};

async function getImageDetails(imageUrl) {
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });

        const dimensions = sizeOf(response.data);
        const sizeInBytes = response.data.length;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

        let resolution;
        if (dimensions.height >= 1080) {
            resolution = "1080p";
        } else if (dimensions.height >= 720) {
            resolution = "720p";
        } else if (dimensions.height >= 480) {
            resolution = "480p";
        } else {
            resolution = `${dimensions.width}x${dimensions.height}`;
        }

        const size = sizeInMB >= 1 ? `${sizeInMB}MB` : `${(sizeInMB * 1024).toFixed(2)}KB`;

        return {
            resolution: resolution,
            size: size
        };
        
    } catch (error) {
        console.error("Error getting image details:", error);
        return null;
    }
}