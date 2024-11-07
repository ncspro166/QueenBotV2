const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: "cbin",
    version: "2.0.0",
    author: "LiANE || Priyanshi Kaur",
    countDown: 5,
    role: 2,
    shortDescription: { en: "Monitor Paste Services" },
    longDescription: { en: "Monitor and track various paste service links with advanced filtering" },
    category: "MONITOR",
    guide: {
      en: `
{pn} setup <destination_id> : Set destination for alerts
{pn} add <domain> : Add domain to monitor
{pn} remove <domain> : Remove domain from monitoring
{pn} list : List monitored domains
{pn} stats : View monitoring statistics
{pn} blacklist <keyword> : Add keyword to blacklist
{pn} whitelist <keyword> : Add keyword to whitelist
{pn} clear : Clear monitoring history`
    }
  },

  onLoad: function() {
    const configPath = path.join(__dirname, 'paste_monitor_config.json');
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {
        destinations: [],
        monitoredDomains: [
          'pastebin.com',
          'hastebin.com',
          'ghostbin.co',
          'pastie.org',
          'dpaste.com',
          'paste.debian.net',
          'paste.ubuntu.com'
        ],
        blacklistedKeywords: [],
        whitelistedKeywords: [],
        statistics: {
          totalAlerts: 0,
          domainHits: {},
          lastReset: new Date().toISOString()
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    }
  },

  loadConfig: function() {
    const configPath = path.join(__dirname, 'paste_monitor_config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  },

  saveConfig: function(config) {
    const configPath = path.join(__dirname, 'paste_monitor_config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  },

  async fetchPasteContent(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  generateAlert: function(data) {
    const timestamp = new Date().toLocaleString();
    return `🚨 PASTE SERVICE ALERT
⏰ Time: ${timestamp}
👤 From: ${data.name}
🆔 UID: ${data.senderID}
💭 Thread: ${data.threadName}
📌 GCID: ${data.threadID}
🔗 Domain: ${data.domain}
${data.content ? `📝 Content Preview:
${data.content.slice(0, 500)}${data.content.length > 500 ? '...' : ''}` : ''}
🔍 Analysis:
${data.analysis}`;
  },

  analyzePaste: function(content, config) {
    const analysis = [];
    if (content) {
      config.blacklistedKeywords.forEach(keyword => {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          analysis.push(`⚠️ Contains blacklisted keyword: ${keyword}`);
        }
      });

      if (content.includes('password') || content.includes('credentials')) {
        analysis.push('⚠️ Potential sensitive information detected');
      }

      if (content.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
        analysis.push('📧 Contains email addresses');
      }

      if (content.match(/\b\d{16}\b/g)) {
        analysis.push('💳 Contains potential card numbers');
      }
    }
    return analysis.length > 0 ? analysis.join('\n') : 'No suspicious content detected';
  },

  onStart: async function({ api, args, message, event, usersData }) {
    const config = this.loadConfig();
    const command = args[0];
    const param = args.slice(1).join(' ');

    switch (command) {
      case 'setup':
        if (!param || isNaN(param)) {
          return message.reply('❌ Please provide a valid destination ID');
        }
        config.destinations.push(param);
        this.saveConfig(config);
        return message.reply('✅ Destination added successfully');

      case 'add':
        if (!param) return message.reply('❌ Please provide a domain');
        config.monitoredDomains.push(param);
        this.saveConfig(config);
        return message.reply(`✅ Added ${param} to monitored domains`);

      case 'remove':
        if (!param) return message.reply('❌ Please provide a domain');
        config.monitoredDomains = config.monitoredDomains.filter(d => d !== param);
        this.saveConfig(config);
        return message.reply(`✅ Removed ${param} from monitored domains`);

      case 'list':
        return message.reply(`📋 Monitored Domains:\n${config.monitoredDomains.join('\n')}`);

      case 'stats':
        return message.reply(`📊 Monitoring Statistics:
Total Alerts: ${config.statistics.totalAlerts}
Domain Hits: ${Object.entries(config.statistics.domainHits).map(([domain, hits]) => `\n${domain}: ${hits}`).join('')}
Last Reset: ${new Date(config.statistics.lastReset).toLocaleString()}`);

      case 'blacklist':
        if (!param) return message.reply('❌ Please provide a keyword');
        config.blacklistedKeywords.push(param);
        this.saveConfig(config);
        return message.reply(`✅ Added "${param}" to blacklist`);

      case 'whitelist':
        if (!param) return message.reply('❌ Please provide a keyword');
        config.whitelistedKeywords.push(param);
        this.saveConfig(config);
        return message.reply(`✅ Added "${param}" to whitelist`);

      case 'clear':
        config.statistics = {
          totalAlerts: 0,
          domainHits: {},
          lastReset: new Date().toISOString()
        };
        this.saveConfig(config);
        return message.reply('✅ Statistics cleared');

      default:
        return message.reply(`⚠️ Paste Monitor Guide:
Use the following commands:
cbin setup <destination_id>
cbin add <domain>
cbin remove <domain>
cbin list
cbin stats
cbin blacklist <keyword>
cbin whitelist <keyword>
cbin clear`);
    }
  },

  onChat: async function({ api, args, message, usersData, threadsData, event }) {
    const config = this.loadConfig();
    const data = await usersData.get(event.senderID);
    const thread = await threadsData.get(event.threadID);
    const chat = event.body;

    for (const domain of config.monitoredDomains) {
      if (chat.includes(domain)) {
        config.statistics.totalAlerts++;
        config.statistics.domainHits[domain] = (config.statistics.domainHits[domain] || 0) + 1;
        this.saveConfig(config);

        const pasteContent = await this.fetchPasteContent(chat);
        const analysis = this.analyzePaste(pasteContent, config);

        const alertData = {
          name: data.name,
          senderID: event.senderID,
          threadName: thread.threadName,
          threadID: event.threadID,
          domain: domain,
          content: pasteContent,
          analysis: analysis
        };

        const alert = this.generateAlert(alertData);

        for (const destination of config.destinations) {
          api.sendMessage(alert, destination);
        }

        api.setMessageReaction("🚨", event.messageID, (err) => {}, true);
      }
    }
  }
};