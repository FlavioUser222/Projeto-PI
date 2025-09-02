import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

let dados = []

app.get('/videos',(req,res)=>{
    res.send(dados)
})
app.post('/video',(req,res)=>{
    const {nome,video,descricao} = req.body
    dados.push({nome,video,descricao})
    res.send('Video salvo com sucesso')
    console.log('video salvo')
})

app.listen(3000,()=>{
    console.log('Servidor rodando')
})

