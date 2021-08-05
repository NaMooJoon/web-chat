var express = require('express');
const { join } = require('path');
var port = process.env.PORT || 3001;
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var db = require('./utils/db');

var onlineUsers = {};                       // 현재 온라인인 유저를 저장하는 곳

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.redirect('/chat');
});

app.get('/chat', function(req, res) {
    res.sendFile(__dirname + '/chat.html');
});

server.listen(port, () => {
    console.log(`server open ${port}`);
});


// Set sockets
io.sockets.on('connection', function(socket) {
    socket.on("send message", function(data) {
        // data -> roomId, msg
        console.log('sending user:',getUserBySocketId(socket.id));
        var query = db.connection.query('INSERT INTO message (roomID,userID,message,time) VALUES(?,?,?,NOW())', 
        [data.roomId, getUserBySocketId(socket.id), data.msg], function(err, rows){
            if(err) throw err;
            io.sockets.in('room' + data.roomId).emit('new message', {
                name: getUserBySocketId(socket.id),
                socketId: socket.id,
                msg: data.msg
            });
        });
    })


    socket.on('join user', function(data, cb) {
        var query = db.connection.query('SELECT * FROM user WHERE id=?', [data.id], function(err, rows){
            if(rows.length) {
                cb({result : false, data : "이미 존재하는 회원입니다."});
                return false;
            } else {
                var query = db.connection.query('INSERT INTO user (id,pw,name) VALUES(?,?,?)', [data.id, data.pw,'test'], function(err, rows){
                    cb({result : true, data : "회원가입에 성공하였습니다."});
                });
            }
        });
    })

    socket.on('login user', function(data, cb) {
        var query = db.connection.query('SELECT * FROM user WHERE id=?', [data.id], function(err, rows){
            if(rows.length) {
                if(rows[0].pw === data.pw){
                    onlineUsers[data.id] = {roomId: 1, socketId: socket.id, userId: data.id};
                    socket.join('room1');
                    cb({result: true, data: '로그인에 성공하였습니다.'});
                    updateUserList(0, 1, data.id);
                } else {
                    cb({result: false, data: '비밀번호가 틀렸습니다.'});
                    return false;
                }
            } else {
                cb({result: false, data: '등록된 회원이 없습니다. 회원가입을 진행해 주세요.'});
                return false;
            }
        });
    });

    socket.on('join room', function(data) {
        let id = getUserBySocketId(socket.id);
        console.log('id: ',id);
        let prevRoomId = onlineUsers[id].roomId;
        let nextRoomId = data.roomId;
        socket.leave('room' + prevRoomId);
        socket.join('room' + nextRoomId);
        onlineUsers[id].roomId = data.roomId;
        var query = db.connection.query('SELECT * FROM message WHERE roomID=?', [data.roomId], function(err, rows){
            socket.emit('message history', rows);
        });
        updateUserList(prevRoomId, nextRoomId, id);
    })

    socket.on('logout', function() {
        if(!socket.id) return;
        let id = getUserBySocketId(socket.id);
        let roomId = onlineUsers[id].roomId;
        delete onlineUsers[getUserBySocketId(socket.id)];
        updateUserList(roomId, 0, id);
    });

    socket.on('disconnect', function(socket) {
        if(!socket.id) return;
        let id = getUserBySocketId(socket.id);
        if(id === undefined || id === null)
            return ;
        let roomId = onlineUsers[id].roomId || 0;
        delete onlineusers[getUserBySocketId(socket.id)];
        updateUserList(roomId, 0, id);
    });


    function updateUserList(prev, next, id) {
        if(prev !== 0) {
            io.sockets.in('room' + prev).emit('userlist', getUsersByRoomId(prev));
            io.sockets.in('room' + prev).emit('lefted room', id);
        }
        if(next !== 0) {
            io.sockets.in('room' + next).emit('userlist', getUsersByRoomId(next));
            io.sockets.in('room' + next).emit('joined room', id);
        }
    }

    function getUsersByRoomId(roomId) {
        let userstemp = [];
        Object.keys(onlineUsers).forEach((el) => {
            if(onlineUsers[el].roomId === roomId) {
                userstemp.push({
                    socketId : onlineUsers[el].socketId,
                    name : el
                });
            }
        });
        return userstemp;
    }
});


function getUserBySocketId(id) {
    return Object.keys(onlineUsers).find(key => onlineUsers[key].socketId === id);
}