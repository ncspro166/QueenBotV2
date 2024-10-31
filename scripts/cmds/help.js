const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;
const doNotDelete = "[ ♕︎ | QueenBotV2 ]";

// List of user IDs allowed to use this command
const permission = ["61556609578687", "Your Uid Here"];

module.exports = {
    config: {
        name: "help",
        version: "2.0",
        author: "NTKhang || Priyanshi Kaur",
        countDown: 5,
        role: 0,
        description: {
            vi: "Xem thông tin chi tiết về lệnh bot",
            en: "View detailed information about bot commands"
        },
        category: "info",
        guide: {
            en: "{pn} - Show command categories\n" +
                "{pn} <page> - Show command list by page\n" +
                "{pn} <command> - View command details\n\n" +
                "Additional:\n" +
                "{pn} search <keyword> - Search commands\n" +
                "{pn} category <name> - Show category commands\n"
        },
        priority: 1
    },

    langs: {
        en: {
            help: "╭───────────╮\n" +
                  "│ COMMAND LIST │\n" +
                  "├───────────┤\n" +
                  "%1\n" +
                  "├───────────┤\n" +
                  "│ Page %2/%3 │ %4 cmds │\n" +
                  "╰───────────╯\n" +
                  "Creator: %5",

            categoryList: "╭─── CATEGORIES ───╮\n" +
                         "%1\n" +
                         "├──────────────╯\n" +
                         "Total: %2 categories",

            commandInfo: "╭── Command Info ─╮\n" +
                        "│ Name: %1\n" +
                        "│ Description: %2\n" +
                        "│ Usage: %3\n" +
                        "│ Aliases: %4\n" +
                        "│ Category: %5\n" +
                        "│ Cooldown: %6s\n" +
                        "│ Permissions: %7\n" +
                        "│ Author: %8\n" +
                        "╰───────────────╯",

            searchResults: "╭── Search Results ─╮\n" +
                         "│ Query: '%1'\n" +
                         "│ Found: %2 commands\n" +
                         "├─────────────────╯\n" +
                         "%3\n" +
                         "╰─────────────────╯",

            noResults: "No commands found for '%1'",
            invalidPage: "Invalid page number. Pages: 1-%1",
            invalidCategory: "Category '%1' not found",
            noPermission: "You don't have permission to use this command",
            cooldownNotice: "Please wait %1s before reusing this command"
        }
    },

    onStart: async function ({ message, args, event, threadsData, getLang, role }) {
        const { threadID, senderID } = event;

        // Permissions check for command usage
        if (!permission.includes(senderID)) {
            return message.reply("❌ | You aren't allowed to use this command.");
        }

        const prefix = getPrefix(threadID);
        const threadData = await threadsData.get(threadID);

        // Search functionality
        if (args[0] === "search" && args[1]) {
            const query = args.slice(1).join(" ").toLowerCase();
            const results = [...commands.values()].filter(cmd => 
                cmd.config.name.toLowerCase().includes(query) ||
                cmd.config.description?.en?.toLowerCase().includes(query)
            );

            if (results.length === 0) {
                return message.reply(getLang("noResults", query));
            }

            const resultText = results.map((cmd, i) => 
                `│ ${i+1}. ${cmd.config.name} - ${cmd.config.description?.en || "No description"}`
            ).join("\n");

            return message.reply(getLang("searchResults", query, results.length, resultText));
        }

        // Category viewing
        if (args[0] === "category" && args[1]) {
            const categoryName = args[1].toLowerCase();
            const categoryCommands = [...commands.values()].filter(cmd => 
                cmd.config.category?.toLowerCase() === categoryName &&
                cmd.config.role <= role
            );

            if (categoryCommands.length === 0) {
                return message.reply(getLang("invalidCategory", args[1]));
            }

            const formattedCommands = categoryCommands
                .map(cmd => `│ ${cmd.config.name} - ${cmd.config.description?.en || "No description"}`)
                .join("\n");

            return message.reply(
                getLang("categoryList", formattedCommands, categoryCommands.length)
            );
        }

        // Command details with example usage
        if (args[0] && args[1] === "-e") {
            const command = commands.get(args[0].toLowerCase());
            if (!command || command.config.role > role) {
                return message.reply(getLang("noPermission"));
            }

            const examples = command.config.examples || [
                `${prefix}${command.config.name}`,
                `${prefix}${command.config.name} help`
            ];

            return message.reply(
                getLang("commandExamples", examples.map(ex => `│ ${ex}`).join("\n"))
            );
        }

        // Regular help functionality
        const page = parseInt(args[0]) || 1;
        const itemsPerPage = 10;
        const filteredCommands = [...commands.values()].filter(cmd => cmd.config.role <= role);
        
        if (args[0] && isNaN(args[0])) {
            // Single command info
            const command = commands.get(args[0].toLowerCase());
            if (!command || command.config.role > role) {
                return message.reply(getLang("noPermission"));
            }

            return message.reply(
                getLang("commandInfo",
                    command.config.name,
                    command.config.description?.en || "No description",
                    command.config.guide?.en || "No usage guide",
                    command.config.aliases?.join(", ") || "None",
                    command.config.category || "Uncategorized",
                    command.config.countDown || 1,
                    command.config.role === 0 ? "All users" :
                    command.config.role === 1 ? "Group admins" :
                    "Bot admins",
                    command.config.author || "Unknown"
                )
            );
        }

        // Paginated command list
        const maxPage = Math.ceil(filteredCommands.length / itemsPerPage);
        if (page < 1 || page > maxPage) {
            return message.reply(getLang("invalidPage", maxPage));
        }

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const commandList = filteredCommands
            .slice(start, end)
            .map((cmd, i) => `│ ${start + i + 1}. ${cmd.config.name} - ${cmd.config.description?.en || "No description"}`)
            .join("\n");

        return message.reply(
            getLang("help",
                commandList,
                page,
                maxPage,
                filteredCommands.length,
                prefix,
                doNotDelete
            )
        );
    }
};