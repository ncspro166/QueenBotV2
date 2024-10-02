const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const SPOTIFY_CLIENT_ID = "41dd52e608ee4c4ba8b196b943db9f73";
const SPOTIFY_CLIENT_SECRET = "5c7b438712b04d0a9fe2eaae6072fa16";

module.exports = {
  config: {
    name: "spotify",
    aliases: ["s"],
    version: "2.0.0",
    author: "Priyanshi Kaur",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Search and download songs from Spotify"
    },
    longDescription: {
      en: "Search for songs by name or link on Spotify and download them."
    },
    category: "music",
    guide: {
      en: "{prefix}spotify <song name> or <spotify link>"
    }
  },

  // Function to get Spotify access token
  getSpotifyToken: async function () {
    const tokenRes = await axios.post("https://accounts.spotify.com/api/token", new URLSearchParams({
      grant_type: "client_credentials"
    }).toString(), {
      headers: {
        "Authorization": `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    return tokenRes.data.access_token;
  },

  // Function to search Spotify for a track
  searchSpotifyTrack: async function (trackName, token) {
    const searchRes = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      params: {
        q: trackName,
        type: "track",
        limit: 1
      }
    });

    if (searchRes.data.tracks.items.length === 0) {
      throw new Error("No track found with the given name.");
    }

    return searchRes.data.tracks.items[0]; // Return the first track
  },

  onStart: async function ({ api, event, args }) {
    try {
      const trackName = args.join(" ").trim();

      if (!trackName) {
        return api.sendMessage(`Please provide a song name.\nFormat: ${this.config.guide.en}`, event.threadID, event.messageID);
      }

      // Get Spotify Access Token
      const spotifyToken = await this.getSpotifyToken();

      // Search for the track on Spotify
      const track = await this.searchSpotifyTrack(trackName, spotifyToken);
      const trackUrl = track.external_urls.spotify;

      // Fetch song details from your provided API
      const res = await axios.get(`https://for-devs.onrender.com/api/spotify/download?url=${encodeURIComponent(trackUrl)}&apikey=r-e377e74a78b7363636jsj8ffb61ce`);
      const songData = res.data;

      if (!songData || !songData.downloadUrl) {
        return api.sendMessage(`Unable to download song for "${trackName}". Please try again.`, event.threadID, event.messageID);
      }

      const songPath = path.join(__dirname, 'cache', `${songData.id}.mp3`);

      // Download song
      const songResponse = await axios.get(songData.downloadUrl, { responseType: 'arraybuffer' });
      await fs.outputFile(songPath, songResponse.data);

      // Send song without cover
      await api.sendMessage({
        attachment: fs.createReadStream(songPath),
        body: `🎵 Title: ${songData.title}\n👤 Artists: ${songData.artists}`
      }, event.threadID, event.messageID);

      // Clean up cached files
      await fs.remove(songPath);
    } catch (error) {
      console.error(error);
      return api.sendMessage(`An error occurred. ${error.message}`, event.threadID, event.messageID);
    }
  }
};





