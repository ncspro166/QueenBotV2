const axios = require('axios');

module.exports = {
    config: {
        name: "dalle",
        version: "1.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Generate images using dalle",
        longDescription: "Generate images using GPT AI model with custom prompts",
        category: "ai",
        guide: "{pn} [prompt]"
    },

    onStart: async function ({ api, event, args, message, usersData }) {
        const prompt = args.join(" ");
        if (!prompt) {
            return message.reply("Please provide a prompt to generate an image.");
        }

        const processingMessage = await message.reply("Processing your image request, please wait...");

        try {
            const response = await axios.get(`https://priyansh-ai.onrender.com/imagine?&prompt=${encodeURIComponent(prompt)}`);
            const imageUrl = response.data.url;
            
            if (!imageUrl) {
                message.unsend(processingMessage.messageID);
                return message.reply("Failed to generate image. Please try again.");
            }

            const userData = await usersData.get(event.senderID);
            const userName = userData.name;
            const title = `Here Is Your Requested Picture Ms/Mr ${userName}`;

            const imageStream = await axios.get(imageUrl, { responseType: 'stream' });
            
            message.unsend(processingMessage.messageID);
            
            await message.reply({
                body: title,
                attachment: imageStream.data
            });

        } catch (error) {
            message.unsend(processingMessage.messageID);
            return message.reply("An error occurred while generating the image. Please try again later.");
        }
    }
};