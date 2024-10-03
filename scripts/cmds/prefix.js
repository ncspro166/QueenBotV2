.cmd install prefix.js const fs = require("fs-extra");
const axios = require("axios");
const { utils } = global;

module.exports = {
    config: {
        name: "prefix",
        version: "1.7",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        description: "Change the command prefix for Queen Bot V2 or view bot information",
        category: "config",
        guide: {
            en: "   {pn}: show bot information and current prefix"
                + "\n   {pn} <new prefix>: change new prefix in your box chat"
                + "\n   Example: {pn} #"
                + "\n   {pn} <new prefix> -g: change new prefix in system bot (only admin bot)"
                + "\n   Example: {pn} # -g"
                + "\n   {pn} reset: change prefix in your box chat to default"
        }
    },

    langs: {
        en: {
            reset: "Your prefix has been reset to default: %1",
            onlyAdmin: "Only admin can change prefix of system bot",
            confirmGlobal: "Please react to this message with any emoji to confirm changing the prefix of Queen Bot V2",
            confirmThisThread: "Please react to this message with any emoji to confirm changing the prefix in your chat box",
            successGlobal: "Changed prefix of Queen Bot V2 to: %1",
            successThisThread: "Changed prefix in your chat box to: %1",
            botInfo: "✨ Queen Bot V2 - Your Cute Assistant ✨\n\n"
                + "🌸 Current system prefix: %1\n"
                + "🎀 Current chat box prefix: %2\n\n"
                + "Available commands:\n"
                + "🤖 AI - Always here to help you, your assistant\n"
                + "🎨 Flux - No prefix cmd, allows you to generate your imagination\n"
                + "🧠 .g - Gemini 1.5 flash response to your every question and image reply support\n"
                + "🎵 .s - Listen to songs from Spotify using name or link\n\n"
                + "Feel free to ask me anything! I'm here to make your day brighter! 💖"
        }
    },

    onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
        if (!args[0]) {
            const gifUrl = "https://imgur.com/a/gcpFl2s";
            const attachment = await global.utils.getStreamFromURL(gifUrl);
            return message.reply({
                body: getLang("botInfo", global.GoatBot.config.prefix, utils.getPrefix(event.threadID)),
                attachment: attachment
            });
        }

        if (args[0] == 'reset') {
            await threadsData.set(event.threadID, null, "data.prefix");
            return message.reply(getLang("reset", global.GoatBot.config.prefix));
        }

        const newPrefix = args[0];
        const formSet = {
            commandName,
            author: event.senderID,
            newPrefix
        };

        if (args[1] === "-g")
            if (role < 2)
                return message.reply(getLang("onlyAdmin"));
            else
                formSet.setGlobal = true;
        else
            formSet.setGlobal = false;

        return message.reply(args[1] === "-g" ? getLang("confirmGlobal") : getLang("confirmThisThread"), (err, info) => {
            formSet.messageID = info.messageID;
            global.GoatBot.onReaction.set(info.messageID, formSet);
        });
    },

    onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
        const { author, newPrefix, setGlobal } = Reaction;
        if (event.userID !== author)
            return;
        if (setGlobal) {
            global.GoatBot.config.prefix = newPrefix;
            fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
            return message.reply(getLang("successGlobal", newPrefix));
        }
        else {
            await threadsData.set(event.threadID, newPrefix, "data.prefix");
            return message.reply(getLang("successThisThread", newPrefix));
        }
    },

    onChat: async function ({ event, message, getLang }) {
        if (event.body && event.body.toLowerCase() === "prefix") {
            const gifUrl = "https://i.imgur.com/iwFQpbR.jpeg";
            const attachment = await global.utils.getStreamFromURL(gifUrl);
            return message.reply({
                body: getLang("botInfo", global.GoatBot.config.prefix, utils.getPrefix(event.threadID)),
                attachment: attachment
            });
        }
    }
};