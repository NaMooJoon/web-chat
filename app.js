const fs = require('fs')

const express = require('express')
const socket = require('socket.io')
const http = require('http')
const app = express()
const server = http.createServer(app)
const io = socket(server)

app.use('/css', express.static('./static/css'))
app.use('/js', express.static('./static/js'))

app.get('/', function(req, res){
    fs.readFile('./static/index.html', function(err, data){
        if(err) { throw err; }
        else {
            res.writeHead(200, {'Content-Type':'text/html'})
            res.write(data)
            res.end()
        }
    })
})

io.sockets.on('connection', function(socket){
    console.log('유저 접속 됨');

    socket.on('newUser', function(name){
        console.log(name + ' 님이 접속하였습니다.');
        socket.name = name;
        io.sockets.emit('update', {type: 'connect', name: 'SERVER', message: name + '님이 접속하였습니다.'})
    })

    socket.on('message', function(data){
        data.name = socket.name;
        console.log(data);
        socket.broadcast.emit('update', data);
    })

    socket.on('disconnect', function(){
        console.log(socket.name + '님이 나가셨습니다.')
        socket.broadcast.emit('update',{type: 'disconnect', name: 'SERVER', message: socket.name + "님이 나가셨습니다."});
    })
})

server.listen(3001, function(){
    console.log('Server started on 3001...');
})