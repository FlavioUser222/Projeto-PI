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
        descricao TEXT NOT NULL,
        thumbnail TEXT NOT NULL
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

app.post('/video', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
  const { nome, descricao } = req.body
  const video = req.files['video'] ? req.files['video'][0] : null
  const thumbnail = req.files['thumbnail'] ? req.files['thumbnail'][0] : null

  if (!video || !thumbnail) {
    return res.status(400).send('Arquivo de vídeo não enviado')
  }

  db.run(`INSERT INTO videos(nome,descricao,video,thumbnail) VALUES (?,?,?,?)`, [nome, descricao, video.filename, thumbnail.filename])

  res.send('Video salvo com sucesso')
})


app.delete('/video/:id', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT video, thumbnail FROM videos WHERE id = ?`, [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    // Deleta os arquivos do sistema de arquivos
    const videoPath = path.join(uploadsDir, row.video);
    const thumbPath = path.join(uploadsDir, row.thumbnail);

    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

    // Agora remove do banco
    db.run(`DELETE FROM videos WHERE id = ?`, [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao deletar vídeo do banco' });
      }

      return res.status(204).send(); // Sucesso, sem conteúdo
    });
  });
});



app.put('/video/:id', upload.fields([
  { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  const thumbnail = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;

  // Primeiro, busca o vídeo atual para obter o nome da thumbnail antiga
  db.get(`SELECT thumbnail FROM videos WHERE id = ?`, [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    let novoThumbnail = row.thumbnail; // por padrão, mantém a thumbnail antiga

    if (thumbnail) {
      // Deleta a thumbnail antiga
      const thumbPath = path.join(uploadsDir, row.thumbnail);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

      // Atualiza o nome da nova thumbnail
      novoThumbnail = thumbnail.filename;
    }

    // Atualiza os dados no banco
    db.run(`UPDATE videos SET nome = ?, descricao = ?, thumbnail = ? WHERE id = ?`, [nome, descricao, novoThumbnail, id], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar vídeo' });
      }

      res.json({ message: 'Vídeo atualizado com sucesso' });
    });
  });
});



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
