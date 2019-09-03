const { app, BrowserWindow, ipcMain, shell } = require("electron");
const ytdl = require("ytdl-core");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Mediadown",
    width: 400,
    height: 600,
    minWidth: 400,
    minHeight: 600,
    maxWidth: 400,
    maxHeight: 600,
    webPreferences: {
      nodeIntegration: true
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../", "build/icon-x32.png")
  });

  mainWindow.loadFile(path.join(__dirname, "public", "index.html"));

  mainWindow.on("closed", function() {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function() {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function() {
  if (mainWindow === null) createWindow();
});

const filePath = path.join(app.getPath("documents"), "MediaDown - Downloads");

const downloadList = [];

ipcMain.on("downloadFromURL", async function(event, response) {
  if (!ytdl.validateURL(response.url)) {
    mainWindow.webContents.send("invalidURL", {});
    return;
  }

  if (!fs.existsSync(filePath)) {
    await promisify(fs.mkdir)(filePath);
  }

  let filter;
  let fileExtension;
  if (response.option === "audioonly") {
    filter = "audioonly";
    fileExtension = ".mp3";
  }

  if (response.option === "normal") {
    filter = "video";
    fileExtension = ".mp4";
  }

  const info = await promisify(ytdl.getInfo)(response.url);

  downloadList.push({
    url: response.url,
    progress: 0
  });

  const stream = ytdl(response.url, { filter });

  stream.pipe(
    fs.createWriteStream(path.join(filePath, info.title + fileExtension))
  );

  stream.on("progress", function(chunkLength, downloaded, total) {
    const percent = downloaded / total;

    const index = downloadList.findIndex(item => item.url === response.url);
    downloadList[index].progress = (percent * 100).toFixed(2);

    mainWindow.webContents.send("download", {
      id: info.video_id,
      title: info.title,
      thumbnail:
        info.player_response.videoDetails.thumbnail.thumbnails[2].url || "",
      progress: percent,
      filter
    });
  });
});

ipcMain.on("openDownloadFolder", async function(event, response) {
  if (!fs.existsSync(filePath)) {
    await promisify(fs.mkdir)(filePath);
  }

  shell.openItem(filePath);
});
