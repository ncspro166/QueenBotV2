const axios = require('axios');

module.exports = {
  config: {
    name: "funfacts",
    version: "1.0",
    author: "Priyanshi Kaur",
    countDown: 5,
    role: 0,
    shortDescription: "Get random facts, jokes, and quotes",
    longDescription: "Provides a mix of random facts, jokes, and inspirational quotes using free APIs",
    category: "fun",
    guide: {
      en: "{pn} [number of facts (1-5)]"
    }
  },

  onStart: async function ({ message, args }) {
    const numFacts = Math.min(Math.max(parseInt(args[0]) || 1, 1), 5);
    let response = "";

    try {
      for (let i = 0; i < numFacts; i++) {
        // Get a random fact
        const factResponse = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        const fact = factResponse.data.text;
        response += `📚 Fact: ${fact}\n\n`;

        // Get a random joke
        const jokeResponse = await axios.get('https://official-joke-api.appspot.com/random_joke');
        const joke = jokeResponse.data;
        response += `😂 Joke:\n${joke.setup}\n${joke.punchline}\n\n`;

        // Get a random quote
        const quoteResponse = await axios.get('https://api.quotable.io/random');
        const quote = quoteResponse.data;
        response += `💬 Quote: "${quote.content}" - ${quote.author}\n\n`;

        if (i < numFacts - 1) {
          response += "---\n\n";
        }
      }

      await message.reply(response);
    } catch (error) {
      console.error(error);
      await message.reply("Sorry, I couldn't fetch the fun facts at the moment. Please try again later!");
    }
  }
};