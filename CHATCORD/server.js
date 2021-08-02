const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const session = require('express-session');
const formatMessage = require('./utils/messages');
const db = require('./utils/db');
const { 
    userJoin, 
    getCurrentUser, 
    userLeave, 
    getRoomUsers 
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set express-session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'Chat Bot';

// Run when client connects
io.on('connection', socket=> {
    console.log('새로운 소켓 : ', socket.id);
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome current user
        socket.emit('message', formatMessage(botName , `Welcome ${user.username}!`));

        // Broadcast when a user connects
        socket.broadcast
        .to(user.room)
        .emit('message', formatMessage(botName , `${user.username} has joined the chat`));

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    // Listen for chatMessage
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        io.to(user.room).emit('message', formatMessage(botName , `${user.username} has left the chat`));

        // Send users and room info
        io.to(user.room).emit('roomusers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    }); 
    
})

const PORT = 3001 || process.env.PORT;



server.listen(PORT, () => console.log(`Server running on port ${PORT}`));