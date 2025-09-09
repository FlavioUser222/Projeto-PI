import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sqlite3 from 'sqlite3'

const db = new sqlite3.Database('db.sqlite3')

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS videos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome varchar(100) NOT NULL,
        video TEXT NOT NULL,
        descricao TEXT NOT NULL
    )`)
  db.run(`CREATE TABLE IF NOT EXISTS cadastros(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome varchar(100) NOT NULL,
        senha varchar(100) NOT NULL
    )`)
})


// Verifica se a pasta 'uploads' existe, caso contrário cria
const uploadsDir = 'uploads/'
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

const app = express()
app.use(cors())
app.use('/uploads', express.static('uploads'))


// Configuração do multer para salvar arquivos na pasta 'uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)  // Usa a pasta uploads
  },
  filename: (req, file, cb) => {
    // Renomeia o arquivo para evitar conflito
    const ext = path.extname(file.originalname)
    const nomeArquivo = `${Date.now()}${ext}`
    cb(null, nomeArquivo)
  }
})

const upload = multer({ storage })


app.use(express.json())


app.get('/videos', (req, res) => {
  db.all(`SELECT * FROM videos`, [], (err, rows) => {
    res.json(rows)
  })

})

app.post('/video', upload.single('video'), (req, res) => {
  const { nome, descricao } = req.body
  const video = req.file // objeto com dados do arquivo

  if (!video) {
    return res.status(400).send('Arquivo de vídeo não enviado')
  }

  db.run(`INSERT INTO videos(nome,descricao,video) VALUES (?,?,?)`, [nome, descricao, video.path])

  res.send('Video salvo com sucesso')
})



app.get('/cadastros', (req, res) => {
  db.all(`SELECT * FROM cadastros`, [], (err, rows) => {
    res.json(rows)
  })

})

app.post('/cadastro', (req, res) => {
  const { user, senha } = req.body

  db.run(`INSERT INTO cadastros(nome,senha) VALUES (?,?)`, [user, senha])

  res.send('Dados salvos com sucesso')
  console.log('Dados salvos:', user)

})


app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000')
})
