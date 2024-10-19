const axios = require("axios");

module.exports = {
    config: {
        name: "imagine",
        version: "1.5",
        author: "Shikaki",
        role: 0,
        countDown: 30,
        description: {
            en: "Lots of ai image models.",
        },
        category: "image-gen-ai",
        guide: {
            en: "{pn} <image-description>\n\nOk, so, i will only tell the models that i like and prefer to use.\n\nflux models are good. flux pro and flux 1.1 pro are best among them overall.\n\nOnly flux pro, flux 1.1 pro, stable diffusion 3 ultr and large-turbo, playground v3 can add some texts in images.\n\nanimatediff models generate gifs. Others, i don't really recommend to use. But curiosity killed a cat.",
        },
    },
    onStart: async function ({ api, event, message, args, prefix, commandName }) {
        const prompt = args.join(" ");
        console.log("Incoming prompt:", prompt);

        if (!prompt)
            return message.reply("Please enter image description.");

        api.setMessageReaction("⌛", event.messageID, () => { }, true);

        try {
            const models = await axios.get("https://ai-l9qn.onrender.com/image/list");
            console.log("Available models:", models.data);
            const modelList = models.data.map((model, index) => ${index + 1}. ${model}).join("\n");
            message.reply(Choose a model:\n\n${modelList}\n\n(Reply with corresponding number.\nE.g. for flux-pro, reply 1)\n\n\nIf you want to know about the models, use ${prefix}help imagine, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID,
                        prompt,
                        models: models.data
                    });
                } else {
                    console.error("Error sending message:", err);
                }
            });
        } catch (error) {
            console.error("Error fetching models:", error);
            return message.reply(An error occurred: ${error.message}); 
        }
    },
    onReply: async function ({ api, message, event, Reply, args }) {
        const modelNumber = parseInt(args.join(" "));
        const { author, prompt, models } = Reply;
        console.log("Incoming model number:", modelNumber);

        if (event.senderID !== author) return;
        if (isNaN(modelNumber) || modelNumber < 1 || modelNumber > models.length) {
            return message.reply("Invalid model number selected.");
        }

        try {
            const selectedModel = models[modelNumber - 1];
            console.log("Selected model:", selectedModel);
            console.log("API request sent:", https://ai-l9qn.onrender.com/image/${encodeURIComponent(selectedModel)}/uid=${event.senderID}&q=${encodeURIComponent(prompt)}&n=1);
            const response = await axios.get(https://ai-l9qn.onrender.com/image/${encodeURIComponent(selectedModel)}/uid=${event.senderID}&q=${encodeURIComponent(prompt)}&n=1);
            console.log("API response:", response.data);
            const url = response.data.url;
            
            await message.reply({
                body: Model: ${selectedModel},
                attachment: await global.utils.getStreamFromURL(url)
            });

        } catch (error) {
            console.error("Error generating image:", error);
            return message.reply(An error occurred: ${error.message});
        }
    }
}
