const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SPOTIFY_CLIENT_ID = "41dd52e608ee4c4ba8b196b943db9f73";
const SPOTIFY_CLIENT_SECRET = "5c7b438712b04d0a9fe2eaae6072fa16";

// Utility function to execute spotdl command
async function downloadWithSpotDL(trackUrl, outputPath) {
  try {
    // Create Python script content
    const pythonScript = `
import sys
from spotdl import Spotdl

spotdl = Spotdl(
    client_id="${SPOTIFY_CLIENT_ID}",
    client_secret="${SPOTIFY_CLIENT_SECRET}",
    output=r"${outputPath}",
    format="mp3"
)

songs = spotdl.download_url("${trackUrl}")
print(songs[0]['path'])  # Print the path of downloaded file
`;

    // Save Python script temporarily
    const scriptPath = path.join(__dirname, 'temp_download_script.py');
    await fs.writeFile(scriptPath, pythonScript);

    // Execute Python script
    const { stdout } = await execPromise(`python3 "${scriptPath}"`);
    
    // Clean up temporary script
    await fs.remove(scriptPath);
    
    // Return the path to downloaded file
    return stdout.trim();
  } catch (error) {
    console.error('Download error:', error);
    throw new Error('Failed to download track using spotdl');
  }
}

module.exports = {
  config: {
    name: "spotify",
    aliases: ["s"],
    version: "2.2.0",
    author: "Priyanshi Kaur",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Search and download songs or find artists on Spotify"
    },
    longDescription: {
      en: "Search for songs by name or link on Spotify and download them using spotdl, or search for artists and get their information."
    },
    category: "music",
    guide: {
      en: "{prefix}spotify <song name> or <spotify link>\n{prefix}spotify artist <artist name>"
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

    return searchRes.data.tracks.items[0];
  },

  // Function to search Spotify for an artist (unchanged)
  searchSpotifyArtist: async function (artistName, token) {
    const searchRes = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      params: {
        q: artistName,
        type: "artist",
        limit: 1
      }
    });

    if (searchRes.data.artists.items.length === 0) {
      throw new Error("No artist found with the given name.");
    }

    return searchRes.data.artists.items[0];
  },

  // Function to get artist's top tracks (unchanged)
  getArtistTopTracks: async function (artistId, token) {
    const topTracksRes = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      params: {
        market: "US"
      }
    });

    return topTracksRes.data.tracks.slice(0, 5);
  },

  onStart: async function ({ api, event, args }) {
    try {
      // Create cache directory if it doesn't exist
      const cacheDir = path.join(__dirname, 'cache');
      await fs.ensureDir(cacheDir);

      if (args[0] === "artist") {
        // Artist search functionality (unchanged)
        const artistName = args.slice(1).join(" ").trim();
        if (!artistName) {
          return api.sendMessage("Please provide an artist name.", event.threadID, event.messageID);
        }

        const spotifyToken = await this.getSpotifyToken();
        const artist = await this.searchSpotifyArtist(artistName, spotifyToken);
        const topTracks = await this.getArtistTopTracks(artist.id, spotifyToken);

        const artistInfo = `
🎤 Artist: ${artist.name}
👥 Followers: ${artist.followers.total.toLocaleString()}
🎵 Genres: ${artist.genres.join(", ") || "N/A"}
🔥 Popularity: ${artist.popularity}%
🔗 Spotify URL: ${artist.external_urls.spotify}

Top Tracks:
${topTracks.map((track, index) => `${index + 1}. ${track.name}`).join("\n")}
        `.trim();

        if (artist.images && artist.images.length > 0) {
          const imageResponse = await axios.get(artist.images[0].url, { responseType: 'arraybuffer' });
          const imagePath = path.join(cacheDir, `${artist.id}.jpg`);
          await fs.outputFile(imagePath, imageResponse.data);

          await api.sendMessage(
            {
              attachment: fs.createReadStream(imagePath),
              body: artistInfo
            },
            event.threadID,
            event.messageID
          );

          await fs.remove(imagePath);
        } else {
          await api.sendMessage(artistInfo, event.threadID, event.messageID);
        }
      } else {
        // Song search and download using spotdl
        const trackName = args.join(" ").trim();

        if (!trackName) {
          return api.sendMessage(
            `Please provide a song name or use "artist" to search for an artist.\nFormat: ${this.config.guide.en}`,
            event.threadID,
            event.messageID
          );
        }

        // Send processing message
        await api.sendMessage("🎵 Processing your request...", event.threadID, event.messageID);

        const spotifyToken = await this.getSpotifyToken();
        const track = await this.searchSpotifyTrack(trackName, spotifyToken);
        
        // Download using spotdl
        const downloadPath = await downloadWithSpotDL(
          track.external_urls.spotify,
          cacheDir
        );

        if (!downloadPath) {
          throw new Error("Failed to download the track");
        }

        // Send the downloaded song
        await api.sendMessage(
          {
            attachment: fs.createReadStream(downloadPath),
            body: `🎵 Title: ${track.name}\n👤 Artists: ${track.artists.map(a => a.name).join(", ")}`
          },
          event.threadID,
          event.messageID
        );

        // Clean up downloaded file
        await fs.remove(downloadPath);
      }
    } catch (error) {
      console.error(error);
      return api.sendMessage(
        `An error occurred: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  }
};