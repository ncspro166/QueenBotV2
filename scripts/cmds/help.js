const fs = require("fs-extra");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.QueenBotV2;
const divider = "╭─────────────────────⭓ QueenBotV2 COMMANDS ⭓─────────────────────╮";

/**
* Author: NTKhang & QueenBotV2 Team
* Modified by Priyanshi Kaur
* Description: Enhanced Help Command with a Technological UI for QueenBotV2
*/

module.exports = {
  config: {
    name: "help",
    version: "2.0",
    author: "NTKhang & Priyanshi Kaur",
    countDown: 3,
    role: 0,
    description: {
      en: "Get a detailed guide on available commands."
    },
    category: "info",
    guide: {
      en: "{pn} [empty | <page number> | <command name>]"
           + "\n   {pn} <command name> [-u | usage | -g | guide]: display command usage only"
           + "\n   {pn} <command name> [-i | info]: display command info only"
           + "\n   {pn} <command name> [-r | role]: display command role only"
           + "\n   {pn} <command name> [-a | alias]: display command alias only"
    },
    priority: 1
  },

  langs: {
    en: {
      helpHeader: "╭─ QueenBotV2 Commands ─╮\n",
      helpFooter: "\n╰─────────────────────⭓\n",
      helpUsage: "\n%1\n├── Page [ %2/%3 ]"
                + "\n│ Bot Commands Available: %4"
                + "\n│ 🔎 Use %5help <page> to browse commands"
                + "\n│ 📖 Use %5help <command name> for detailed guide\n",
      commandNotFound: "⚠ Command \"%1\" was not found!",
      helpWithGuide: "╭── %1 ──⭓"
                + "\n│ Description: %2"
                + "\n│ Aliases: %3"
                + "\n│ Role Required: %4"
                + "\n│ Command Usage: \n│%5\n",
      onlyUsage: "╭── USAGE ──⭓\n│%1\n╰──⭓\n",
      onlyAlias: "╭── ALIASES ──⭓\n│%1\n╰──⭓\n",
      onlyRole: "╭── ROLE ──⭓\n│%1\n╰──⭓\n",
      onlyInfo: "╭── INFO ──⭓\n│ Command: %1\n│ Description: %2\n│ Aliases: %3\n│ Role: %4\n│ Author: %5\n╰──⭓\n"
    }
  },

  onStart: async function ({ message, args, event, threadsData, getLang }) {
    const { threadID } = event;
    const prefix = getPrefix(threadID);
    const lang = this.langs.en;
    let command = commands.get((args[0] || "").toLowerCase()) || commands.get(aliases.get(args[0].toLowerCase()));

    if (!command) {
      // Displaying command list by category or page
      const page = parseInt(args[0]) || 1;
      const numberPerPage = 6;
      const allCommands = Array.from(commands.values()).filter(cmd => cmd.config.role <= event.role).sort((a, b) => a.config.name.localeCompare(b.config.name));
      const pagedCommands = allCommands.slice((page - 1) * numberPerPage, page * numberPerPage);
      const totalPages = Math.ceil(allCommands.length / numberPerPage);

      let responseText = `${divider}\n${lang.helpHeader}\n`;
      responseText += pagedCommands.map((cmd, idx) => `│ ${idx + 1}. ${cmd.config.name}: ${cmd.config.description.en || "No description available."}`).join("\n");
      responseText += lang.helpFooter;
      responseText += `${lang.helpUsage.replace("%1", "").replace("%2", page).replace("%3", totalPages).replace("%4", commands.size).replace("%5", prefix)}`;
      
      await message.reply(responseText);
    } else {
      // Displaying command details based on the options passed
      let responseText = `${divider}\n${lang.helpWithGuide}`;
      const config = command.config;

      if (args[1]?.match(/^-g|guide|-u|usage$/)) {
        responseText = lang.onlyUsage.replace("%1", config.guide.en);
      } else if (args[1]?.match(/^-a|alias|aliase|aliases$/)) {
        responseText = lang.onlyAlias.replace("%1", config.aliases.join(", ") || "None");
      } else if (args[1]?.match(/^-r|role$/)) {
        responseText = lang.onlyRole.replace("%1", config.role);
      } else if (args[1]?.match(/^-i|info$/)) {
        responseText = lang.onlyInfo.replace("%1", config.name).replace("%2", config.description.en || "No description available").replace("%3", config.aliases.join(", ") || "None").replace("%4", config.role).replace("%5", config.author || "Unknown");
      } else {
        responseText = responseText.replace("%1", config.name).replace("%2", config.description.en || "No description available").replace("%3", config.aliases.join(", ") || "None").replace("%4", config.role).replace("%5", config.guide.en || "Usage information unavailable");
      }
      
      await message.reply(responseText);
    }
  }
};