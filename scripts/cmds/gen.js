const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getStreamFromURL } = global.utils;

module.exports = {
    config: {
        name: "gen",
        version: "1.0.0",
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
            // Start timing
            const startTime = Date.now();

            // Make API request
            const apiUrl = `https://priyansh-ai.onrender.com/txt2img?prompt=${encodeURIComponent(prompt)}&apikey=priyansh-here`;
            const response = await axios.get(apiUrl);

            if (!response.data || !response.data.imageUrl) {
                api.unsendMessage(waitingMessage.messageID);
                return message.reply("❌ Failed to generate image. Please try again.");
            }

            // Get image from URL
            const imageStream = await getStreamFromURL(response.data.imageUrl);
            
            // Get image resolution
            const imageInfo = await getImageResolution(response.data.imageUrl);
            
            // Calculate generation time
            const endTime = Date.now();
            const generationTime = ((endTime - startTime) / 1000).toFixed(2);

            // Get user info
            const userInfo = await api.getUserInfo(event.senderID);
            const userName = userInfo[event.senderID].name || "User";

            // Prepare message
            const messageText = `🤖 @${userName}\n✍️ ${prompt}\n💠 ${imageInfo}\n⏳ Generated in ${generationTime}s`;

            // Send final message with image
            await message.reply({
                body: messageText,
                attachment: imageStream
            });

            // Remove waiting message
            api.unsendMessage(waitingMessage.messageID);

        } catch (error) {
            api.unsendMessage(waitingMessage.messageID);
            console.error("Error generating image:", error);
            return message.reply("❌ An error occurred while generating the image. Please try again later.");
        }
    }
};

// Helper function to get image resolution
async function getImageResolution(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        
        // Using sharp to get image metadata
        const sharp = require('sharp');
        const metadata = await sharp(buffer).metadata();
        
        // Determine resolution category
        let resolution;
        if (metadata.height >= 1080) {
            resolution = "1080p";
        } else if (metadata.height >= 720) {
            resolution = "720p";
        } else if (metadata.height >= 480) {
            resolution = "480p";
        } else {
            resolution = `${metadata.width}x${metadata.height}`;
        }
        
        return resolution;
        
    } catch (error) {
        console.error("Error getting image resolution:", error);
        return "Unknown Resolution";
    }
}