const http = require('http')
const fs = require('fs')
const path = require('path')

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.ttf': 'font/ttf',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
}

const PORT = 3000
const VIEW = path.join(__dirname, 'view')

http
  .createServer((req, res) => {
    const url = req.url === '/' ? '/word.html' : req.url
    const file = path.join(VIEW, url)

    if (!file.startsWith(VIEW)) {
      res.writeHead(403)
      res.end()
      return
    }

    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const ext = path.extname(file)
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
      })
      res.end(data)
    })
  })
  .listen(PORT, () => {
    console.log(`http://localhost:${PORT}`)
  })
