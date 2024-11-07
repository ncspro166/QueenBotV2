const axios = require('axios');
const moment = require('moment');

module.exports = {
  config: {
    name: "news",
    version: "1.1.0",
    author: "Priyanshi Kaur",
    role: 0,
    shortDescription: "Get the latest news",
    longDescription: "Fetch latest news articles with advanced filtering options and categories",
    category: "information",
    guide: {
      en: "{pn} <search query> [-p <page>] [-l <limit>] [-s <start date>] [-e <end date>] [-c <country>] [-cat <category>]"
    }
  },

  onStart: async function ({ message, args, event, api }) {
    const apiKey = 'pub_58469e502420503e080d8b5b1033b2979c306';
    let query = "";
    let page = 1;
    let limit = 5;
    let fromDate = null;
    let toDate = null;
    let country = null;
    let category = null;
    
    const validCategories = [
      'business', 'entertainment', 'environment', 'food',
      'health', 'politics', 'science', 'sports', 'technology', 'top', 'world'
    ];

    if (args.length === 0) {
      return message.reply(`📰 News Command Guide:
1. Basic search: news <query>
2. Page: -p <number>
3. Limit: -l <number>
4. Date range: -s YYYY-MM-DD -e YYYY-MM-DD
5. Country: -c <country code>
6. Category: -cat <category>

Available categories: ${validCategories.join(', ')}`);
    }

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '-p':
          if (!isNaN(parseInt(args[i + 1]))) {
            page = parseInt(args[i + 1]);
            i++;
          }
          break;
        case '-l':
          if (!isNaN(parseInt(args[i + 1]))) {
            limit = Math.min(parseInt(args[i + 1]), 10);
            i++;
          }
          break;
        case '-s':
          fromDate = moment(args[i + 1], 'YYYY-MM-DD', true);
          if (!fromDate.isValid()) {
            return message.reply("⚠️ Invalid 'from' date format. Use YYYY-MM-DD");
          }
          i++;
          break;
        case '-e':
          toDate = moment(args[i + 1], 'YYYY-MM-DD', true);
          if (!toDate.isValid()) {
            return message.reply("⚠️ Invalid 'to' date format. Use YYYY-MM-DD");
          }
          i++;
          break;
        case '-c':
          country = args[i + 1]?.toUpperCase();
          i++;
          break;
        case '-cat':
          category = args[i + 1]?.toLowerCase();
          if (!validCategories.includes(category)) {
            return message.reply(`⚠️ Invalid category. Available categories: ${validCategories.join(', ')}`);
          }
          i++;
          break;
        default:
          if (!args[i].startsWith('-')) {
            query += args[i] + " ";
          }
      }
    }

    query = query.trim();

    if (!query && !category) {
      return message.reply("⚠️ Please provide a search query or select a category");
    }

    try {
      await api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

      const params = {
        apikey: apiKey,
        page,
        language: "en"
      };

      if (query) params.q = query;
      if (fromDate) params.from_date = fromDate.format('YYYY-MM-DD');
      if (toDate) params.to_date = toDate.format('YYYY-MM-DD');
      if (country) params.country = country;
      if (category) params.category = category;

      const response = await axios.get('https://newsdata.io/api/1/news', { params });

      if (response.data.status === "success" && response.data.results.length > 0) {
        const articles = response.data.results.slice(0, limit);
        let newsMessage = `📰 ${category ? `Top ${category.toUpperCase()} News` : `News about "${query}"`}\n`;
        newsMessage += `📄 Page ${page} | 📊 Showing ${articles.length} articles\n\n`;

        articles.forEach((article, index) => {
          const date = moment(article.pubDate).format('MMM DD, YYYY');
          newsMessage += `${index + 1}. ${article.title}\n`;
          newsMessage += `📅 ${date}\n`;
          if (article.description) {
            newsMessage += `📝 ${article.description.slice(0, 150)}...\n`;
          }
          newsMessage += `🔗 ${article.link}\n\n`;
        });

        if (response.data.nextPage) {
          newsMessage += `\n📱 For next page, use: news ${query} -p ${response.data.nextPage}`;
        }

        const messageSplit = newsMessage.match(/.{1,5000}/g);
        
        for (const part of messageSplit) {
          await message.reply(part);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await api.setMessageReaction("📰", event.messageID, (err) => {}, true);
      } else {
        await message.reply(`⚠️ No news found${query ? ` for "${query}"` : ` in ${category} category`}`);
      }

    } catch (error) {
      console.error("News Command Error:", error.message);
      await message.reply(`❌ Error: ${error.message || "Failed to fetch news"}`);
      await api.setMessageReaction("❌", event.messageID, (err) => {}, true);
    }
  }
};