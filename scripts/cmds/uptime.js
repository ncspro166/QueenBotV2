const os = require("os");
const fs = require("fs-extra");
const axios = require("axios");
const process = require("process");

const startTime = new Date();

// Helper function to calculate CPU usage accurately
function getCPUUsage() {
  const cpus = os.cpus();
  const usage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b);
    const idle = cpu.times.idle;
    const used = total - idle;
    return acc + (used / total) * 100;
  }, 0);
  
  return (usage / cpus.length).toFixed(1);
}

// Helper function to format bytes into human readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Helper function to get hosting information
async function getHostingInfo() {
  try {
    const publicIP = await axios.get('https://api.ipify.org?format=json');
    const ipInfo = await axios.get(`http://ip-api.com/json/${publicIP.data.ip}`);
    return {
      ip: publicIP.data.ip,
      location: `${ipInfo.data.city}, ${ipInfo.data.country}`,
      isp: ipInfo.data.isp
    };
  } catch (error) {
    return {
      ip: 'Unknown',
      location: 'Unknown',
      isp: 'Unknown'
    };
  }
}

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt", "stats", "info"],
    author: "Priyanshi Kaur(modified)",
    countDown: 0,
    role: 0,
    category: "system",
    longDescription: {
      en: "Get comprehensive System Information with detailed metrics!",
    },
    guide: {
      en: "Use .uptime [option]\nOptions: full, cute, mini, technical, weather [city]",
    },
  },

  onStart: async function ({ api, event, args, threadsData, usersData }) {
    const getUptime = () => {
      const uptimeInSeconds = process.uptime();
      const days = Math.floor(uptimeInSeconds / (3600 * 24));
      const hours = Math.floor((uptimeInSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeInSeconds % 60);
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    const getSystemInfo = async () => {
      const cpuUsage = getCPUUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(1);
      
      const hostInfo = await getHostingInfo();
      
      return {
        cpuUsage,
        memoryUsagePercent,
        totalMemory: formatBytes(totalMemory),
        usedMemory: formatBytes(usedMemory),
        freeMemory: formatBytes(freeMemory),
        hostInfo
      };
    };

    const getUsersThreadsInfo = async () => {
      const allUsers = await usersData.getAll();
      const allThreads = await threadsData.getAll();
      const activeThreads = allThreads.filter(thread => thread.isGroup);
      return {
        userCount: allUsers.length,
        threadCount: allThreads.length,
        groupCount: activeThreads.length
      };
    };

    // Rest of the helper functions remain the same...

    try {
      const startTime = Date.now();
      const checkingMessageID = await sendCheckingMessage();

      const systemStats = await getSystemInfo();
      const { userCount, threadCount, groupCount } = await getUsersThreadsInfo();
      const ping = getPing(startTime);
      const uptimeFormatted = getUptime();

      const currentDate = new Date();
      const date = currentDate.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
      const time = currentDate.toLocaleTimeString("en-US", { 
        timeZone: "Asia/Kolkata", 
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      const pingStatus = ping < 100 ? "🟢 Excellent" : ping < 300 ? "🟡 Good" : "🔴 High Latency";

      let systemInfo = "";

      if (!args[0] || args[0] === "full") {
        systemInfo = `
╭━━━━━━━━━━ SYSTEM INFO ━━━━━━━━━━╮
   🤖 BOT STATISTICS AND METRICS 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📊 SYSTEM METRICS
├─CPU: ${systemStats.cpuUsage}% Usage
├─RAM: ${systemStats.memoryUsagePercent}% (${systemStats.usedMemory}/${systemStats.totalMemory})
├─Node: ${process.version}
└─Platform: ${os.platform()} ${os.arch()}

🌐 HOSTING INFO
├─Server: ${systemStats.hostInfo.location}
├─Provider: ${systemStats.hostInfo.isp}
└─Uptime: ${uptimeFormatted}

📈 PERFORMANCE
├─Ping: ${ping}ms (${pingStatus})
├─Threads: ${threadCount} (${groupCount} groups)
└─Users: ${userCount}

⏰ TIMESTAMPS
├─Date: ${date}
└─Time: ${time}

🔧 SYSTEM DETAILS
├─OS: ${os.type()} ${os.release()}
├─CPU: ${os.cpus()[0].model}
├─Cores: ${os.cpus().length}
└─Load Avg: ${os.loadavg().map(x => x.toFixed(2)).join(', ')}

💾 MEMORY DETAILS
├─Total: ${systemStats.totalMemory}
├─Used: ${systemStats.usedMemory}
└─Free: ${systemStats.freeMemory}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
   Type '.uptime help' for options
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
      }
      // Rest of the display options remain the same...

      api.editMessage(systemInfo, checkingMessageID);
    } catch (error) {
      console.error("Error retrieving system information:", error);
      api.sendMessage("⚠️ System monitoring error! Please try again later.", event.threadID, event.messageID);
    }
  },
};