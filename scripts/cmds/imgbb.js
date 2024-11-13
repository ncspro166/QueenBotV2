const axios = require('axios');
const FormData = require('form-data');

module.exports = {
  config: {
    name: "imgbb",
    version: "1.0",
    author: "Priyanshi Kaur", // Do not change author name
    countDown: 1,
    role: 0,
    longDescription: "Upload image to ImgBB",
    category: "utility",
    guide: {
      en: "${pn} reply to image"
    }
  },

  onStart: async function ({ message, api, event }) {
    const imgbbApiKey = "YOUR_API_KEY"; // Your ImgBB API key

    const linkanh = event.messageReply?.attachments[0]?.url;

    if (!linkanh) {
      return message.reply('Please reply to an image.');
    }

    try {
      const response = await axios.get(linkanh, { responseType: 'arraybuffer' });
      const formData = new FormData();
      formData.append('image', Buffer.from(response.data, 'binary'), { filename: 'image.png' });

      const res = await axios.post('https://api.imgbb.com/1/upload', formData, { // Correct API endpoint
        headers: formData.getHeaders(),
        params: {
          key: imgbbApiKey
        }
      });

      const imageLink = res.data.data.url;
      return message.reply(imageLink);
    } catch (error) {
      console.error(error);
      return message.reply('Failed to upload image to ImgBB.');
    }
  }
};