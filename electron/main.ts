import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage
} from 'electron'
import { autoUpdater } from 'electron-updater'
import ytdl from 'ytdl-core'
import * as path from 'path'
import * as url from 'url'
import fs from 'fs'

let mainWindow: Electron.BrowserWindow | null

function createWindow () {
  const icon = nativeImage.createFromPath(`${app.getAppPath()}/build/icon.png`)

  if (app.dock) {
    app.dock.setIcon(icon)
  }

  mainWindow = new BrowserWindow({
    icon,
    minWidth: 1000,
    minHeight: 600,
    frame: true,
    transparent: false,
    webPreferences: {
      nodeIntegration: true
    },
    autoHideMenuBar: process.env.NODE_ENV !== 'development'
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4000')
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, 'renderer/index.html'),
        protocol: 'file:',
        slashes: true
      })
    )
  }

  const filePath = path.join(app.getPath('documents'), 'MediaDown - Downloads')

  const downloadList: {url: string, progress: number}[] = []

  ipcMain.addListener('download', async (event, data) => {
    try {
      const info = await ytdl.getInfo(data.url)

      downloadList.push({
        url: data.url,
        progress: 0
      })

      const stream = ytdl(data.url, { filter: data.filter })

      stream.pipe(
        fs.createWriteStream(
          // eslint-disable-next-line no-useless-escape
          path.join(filePath, info.videoDetails.title.trim().replace(/[\\/:*?\"<>|]/g, '') + data.fileExtension)
        )
      )

      const videoStatus = {
        id: ytdl.getVideoID(data.url),
        title: info.videoDetails.title,
        thumbnail:
          info.player_response.videoDetails.thumbnail.thumbnails[2].url || '',
        progress: 0,
        filter: data.filter
      }
      event.sender.send('download-start', videoStatus)

      stream.on('progress', function (chunkLength, downloaded, total) {
        const percent = downloaded / total

        const index = downloadList.findIndex((item) => item.url === data.url)
        downloadList[index].progress = Number((percent * 100).toFixed(2))

        const videoProgress = {
          id: ytdl.getVideoID(data.url),
          progress: percent,
          filter: data.filter
        }
        event.sender.send('download-progress', videoProgress)
      })
    } catch (err) {
      console.log(err)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  createWindow()
  autoUpdater.checkForUpdatesAndNotify()
})

app.allowRendererProcessReuse = true
