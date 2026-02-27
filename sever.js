const express = require('express')
const mysql = require('mysql2')
const app = express()
app.use(express.json())
app.use(express.static('.'))
// 这里改成你宝塔里的数据库信息
const db = mysql.createConnection({
    host: 'localhost',
    user: '你的数据库用户名',
    password: '你的数据库密码',
    database: '你的数据库名'
})
// 创建会员表（第一次运行会自动建表）
db.query(`
   CREATE TABLE IF NOT EXISTS member (
     id INT PRIMARY KEY AUTO_INCREMENT,
     name VARCHAR(50),
     phone VARCHAR(20)
   )
 `)
// 查看会员列表
app.get('/list', (req, res) => {
    db.query('SELECT * FROM member', (err, data) => {
        res.json(data)
    })
})
// 添加会员
app.post('/add', (req, res) => {
    let { name, phone } = req.body
    db.query('INSERT INTO member SET ?', { name, phone }, () => {
        res.send('ok')
    })
})
app.listen(80, () => {
    console.log('服务已启动')
})