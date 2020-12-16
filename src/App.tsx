import { ipcRenderer, remote } from 'electron'
import React, { useEffect, useState } from 'react'
import path from 'path'
import fs from 'fs'
import ytdl from 'ytdl-core'
import { promisify } from 'util'
import { render } from 'react-dom'
import { GlobalStyle } from './styles/GlobalStyle'

const mainElement = document.createElement('div')
mainElement.setAttribute('id', 'root')
document.body.appendChild(mainElement)

const filePath = path.join(remote.app.getPath('documents'), 'MediaDown - Downloads')

interface Video {
  id: string;
  title: string;
  progress: number;
  thumbnail: string;
  filter: string;
}

const App = () => {
  const [url, setUrl] = useState(process.env.NODE_ENV === 'development' ? 'www.youtube.com/watch?v=B_9w6my2Rws' : '')
  const [type, setType] = useState('normal')
  const [videos, setVideos] = useState<Video[]>([])

  useEffect(() => {
    ipcRenderer.on('download-start', (event, data: Video) => {
      if (!videos.find(video => video.id === data.id && video.filter === data.filter)) {
        setVideos([...videos, data])
      }
    })

    ipcRenderer.on('download-progress', (event, data: Video) => {
      setVideos(videos.map(video => {
        if (video.id === data.id && video.filter === data.filter) {
          return { ...video, progress: data.progress }
        }
        return video
      }))
    })

    return () => {
      ipcRenderer.removeAllListeners('download-start')
      ipcRenderer.removeAllListeners('download-progress')
    }
  }, [videos])

  async function handleDownload () {
    try {
      if (!ytdl.validateURL(url)) {
        alert('Invalid Video URL')
        return
      }

      if (!fs.existsSync(filePath)) {
        await promisify(fs.mkdir)(filePath)
      }

      let filter: 'audioandvideo' | 'video' | 'videoonly' | 'audio' | 'audioonly' | ((format: ytdl.videoFormat) => boolean) | undefined
      let fileExtension
      if (type === 'audioonly') {
        filter = 'audioonly'
        fileExtension = '.mp3'
      }

      if (type === 'normal') {
        filter = 'video'
        fileExtension = '.mp4'
      }

      ipcRenderer.send('download', {
        url,
        filter,
        fileExtension
      })
    } catch {}
  }

  async function handleOpenDownloadFolder () {
    const filePath = path.join(remote.app.getPath('documents'), 'MediaDown - Downloads')

    if (!fs.existsSync(filePath)) {
      await promisify(fs.mkdir)(filePath)
    }

    remote.shell.openPath(filePath)
  }

  function handleInputChange (event: React.ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value)
  }

  function handleSelectInputChange (event: React.ChangeEvent<HTMLSelectElement>) {
    setType(event.target.value)
  }

  return (
    <>
      <GlobalStyle />
      <div className="container">
        <header className="header">
          <div className="input-group">
            <input id="url-input" type="text" placeholder="Youtube URL" value={url} onChange={handleInputChange} />
            <select id="options-select" defaultValue="normal" onChange={handleSelectInputChange}>
              <option value="normal">Audio & Video</option>
              <option value="audioonly">Only audio</option>
            </select>
            <div className="buttons">
              <button className="button" id="download-button" type="button" onClick={handleDownload}>
              Download
              </button>
              <button className="button" id="open-folder-button" type="button" onClick={handleOpenDownloadFolder}>
              Open download folder
              </button>
            </div>
          </div>
        </header>
        <div className="items-list">
          {videos.map(video => {
            return (
              <div key={`${video.id}-${video.filter}`} className="item">
                <img className="item-thumbnail" src={video.thumbnail} />
                <div className="item-details">
                  <div className="item-title">{video.title}</div>
                  <progress className="item-progress-bar" value={video.progress}></progress>
                  <div className="status-details">
                    <span className="status">{video.progress === 1 ? 'Downloaded' : 'Downloading'}{' '}</span>
                    <span>{`${Math.round(
                      video.progress * 100
                    )}%`}</span>
                  </div>
                  <span className="item-type">{video.filter === 'video' ? 'Type: Video' : 'Type: Audio'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

render(<App />, mainElement)
