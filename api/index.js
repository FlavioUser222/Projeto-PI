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
        senha varchar(100) NOT NULL,
    )`)

})


// Verifica se a pasta 'uploads' existe, caso contrário cria
const uploadsDir = 'uploads/'
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

const app = express()
app.use(cors())

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

let dados = []
let cadastros = []

app.use(express.json()) // para outras rotas que recebem JSON puro

// Rota para listar os vídeos
app.get('/videos', (req, res) => {
  res.json(dados)
})

app.post('/video', upload.single('video'), (req, res) => {
  const { nome, descricao } = req.body
  const video = req.file // objeto com dados do arquivo

  if (!video) {
    return res.status(400).send('Arquivo de vídeo não enviado')
  }

  dados.push({
    nome,
    descricao,
    videoPath: video.path // caminho do arquivo salvo no servidor
  })

  console.log('Video salvo:', nome)
  res.send('Video salvo com sucesso')
})



app.get('/cadastros', (req, res) => {
  res.json(cadastros)
})

app.post('/cadastro', (req, res) => {
  const { user, senha } = req.body

  dados.push({
    user, senha
  })

  console.log('Dados salvos:', user)
  res.send('Dados salvos com sucesso')

})


app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000')
})
