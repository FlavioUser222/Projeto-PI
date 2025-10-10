import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import 'dotenv/config'

import pkg from 'pg'
const { Pool } = pkg


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


const uploadsDir = 'uploads/'
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

const app = express()
app.use(cors())
app.use('/uploads', express.static('uploads'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


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


app.get('/videos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM videos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/video', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('REQ.BODY:', req.body);
    console.log('REQ.FILES:', req.files);

    const { nome, descricao, legenda, transcricao, categoria_id } = req.body
    const video = req.files['video']?.[0]
    const thumbnail = req.files['thumbnail']?.[0]

    if (!nome || !descricao || !video || !thumbnail) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes!' });
    }

    await pool.query(
      `INSERT INTO videos (nome, descricao, video, thumbnail,legenda,transcricao,categoria_id) VALUES ($1, $2, $3, $4,$5,$6,$7)`,
      [nome, descricao, video.filename, thumbnail.filename, legenda, transcricao, categoria_id]
    );

    res.json({ message: '🎬 Vídeo salvo com sucesso!' });
  } catch (err) {
    console.error(err); // imprime o erro completo
    res.status(500).json({ error: err.message });
  }
})


app.delete('/video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT video, thumbnail FROM videos WHERE id = $1', [id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Vídeo não encontrado' });

    const video = rows[0];
    const videoPath = path.join(uploadsDir, video.video);
    const thumbPath = path.join(uploadsDir, video.thumbnail);

    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

    await pool.query('DELETE FROM videos WHERE id = $1', [id]);

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put(
  '/video/:id',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, descricao } = req.body;
      const video = req.files['video']?.[0];
      const thumbnail = req.files['thumbnail']?.[0];

      const { rows } = await pool.query('SELECT video, thumbnail FROM videos WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Vídeo não encontrado' });

      let novoVideo = rows[0].video
      let novoThumbnail = rows[0].thumbnail

      if (video) {
        const oldPath = path.join(uploadsDir, novoVideo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        novoVideo = video.filename;
      }

      if (thumbnail) {
        const oldThumb = path.join(uploadsDir, novoThumbnail);
        if (fs.existsSync(oldThumb)) fs.unlinkSync(oldThumb);
        novoThumbnail = thumbnail.filename;
      }

      await pool.query(
        `UPDATE videos SET nome = $1, descricao = $2, video = $3, thumbnail = $4 WHERE id = $5`,
        [nome, descricao, novoVideo, novoThumbnail, id]
      );

      res.json({ message: '✅ Vídeo atualizado com sucesso' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.get('/cadastros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cadastros');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    await pool.query('INSERT INTO cadastros (nome,email, senha) VALUES ($1, $2,$3)', [nome, email, senha]);
    res.send('🧍 Cadastro criado com sucesso!');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

app.post('/login', async (req, res) => {
  try {
    const { email, senha, adm } = req.body

    if (!email || !senha) {
      return res.status(400).json({ error: 'Informe usuário e senha!' })
    }

    const result = await pool.query('SELECT * FROM cadastros WHERE email = $1 AND senha = $2 ', [email, senha])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado!' })
    }

    const usuario = result.rows[0]


    if (adm && !usuario.isAdmin) {
      return res.status(403).json({ error: 'Você não tem permissão de administrador!' })
    }

    res.json({
      message: 'Login realizado com sucesso!',
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }


})


app.get('/favoritos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM favoritos');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/favorito', async (req, res) => {
  try {
    const { user_id, video_id } = req.body;
    await pool.query('INSERT INTO favoritos (user_id, video_id) VALUES ($1, $2)', [user_id, video_id]);
    res.send('Favorito adicionado com sucesso!')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
});

app.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/categoria', async (req, res) => {
  try {
    const { nome } = req.body;
    await pool.query('INSERT INTO categorias (nome) VALUES ($1)', [nome]);
    res.send('Categoria criado com sucesso!')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/avaliacoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM avaliacoes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/avaliacao', async (req, res) => {
  try {
    const { video_id, user_id, nota } = req.body
    await pool.query('INSERT INTO avaliacoes (video_id,user_id,nota) VALUES ($1,$2,$3)', [video_id, user_id, nota]);
    res.send('Avaliaçao enviada com sucesso!')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000')
})
